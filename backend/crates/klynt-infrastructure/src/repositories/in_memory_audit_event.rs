use std::cmp::Reverse;
use tokio::sync::Mutex;

use async_trait::async_trait;
use uuid::Uuid;

use klynt_domain::audit::AuditEvent;
use klynt_domain::ctx::Ctx;
use klynt_domain::errors::DomainError;
use klynt_domain::models::UserId;
use klynt_domain::repositories::AuditEventRepository;

/// In-memory implementation of [`AuditEventRepository`].
///
/// Stores audit events in a thread-safe vector. Intended for development and
/// integration tests; production should use a persistent store.
#[derive(Debug, Default)]
pub struct InMemoryAuditEventRepository {
    events: Mutex<Vec<AuditEvent>>,
}

impl InMemoryAuditEventRepository {
    pub fn new() -> Self {
        Self::default()
    }
}

#[async_trait]
impl AuditEventRepository for InMemoryAuditEventRepository {
    async fn log(&self, _ctx: &Ctx, event: AuditEvent) -> Result<(), DomainError> {
        let mut events = self.events.lock().await;
        events.push(event);
        Ok(())
    }

    async fn find_by_user(
        &self,
        _ctx: &Ctx,
        user_id: UserId,
        limit: usize,
    ) -> Result<Vec<AuditEvent>, DomainError> {
        let events = self.events.lock().await;
        let mut found: Vec<AuditEvent> = events
            .iter()
            .filter(|e| e.actor_user_id == Some(user_id))
            .rev()
            .take(limit)
            .cloned()
            .collect();
        found.sort_by_key(|event| Reverse(event.created_at));
        Ok(found)
    }

    async fn find_by_resource(
        &self,
        _ctx: &Ctx,
        resource_type: &str,
        resource_id: Uuid,
        limit: usize,
    ) -> Result<Vec<AuditEvent>, DomainError> {
        let events = self.events.lock().await;
        let mut found: Vec<AuditEvent> = events
            .iter()
            .filter(|e| {
                e.resource_type.to_string() == resource_type && e.resource_id == Some(resource_id)
            })
            .rev()
            .take(limit)
            .cloned()
            .collect();
        found.sort_by_key(|event| Reverse(event.created_at));
        Ok(found)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use klynt_domain::audit::{AuditAction, ResourceType};

    #[tokio::test]
    async fn logs_and_retrieves_by_user() {
        let repo = InMemoryAuditEventRepository::new();
        let ctx = Ctx::guest(Uuid::new_v4());
        let user_id = UserId::new();

        let event = AuditEvent::new(AuditAction::UserRegistered, ResourceType::User)
            .with_actor(user_id)
            .with_resource(user_id.0)
            .with_request_id(ctx.request_id);

        repo.log(&ctx, event).await.unwrap();

        let events = repo.find_by_user(&ctx, user_id, 10).await.unwrap();
        assert_eq!(events.len(), 1);
        assert_eq!(events[0].action, AuditAction::UserRegistered);
    }

    #[tokio::test]
    async fn find_by_resource_filters_by_type_and_id() {
        let repo = InMemoryAuditEventRepository::new();
        let ctx = Ctx::guest(Uuid::new_v4());
        let user_id = UserId::new();
        let session_id = Uuid::new_v4();

        let event = AuditEvent::new(AuditAction::SessionCreated, ResourceType::Session)
            .with_actor(user_id)
            .with_resource(session_id)
            .with_request_id(ctx.request_id);

        repo.log(&ctx, event).await.unwrap();

        let events = repo
            .find_by_resource(&ctx, "session", session_id, 10)
            .await
            .unwrap();
        assert_eq!(events.len(), 1);

        let other = repo
            .find_by_resource(&ctx, "user", session_id, 10)
            .await
            .unwrap();
        assert!(other.is_empty());
    }
}
