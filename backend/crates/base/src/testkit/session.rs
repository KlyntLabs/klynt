//! Canonical in-memory fake for [`SessionStore`].

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use async_trait::async_trait;
use chrono::{DateTime, Utc};

use crate::ctx::ExecutionContext;
use crate::ports::session::{
    MembershipSnapshot, Session, SessionError, SessionKind, SessionStore, SessionToken,
};
use domain::{TenantId, UserId};
use uuid::Uuid;

#[derive(Clone, Debug)]
struct StoredSession {
    session: Session,
    public_id: Uuid,
}

/// In-memory session store for tests.
#[derive(Clone, Debug, Default)]
pub struct FakeSessionStore {
    sessions: Arc<Mutex<HashMap<SessionToken, StoredSession>>>,
}

impl FakeSessionStore {
    /// Create an empty fake session store.
    pub fn new() -> Self {
        Self::default()
    }

    fn mutate_memberships<F>(&self, user_id: UserId, mut f: F)
    where
        F: FnMut(&mut Vec<MembershipSnapshot>),
    {
        let mut sessions = self.sessions.lock().unwrap();
        for stored in sessions.values_mut() {
            if stored.session.user_id == user_id {
                f(&mut stored.session.tenant_memberships);
            }
        }
    }
}

#[async_trait]
impl SessionStore for FakeSessionStore {
    async fn create_with_kind(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
        expires_at: DateTime<Utc>,
        kind: SessionKind,
        pair_id: Option<Uuid>,
    ) -> Result<SessionToken, SessionError> {
        let token = SessionToken::new();
        let public_id = Uuid::new_v4();
        let session = Session {
            user_id,
            expires_at,
            kind,
            pair_id,
            tenant_memberships: Vec::new(),
        };
        self.sessions
            .lock()
            .unwrap()
            .insert(token, StoredSession { session, public_id });
        Ok(token)
    }

    async fn find_valid(
        &self,
        _ctx: &ExecutionContext,
        token: &SessionToken,
    ) -> Result<Option<Session>, SessionError> {
        Ok(self
            .sessions
            .lock()
            .unwrap()
            .get(token)
            .map(|stored| &stored.session)
            .filter(|s| !s.is_expired())
            .cloned())
    }

    async fn revoke(
        &self,
        _ctx: &ExecutionContext,
        token: &SessionToken,
    ) -> Result<(), SessionError> {
        self.sessions.lock().unwrap().remove(token);
        Ok(())
    }

    async fn revoke_pair(
        &self,
        _ctx: &ExecutionContext,
        pair_id: Uuid,
        except_token: &SessionToken,
    ) -> Result<(), SessionError> {
        let mut sessions = self.sessions.lock().unwrap();
        sessions.retain(|token, stored| {
            !(stored.session.pair_id == Some(pair_id) && token != except_token)
        });
        Ok(())
    }

    async fn list_active_by_user(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
    ) -> Result<Vec<domain::session::SessionSummary>, SessionError> {
        use domain::session::SessionSummary;
        let sessions = self.sessions.lock().unwrap();
        Ok(sessions
            .values()
            .filter(|stored| stored.session.user_id == user_id && !stored.session.is_expired())
            .map(|stored| SessionSummary {
                id: stored.public_id,
                user_id: stored.session.user_id,
                kind: stored.session.kind.as_str().to_string(),
                created_at: Utc::now(),
                expires_at: stored.session.expires_at,
            })
            .collect())
    }

    async fn revoke_by_id(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
        session_id: Uuid,
    ) -> Result<(), SessionError> {
        let mut sessions = self.sessions.lock().unwrap();
        let token = sessions
            .iter()
            .find(|(_, stored)| {
                stored.public_id == session_id
                    && stored.session.user_id == user_id
                    && !stored.session.is_expired()
            })
            .map(|(token, _)| *token)
            .ok_or(SessionError::Forbidden)?;
        sessions.remove(&token);
        Ok(())
    }

