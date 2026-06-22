//! Canonical in-memory fake for [`UserRepository`].
//!
//! Supports both auth flows (keyed by email) and user-management flows (keyed
//! by ID, including soft-delete inspection). It is deterministic and safe to
//! share across tasks via [`Arc`].

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use async_trait::async_trait;
use chrono::Utc;

use crate::ctx::ExecutionContext;
use crate::ports::repository::{RepositoryError, UserRepository};
use domain::{Email, PaginationRequest, User, UserId, UserRole, UserStatus};
use uuid::Uuid;

/// In-memory user repository for tests.
#[derive(Clone, Debug, Default)]
pub struct FakeUserRepository {
    inner: Arc<Mutex<Inner>>,
}

#[derive(Debug, Default)]
struct Inner {
    users: HashMap<UserId, User>,
    email_index: HashMap<String, UserId>,
}

impl FakeUserRepository {
    /// Create an empty fake repository.
    pub fn new() -> Self {
        Self::default()
    }

    /// Insert or overwrite a user, keeping the email index consistent.
    pub fn insert(&self, user: User) {
        let mut inner = self.inner.lock().unwrap();
        inner
            .email_index
            .insert(user.email.as_str().to_string(), user.id);
        inner.users.insert(user.id, user);
    }
}

#[async_trait]
impl UserRepository for FakeUserRepository {
    async fn find_by_email(
        &self,
        _ctx: &ExecutionContext,
        email: &Email,
    ) -> Result<Option<User>, RepositoryError> {
        let inner = self.inner.lock().unwrap();
        Ok(inner
            .email_index
            .get(email.as_str())
            .and_then(|id| inner.users.get(id))
            .filter(|u| !u.is_deleted())
            .cloned())
    }

    async fn find_by_id(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
    ) -> Result<Option<User>, RepositoryError> {
        Ok(self.inner.lock().unwrap().users.get(&user_id).cloned())
    }

    async fn create_pending_user(
        &self,
        _ctx: &ExecutionContext,
        full_name: String,
        email: Email,
        password_hash: String,
        role: UserRole,
        institution_id: Option<Uuid>,
    ) -> Result<UserId, RepositoryError> {
        let mut inner = self.inner.lock().unwrap();
        if inner.email_index.contains_key(email.as_str()) {
            return Err(RepositoryError::Conflict(format!(
                "email already registered: {email}"
            )));
        }

        let now = Utc::now();
        let user_id = UserId::new();
        let user = User {
            id: user_id,
            email: Email::new(email.as_str().to_string()),
            password_hash,
            full_name: Some(full_name).filter(|n| !n.is_empty()),
            status: UserStatus::Pending,
            role,
            global_role: None,
            email_verified_at: None,
            institution_id,
            terms_accepted_at: now,
            terms_version: "1.0".to_string(),
            created_at: now,
            updated_at: now,
            deleted_at: None,
        };

        inner
            .email_index
            .insert(email.as_str().to_string(), user_id);
        inner.users.insert(user_id, user);
        Ok(user_id)
    }

    async fn activate_user(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
    ) -> Result<(), RepositoryError> {
        let mut inner = self.inner.lock().unwrap();
        match inner.users.get_mut(&user_id) {
            Some(user) if !user.is_deleted() => {
                user.status = UserStatus::Active;
                Ok(())
            }
            _ => Err(RepositoryError::NotFound),
        }
    }

    async fn update_password(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
        password_hash: String,
    ) -> Result<(), RepositoryError> {
        let mut inner = self.inner.lock().unwrap();
        match inner.users.get_mut(&user_id) {
            Some(user) if !user.is_deleted() => {
                user.password_hash = password_hash;
                Ok(())
            }
            _ => Err(RepositoryError::NotFound),
        }
    }

    async fn update(&self, _ctx: &ExecutionContext, user: User) -> Result<User, RepositoryError> {
        let mut inner = self.inner.lock().unwrap();
        let existing = inner
            .users
            .get(&user.id)
            .ok_or(RepositoryError::NotFound)?
            .clone();

        if existing.email != user.email {
            inner.email_index.remove(existing.email.as_str());
            inner
                .email_index
                .insert(user.email.as_str().to_string(), user.id);
        }

        inner.users.insert(user.id, user.clone());
        Ok(user)
    }

    async fn delete(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
    ) -> Result<(), RepositoryError> {
        let mut inner = self.inner.lock().unwrap();
        match inner.users.get_mut(&user_id) {
            Some(user) if !user.is_deleted() => {
                user.deleted_at = Some(Utc::now());
                Ok(())
            }
            _ => Err(RepositoryError::NotFound),
        }
    }

