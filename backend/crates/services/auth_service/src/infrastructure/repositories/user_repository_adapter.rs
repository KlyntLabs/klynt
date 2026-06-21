//! Adapter from persistence user repository to auth_service `UserRepository` port.

use async_trait::async_trait;
use chrono::Utc;

use klynt_base::ctx::ExecutionContext;
use klynt_common::domain::{Email, User, UserRole, UserStatus};
use klynt_common::util::UserId;

use crate::application::ports::UserRepository;
use crate::error::AuthError;
use crate::infrastructure::conversion::{to_legacy_ctx, to_legacy_user_id};

/// Adapter wrapping a [`klynt_persistence::repositories::UserRepository`].
pub struct UserRepositoryAdapter<T> {
    inner: T,
}

impl<T> UserRepositoryAdapter<T> {
    pub fn new(inner: T) -> Self {
        Self { inner }
    }
}

#[async_trait]
impl<T> UserRepository for UserRepositoryAdapter<T>
where
    T: klynt_persistence::repositories::UserRepository,
{
    async fn find_by_email(
        &self,
        ctx: &ExecutionContext,
        email: &str,
    ) -> Result<Option<User>, AuthError> {
        let legacy_ctx = to_legacy_ctx(ctx);
        let legacy_email = klynt_common::util::Email::parse(email).map_err(|e| {
            AuthError::Domain(klynt_common::domain::DomainError::InvalidInput(
                e.to_string(),
            ))
        })?;

        self.inner
            .find_by_email(&legacy_ctx, &legacy_email)
            .await
            .map_err(map_persistence_error)
    }

    async fn create_pending_user(
        &self,
        ctx: &ExecutionContext,
        full_name: Option<String>,
        email: &str,
        password_hash: &str,
    ) -> Result<UserId, AuthError> {
        let legacy_ctx = to_legacy_ctx(ctx);
        let legacy_email = klynt_common::util::Email::parse(email).map_err(|e| {
            AuthError::Domain(klynt_common::domain::DomainError::InvalidInput(
                e.to_string(),
            ))
        })?;

        let user_id = UserId::new();
        let user = User {
            id: user_id,
            email: Email::new(legacy_email.as_str().to_string()),
            full_name,
            password_hash: password_hash.to_string(),
            status: UserStatus::Pending,
            role: UserRole::Student,
            created_at: Utc::now(),
            updated_at: None,
            deleted_at: None,
        };

        match self
            .inner
            .create_if_not_exists(&legacy_ctx, &legacy_email, &user)
            .await
        {
            Ok(klynt_persistence::repositories::CreateResult::Created) => Ok(user_id),
            Ok(klynt_persistence::repositories::CreateResult::AlreadyExists(_)) => Err(
                AuthError::Domain(klynt_common::domain::DomainError::Conflict(format!(
                    "email already registered: {email}"
                ))),
            ),
            Err(e) => Err(map_persistence_error(e)),
        }
    }

    async fn activate_user(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
    ) -> Result<(), AuthError> {
        let legacy_ctx = to_legacy_ctx(ctx);
        let legacy_user_id = to_legacy_user_id(user_id);

        self.inner
            .set_email_verified(&legacy_ctx, legacy_user_id)
            .await
            .map_err(map_persistence_error)
    }

    async fn update_password(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
        password_hash: &str,
    ) -> Result<(), AuthError> {
        let legacy_ctx = to_legacy_ctx(ctx);
        let legacy_user_id = to_legacy_user_id(user_id);
        let hashed = klynt_persistence::ports::HashedPassword::new(password_hash);

        self.inner
            .update_password(&legacy_ctx, legacy_user_id, &hashed)
            .await
            .map_err(map_persistence_error)
    }
}