    /// Add a tenant membership to all active sessions for the user.
    ///
    /// This implementation is idempotent: if a membership for the tenant already
    /// exists, its role is updated in place and no duplicate entry is created.
    async fn add_membership(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
        membership: MembershipSnapshot,
    ) -> Result<(), SessionError> {
        self.mutate_memberships(user_id, |memberships| {
            if let Some(existing) = memberships
                .iter_mut()
                .find(|m| m.tenant_id == membership.tenant_id)
            {
                existing.role = membership.role;
            } else {
                memberships.push(membership.clone());
            }
        });
        Ok(())
    }

    async fn update_membership_for_user(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
        membership: MembershipSnapshot,
    ) -> Result<(), SessionError> {
        self.mutate_memberships(user_id, |memberships| {
            if let Some(existing) = memberships
                .iter_mut()
                .find(|m| m.tenant_id == membership.tenant_id)
            {
                existing.role = membership.role;
            }
        });
        Ok(())
    }

    async fn remove_membership(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
        tenant_id: TenantId,
    ) -> Result<(), SessionError> {
        let tenant_id = tenant_id.inner();
        self.mutate_memberships(user_id, |memberships| {
            memberships.retain(|m| m.tenant_id != tenant_id);
        });
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ctx::{ExecutionContext, RequestContext};

    fn ctx() -> ExecutionContext {
        ExecutionContext::new(RequestContext::new())
    }

    #[tokio::test]
    async fn create_and_find_round_trip() {
        let store = FakeSessionStore::new();
        let user_id = UserId::new();
        let expires_at = Utc::now() + chrono::Duration::hours(1);

        let token = store
            .create_with_kind(&ctx(), user_id, expires_at, SessionKind::Access, None)
            .await
            .unwrap();
        let session = store.find_valid(&ctx(), &token).await.unwrap().unwrap();

        assert_eq!(session.user_id, user_id);
        assert_eq!(session.kind, SessionKind::Access);
        assert!(!session.is_expired());
    }

    #[tokio::test]
    async fn revoke_removes_session() {
        let store = FakeSessionStore::new();
        let user_id = UserId::new();
        let expires_at = Utc::now() + chrono::Duration::hours(1);

        let token = store
            .create_with_kind(&ctx(), user_id, expires_at, SessionKind::Access, None)
            .await
            .unwrap();
        store.revoke(&ctx(), &token).await.unwrap();

        assert!(store.find_valid(&ctx(), &token).await.unwrap().is_none());
    }

    #[tokio::test]
    async fn expired_session_is_not_found() {
        let store = FakeSessionStore::new();
        let user_id = UserId::new();
        let expires_at = Utc::now() - chrono::Duration::hours(1);

        let token = store
            .create_with_kind(&ctx(), user_id, expires_at, SessionKind::Access, None)
            .await
            .unwrap();

        assert!(store.find_valid(&ctx(), &token).await.unwrap().is_none());
    }

    #[tokio::test]
    async fn add_membership_is_idempotent_for_same_tenant() {
        use domain::membership::TenantRole;
        use uuid::Uuid;

        let store = FakeSessionStore::new();
        let user_id = UserId::new();
        let expires_at = Utc::now() + chrono::Duration::hours(1);
        let tenant_id = Uuid::new_v4();

        let token = store
            .create_with_kind(&ctx(), user_id, expires_at, SessionKind::Access, None)
            .await
            .unwrap();

        store
            .add_membership(
                &ctx(),
                user_id,
                MembershipSnapshot {
                    tenant_id,
                    role: TenantRole::Member,
                },
            )
            .await
            .unwrap();
        store
            .add_membership(
                &ctx(),
                user_id,
                MembershipSnapshot {
                    tenant_id,
                    role: TenantRole::Admin,
                },
            )
            .await
            .unwrap();

        let session = store.find_valid(&ctx(), &token).await.unwrap().unwrap();
        assert_eq!(session.tenant_memberships.len(), 1);
        assert_eq!(session.tenant_memberships[0].tenant_id, tenant_id);
        assert_eq!(session.tenant_memberships[0].role, TenantRole::Admin);
    }
}