    async fn list(
        &self,
        _ctx: &ExecutionContext,
        pagination: PaginationRequest,
    ) -> Result<(Vec<User>, u64), RepositoryError> {
        let inner = self.inner.lock().unwrap();
        let users: Vec<User> = inner
            .users
            .values()
            .filter(|u| !u.is_deleted())
            .cloned()
            .collect();

        let total = users.len() as u64;
        let offset = pagination.offset() as usize;
        let limit = pagination.page_size as usize;
        let items = users.into_iter().skip(offset).take(limit).collect();

        Ok((items, total))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::testkit::{sample_active_user, sample_user, test_ctx};

    #[tokio::test]
    async fn insert_and_find_by_id() {
        let repo = FakeUserRepository::new();
        let ctx = test_ctx();
        let user = sample_active_user("ada@example.com", "Ada");
        let id = user.id;
        repo.insert(user.clone());

        let found = repo.find_by_id(&ctx, id).await.unwrap().unwrap();
        assert_eq!(found.email.as_str(), "ada@example.com");
    }

    #[tokio::test]
    async fn find_by_email_ignores_deleted_users() {
        let repo = FakeUserRepository::new();
        let ctx = test_ctx();
        let mut user = sample_active_user("deleted@example.com", "Deleted");
        user.deleted_at = Some(Utc::now());
        repo.insert(user);

        assert!(repo
            .find_by_email(&ctx, &Email::new("deleted@example.com".to_string()))
            .await
            .unwrap()
            .is_none());
    }

    #[tokio::test]
    async fn find_by_id_returns_deleted_user() {
        let repo = FakeUserRepository::new();
        let ctx = test_ctx();
        let mut user = sample_active_user("deleted@example.com", "Deleted");
        user.deleted_at = Some(Utc::now());
        let id = user.id;
        repo.insert(user);

        assert!(repo
            .find_by_id(&ctx, id)
            .await
            .unwrap()
            .unwrap()
            .is_deleted());
    }

    #[tokio::test]
    async fn create_pending_user_conflicts_on_duplicate_email() {
        let repo = FakeUserRepository::new();
        let ctx = test_ctx();
        repo.create_pending_user(
            &ctx,
            "Ada".to_string(),
            Email::new("ada@example.com".to_string()),
            "hash".to_string(),
            UserRole::Student,
            None,
        )
        .await
        .unwrap();

        let second = repo
            .create_pending_user(
                &ctx,
                "Ada".to_string(),
                Email::new("ada@example.com".to_string()),
                "hash".to_string(),
                UserRole::Student,
                None,
            )
            .await;

        assert!(matches!(second, Err(RepositoryError::Conflict(_))));
    }

    #[tokio::test]
    async fn activate_user_makes_user_active() {
        let repo = FakeUserRepository::new();
        let ctx = test_ctx();
        let user = sample_user("ada@example.com", "Ada", "hash", UserStatus::Pending);
        let id = user.id;
        repo.insert(user);

        repo.activate_user(&ctx, id).await.unwrap();
        let found = repo.find_by_id(&ctx, id).await.unwrap().unwrap();
        assert!(found.is_active());
    }

    #[tokio::test]
    async fn update_maintains_email_index() {
        let repo = FakeUserRepository::new();
        let ctx = test_ctx();
        let user = sample_active_user("old@example.com", "Old");
        let id = user.id;
        repo.insert(user);

        let mut updated = repo.find_by_id(&ctx, id).await.unwrap().unwrap();
        updated.email = Email::new("new@example.com".to_string());
        repo.update(&ctx, updated).await.unwrap();

        assert!(repo
            .find_by_email(&ctx, &Email::new("old@example.com".to_string()))
            .await
            .unwrap()
            .is_none());
        assert_eq!(
            repo.find_by_email(&ctx, &Email::new("new@example.com".to_string()))
                .await
                .unwrap()
                .unwrap()
                .id,
            id
        );
    }

    #[tokio::test]
    async fn delete_soft_deletes_user() {
        let repo = FakeUserRepository::new();
        let ctx = test_ctx();
        let user = sample_active_user("ada@example.com", "Ada");
        let id = user.id;
        repo.insert(user);

        repo.delete(&ctx, id).await.unwrap();
        assert!(repo
            .find_by_id(&ctx, id)
            .await
            .unwrap()
            .unwrap()
            .is_deleted());
    }

    #[tokio::test]
    async fn list_excludes_deleted_users() {
        let repo = FakeUserRepository::new();
        let ctx = test_ctx();
        let active = sample_active_user("active@example.com", "Active");
        let mut deleted = sample_active_user("deleted@example.com", "Deleted");
        deleted.deleted_at = Some(Utc::now());
        repo.insert(active);
        repo.insert(deleted);

        let (users, total) = repo.list(&ctx, PaginationRequest::first()).await.unwrap();
        assert_eq!(users.len(), 1);
        assert_eq!(total, 1);
    }
}
