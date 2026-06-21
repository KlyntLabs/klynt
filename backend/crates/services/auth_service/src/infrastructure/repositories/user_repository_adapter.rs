//! Adapter from legacy user repository to auth_service `UserRepository` port.

use async_trait::async_trait;

use klynt_core::ctx::ExecutionContext;
use klynt_utils::UserId;

use crate::application::ports::UserRepository;
use crate::error::AuthError;
use crate::infrastructure::conversion::{
    from_legacy_user, from_legacy_user_id, to_legacy_ctx, to_legacy_user_id,
};

/// Adapter wrapping a legacy [`klynt_infrastructure::repositories::UserRepository`].
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
    T: klynt_infrastructure::repositories::UserRepository,
{
    async fn find_by_email(
        &self,
        ctx: &ExecutionContext,
        email: &str,
    ) -> Result<Option<crate::models::User>, AuthError> {
        let legacy_ctx = to_legacy_ctx(ctx);
        let legacy_email = klynt_utils::Email::parse(email).map_err(|e| {
            AuthError::Domain(klynt_shared_domain::DomainError::InvalidInput(
                e.to_string(),
            ))
        })?;

        self.inner
            .find_by_email(&legacy_ctx, &legacy_email)
            .await
            .map(|maybe_user| maybe_user.map(from_legacy_user))
            .map_err(map_legacy_error)
    }

    async fn create_pending_user(
        &self,
        ctx: &ExecutionContext,
        full_name: Option<String>,
        email: &str,
        password_hash: &str,
    ) -> Result<UserId, AuthError> {
        let legacy_ctx = to_legacy_ctx(ctx);
        let legacy_email = klynt_utils::Email::parse(email).map_err(|e| {
            AuthError::Domain(klynt_shared_domain::DomainError::InvalidInput(
                e.to_string(),
            ))
        })?;

        let name = full_name.unwrap_or_default();
        let user_id = to_legacy_user_id(UserId::new());
        let user = klynt_infrastructure::repositories::User {
            id: user_id,
            name,
            email: legacy_email.clone(),
            role: klynt_utils::Role::Student,
            institution_id: None,
            status: klynt_utils::UserStatus::PendingVerification,
            email_verified_at: None,
            global_role: None,
            password_hash: password_hash.to_string(),
            terms_accepted_at: chrono::Utc::now(),
            terms_version: "1.0".to_string(),
            created_at: chrono::Utc::now(),
        };

        match self
            .inner
            .create_if_not_exists(&legacy_ctx, &legacy_email, &user)
            .await
        {
            Ok(klynt_infrastructure::repositories::CreateResult::Created) => {
                Ok(from_legacy_user_id(user_id))
            }
            Ok(klynt_infrastructure::repositories::CreateResult::AlreadyExists(_)) => Err(
                AuthError::Domain(klynt_shared_domain::DomainError::Conflict(format!(
                    "email already registered: {email}"
                ))),
            ),
            Err(e) => Err(map_legacy_error(e)),
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
            .map_err(map_legacy_error)
    }

    async fn update_password(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
        password_hash: &str,
    ) -> Result<(), AuthError> {
        let legacy_ctx = to_legacy_ctx(ctx);
        let legacy_user_id = to_legacy_user_id(user_id);
        let hashed = klynt_storage::ports::HashedPassword::new(password_hash);

        self.inner
            .update_password(&legacy_ctx, legacy_user_id, &hashed)
            .await
            .map_err(map_legacy_error)
    }
}

fn map_legacy_error(err: klynt_shared_domain::DomainError) -> AuthError {
    AuthError::Domain(klynt_shared_domain::DomainError::Internal(err.to_string()))
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;
    use std::sync::Mutex;

    use super::*;
    use klynt_core::ctx::RequestContext;

    struct FakeLegacyUserRepository {
        users: Mutex<HashMap<String, klynt_infrastructure::repositories::User>>,
    }

    impl Default for FakeLegacyUserRepository {
        fn default() -> Self {
            Self {
                users: Mutex::new(HashMap::new()),
            }
        }
    }

    #[async_trait]
    impl klynt_infrastructure::repositories::UserRepository for FakeLegacyUserRepository {
        async fn create_if_not_exists(
            &self,
            _ctx: &klynt_core::ctx::Ctx,
            email: &klynt_utils::Email,
            user: &klynt_infrastructure::repositories::User,
        ) -> Result<
            klynt_infrastructure::repositories::CreateResult,
            klynt_shared_domain::DomainError,
        > {
            let mut users = self.users.lock().unwrap();
            if users.contains_key(email.as_str()) {
                return Ok(
                    klynt_infrastructure::repositories::CreateResult::AlreadyExists(user.clone()),
                );
            }
            users.insert(email.as_str().to_string(), user.clone());
            Ok(klynt_infrastructure::repositories::CreateResult::Created)
        }

        async fn find_by_email(
            &self,
            _ctx: &klynt_core::ctx::Ctx,
            email: &klynt_utils::Email,
        ) -> Result<
            Option<klynt_infrastructure::repositories::User>,
            klynt_shared_domain::DomainError,
        > {
            Ok(self.users.lock().unwrap().get(email.as_str()).cloned())
        }

        async fn find_by_id(
            &self,
            _ctx: &klynt_core::ctx::Ctx,
            _id: klynt_utils::UserId,
        ) -> Result<
            Option<klynt_infrastructure::repositories::User>,
            klynt_shared_domain::DomainError,
        > {
            Ok(None)
        }

        async fn set_email_verified(
            &self,
            _ctx: &klynt_core::ctx::Ctx,
            user_id: klynt_utils::UserId,
        ) -> Result<(), klynt_shared_domain::DomainError> {
            let mut users = self.users.lock().unwrap();
            for user in users.values_mut() {
                if user.id == user_id {
                    user.status = klynt_utils::UserStatus::Active;
                    return Ok(());
                }
            }
            Ok(())
        }

        async fn update_password(
            &self,
            _ctx: &klynt_core::ctx::Ctx,
            user_id: klynt_utils::UserId,
            password_hash: &klynt_storage::ports::HashedPassword,
        ) -> Result<(), klynt_shared_domain::DomainError> {
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
        let adapter = UserRepositoryAdapter::new(FakeLegacyUserRepository::default());
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
        let adapter = UserRepositoryAdapter::new(FakeLegacyUserRepository::default());
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
                klynt_shared_domain::DomainError::Conflict(_)
            ))
        ));
    }

    #[tokio::test]
    async fn activate_user_changes_status() {
        let adapter = UserRepositoryAdapter::new(FakeLegacyUserRepository::default());
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
        let adapter = UserRepositoryAdapter::new(FakeLegacyUserRepository::default());
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
