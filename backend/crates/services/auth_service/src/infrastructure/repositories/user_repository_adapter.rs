//! Adapter from persistence user repository to canonical `UserRepository` port.

use async_trait::async_trait;
use chrono::Utc;

use klynt_base::ctx::ExecutionContext;
use klynt_base::ports::repository::{RepositoryError, UserRepository};
use klynt_common::domain::{Email, User, UserRole, UserStatus};
use klynt_common::util::UserId;

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
        email: &Email,
    ) -> Result<Option<User>, RepositoryError> {
        klynt_persistence::repositories::UserRepository::find_by_email(&self.inner, ctx, email)
            .await
            .map_err(map_error)
    }

    async fn find_by_id(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
    ) -> Result<Option<User>, RepositoryError> {
        klynt_persistence::repositories::UserRepository::find_by_id(&self.inner, ctx, user_id)
            .await
            .map_err(map_error)
    }

    async fn create_pending_user(
        &self,
        ctx: &ExecutionContext,
        full_name: String,
        email: Email,
        password_hash: String,
    ) -> Result<UserId, RepositoryError> {
        let user_id = UserId::new();
        let user = User {
            id: user_id,
            email: Email::new(email.as_str().to_string()),
            full_name: Some(full_name).filter(|n| !n.is_empty()),
            password_hash,
            status: UserStatus::Pending,
            role: UserRole::Student,
            created_at: Utc::now(),
            updated_at: None,
            deleted_at: None,
        };

        match self.inner.create_if_not_exists(ctx, &email, &user).await {
            Ok(klynt_persistence::repositories::CreateResult::Created) => Ok(user_id),
            Ok(klynt_persistence::repositories::CreateResult::AlreadyExists(_)) => Err(
                RepositoryError::Conflict(format!("email already registered: {email}")),
            ),
            Err(e) => Err(map_error(e)),
        }
    }

    async fn activate_user(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
    ) -> Result<(), RepositoryError> {
        self.inner
            .set_email_verified(ctx, user_id)
            .await
            .map_err(map_error)
    }

    async fn update_password(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
        password_hash: String,
    ) -> Result<(), RepositoryError> {
        let hashed = klynt_persistence::ports::HashedPassword::new(&password_hash);

        klynt_persistence::repositories::UserRepository::update_password(
            &self.inner,
            ctx,
            user_id,
            &hashed,
        )
        .await
        .map_err(map_error)
    }

    async fn update(&self, _ctx: &ExecutionContext, _user: User) -> Result<User, RepositoryError> {
        Err(RepositoryError::Internal(
            "update not supported by auth service adapter".to_string(),
        ))
    }

    async fn delete(
        &self,
        _ctx: &ExecutionContext,
        _user_id: UserId,
    ) -> Result<(), RepositoryError> {
        Err(RepositoryError::Internal(
            "delete not supported by auth service adapter".to_string(),
        ))
    }

    async fn list(
        &self,
        _ctx: &ExecutionContext,
        _pagination: klynt_common::domain::PaginationRequest,
    ) -> Result<(Vec<User>, u64), RepositoryError> {
        Err(RepositoryError::Internal(
            "list not supported by auth service adapter".to_string(),
        ))
    }
}

fn map_error(err: klynt_common::domain::DomainError) -> RepositoryError {
    match err {
        klynt_common::domain::DomainError::NotFound(_) => RepositoryError::NotFound,
        klynt_common::domain::DomainError::Conflict(msg) => RepositoryError::Conflict(msg),
        klynt_common::domain::DomainError::Validation(msg) => RepositoryError::Validation(msg),
        klynt_common::domain::DomainError::InvalidInput(msg) => RepositoryError::Validation(msg),
        e => RepositoryError::Internal(e.to_string()),
    }
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
            _ctx: &ExecutionContext,
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
            _ctx: &ExecutionContext,
            email: &klynt_common::util::Email,
        ) -> Result<Option<User>, klynt_common::domain::DomainError> {
            Ok(self.users.lock().unwrap().get(email.as_str()).cloned())
        }

        async fn find_by_id(
            &self,
            _ctx: &ExecutionContext,
            _id: klynt_common::util::UserId,
        ) -> Result<Option<User>, klynt_common::domain::DomainError> {
            Ok(None)
        }

        async fn set_email_verified(
            &self,
            _ctx: &ExecutionContext,
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
            _ctx: &ExecutionContext,
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

        let email = Email::parse("ada@example.com").unwrap();
        let user_id = adapter
            .create_pending_user(
                &ctx,
                "Ada".to_string(),
                email.clone(),
                "hash-password".to_string(),
            )
            .await
            .unwrap();

        let found = adapter.find_by_email(&ctx, &email).await.unwrap();
        assert!(found.is_some());
        assert_eq!(found.unwrap().id, user_id);
    }

    #[tokio::test]
    async fn duplicate_email_returns_conflict() {
        let adapter = UserRepositoryAdapter::new(FakePersistenceRepository::default());
        let ctx = ExecutionContext::new(RequestContext::new());

        let email = Email::parse("ada@example.com").unwrap();
        adapter
            .create_pending_user(&ctx, String::new(), email.clone(), "hash".to_string())
            .await
            .unwrap();
        let result = adapter
            .create_pending_user(&ctx, String::new(), email.clone(), "hash".to_string())
            .await;

        assert!(matches!(result, Err(RepositoryError::Conflict(_))));
    }

    #[tokio::test]
    async fn activate_user_changes_status() {
        let adapter = UserRepositoryAdapter::new(FakePersistenceRepository::default());
        let ctx = ExecutionContext::new(RequestContext::new());

        let email = Email::parse("ada@example.com").unwrap();
        let user_id = adapter
            .create_pending_user(&ctx, String::new(), email.clone(), "hash".to_string())
            .await
            .unwrap();
        adapter.activate_user(&ctx, user_id).await.unwrap();

        let found = adapter.find_by_email(&ctx, &email).await.unwrap().unwrap();
        assert!(found.is_active());
    }

    #[tokio::test]
    async fn update_password_changes_hash() {
        let adapter = UserRepositoryAdapter::new(FakePersistenceRepository::default());
        let ctx = ExecutionContext::new(RequestContext::new());

        let email = Email::parse("ada@example.com").unwrap();
        let user_id = adapter
            .create_pending_user(&ctx, String::new(), email.clone(), "old-hash".to_string())
            .await
            .unwrap();
        adapter
            .update_password(&ctx, user_id, "new-hash".to_string())
            .await
            .unwrap();

        let found = adapter.find_by_email(&ctx, &email).await.unwrap().unwrap();
        assert_eq!(found.password_hash, "new-hash");
    }
}