fn map_persistence_error(err: klynt_common::domain::DomainError) -> AuthError {
    AuthError::Domain(klynt_common::domain::DomainError::Internal(err.to_string()))
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;
    use std::sync::Mutex;

    use super::*;
    use klynt_base::ctx::RequestContext;

    struct FakePersistenceRepository {
        users: Mutex<HashMap<String, User>>,
    }

    impl Default for FakePersistenceRepository {
        fn default() -> Self {
            Self {
                users: Mutex::new(HashMap::new()),
            }
        }
    }

    #[async_trait]
    impl klynt_persistence::repositories::UserRepository for FakePersistenceRepository {
        async fn create_if_not_exists(
            &self,
            _ctx: &klynt_base::ctx::Ctx,
            email: &klynt_common::util::Email,
            user: &User,
        ) -> Result<klynt_persistence::repositories::CreateResult, klynt_common::domain::DomainError>
        {
            let mut users = self.users.lock().unwrap();
            if let Some(existing) = users.get(email.as_str()) {
                return Ok(
                    klynt_persistence::repositories::CreateResult::AlreadyExists(existing.clone()),
                );
            }
            users.insert(email.as_str().to_string(), user.clone());
            Ok(klynt_persistence::repositories::CreateResult::Created)
        }

        async fn find_by_email(
            &self,
            _ctx: &klynt_base::ctx::Ctx,
            email: &klynt_common::util::Email,
        ) -> Result<Option<User>, klynt_common::domain::DomainError> {
            Ok(self.users.lock().unwrap().get(email.as_str()).cloned())
        }

        async fn find_by_id(
            &self,
            _ctx: &klynt_base::ctx::Ctx,
            _id: klynt_common::util::UserId,
        ) -> Result<Option<User>, klynt_common::domain::DomainError> {
            Ok(None)
        }

        async fn set_email_verified(
            &self,
            _ctx: &klynt_base::ctx::Ctx,
            user_id: klynt_common::util::UserId,
        ) -> Result<(), klynt_common::domain::DomainError> {
            let mut users = self.users.lock().unwrap();
            for user in users.values_mut() {
                if user.id == user_id {
                    user.status = UserStatus::Active;
                    return Ok(());
                }
            }
            Ok(())
        }

        async fn update_password(
            &self,
            _ctx: &klynt_base::ctx::Ctx,
            user_id: klynt_common::util::UserId,
            password_hash: &klynt_persistence::ports::HashedPassword,
        ) -> Result<(), klynt_common::domain::DomainError> {
            let mut users = self.users.lock().unwrap();
            for user in users.values_mut() {
                if user.id == user_id {
                    user.password_hash = password_hash.as_str().to_string();
                    return Ok(());
                }
            }
            Ok(())
        }
    }

    #[tokio::test]
    async fn create_and_find_user() {
        let adapter = UserRepositoryAdapter::new(FakePersistenceRepository::default());
        let ctx = ExecutionContext::new(RequestContext::new());

        let user_id = adapter
            .create_pending_user(
                &ctx,
                Some("Ada".to_string()),
                "ada@example.com",
                "hash-password",
            )
            .await
            .unwrap();

        let found = adapter
            .find_by_email(&ctx, "ada@example.com")
            .await
            .unwrap();
        assert!(found.is_some());
        assert_eq!(found.unwrap().id, user_id);
    }

    #[tokio::test]
    async fn duplicate_email_returns_conflict() {
        let adapter = UserRepositoryAdapter::new(FakePersistenceRepository::default());
        let ctx = ExecutionContext::new(RequestContext::new());

        adapter
            .create_pending_user(&ctx, None, "ada@example.com", "hash")
            .await
            .unwrap();
        let result = adapter
            .create_pending_user(&ctx, None, "ada@example.com", "hash")
            .await;

        assert!(matches!(
            result,
            Err(AuthError::Domain(
                klynt_common::domain::DomainError::Conflict(_)
            ))
        ));
    }

    #[tokio::test]
    async fn activate_user_changes_status() {
        let adapter = UserRepositoryAdapter::new(FakePersistenceRepository::default());
        let ctx = ExecutionContext::new(RequestContext::new());

        let user_id = adapter
            .create_pending_user(&ctx, None, "ada@example.com", "hash")
            .await
            .unwrap();
        adapter.activate_user(&ctx, user_id).await.unwrap();

        let found = adapter
            .find_by_email(&ctx, "ada@example.com")
            .await
            .unwrap()
            .unwrap();
        assert!(found.is_active());
    }

    #[tokio::test]
    async fn update_password_changes_hash() {
        let adapter = UserRepositoryAdapter::new(FakePersistenceRepository::default());
        let ctx = ExecutionContext::new(RequestContext::new());

        let user_id = adapter
            .create_pending_user(&ctx, None, "ada@example.com", "old-hash")
            .await
            .unwrap();
        adapter
            .update_password(&ctx, user_id, "new-hash")
            .await
            .unwrap();

        let found = adapter
            .find_by_email(&ctx, "ada@example.com")
            .await
            .unwrap()
            .unwrap();
        assert_eq!(found.password_hash, "new-hash");
    }
}
