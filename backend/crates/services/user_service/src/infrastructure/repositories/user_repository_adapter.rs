//! Adapter from canonical `UserRepository` port to the PostgreSQL repository.

use async_trait::async_trait;

use klynt_base::ctx::ExecutionContext;
use klynt_base::ports::repository::{RepositoryError, UserRepository};
use klynt_common::domain::{Email, PaginationRequest, User};
use klynt_common::util::UserId;
use klynt_persistence::repositories::pg_user::PgUserRepository;
use klynt_persistence::repositories::UserRepository as PersistenceUserRepository;

/// Adapter wrapping a concrete [`PgUserRepository`].
pub struct UserRepositoryAdapter {
    inner: PgUserRepository,
}

impl UserRepositoryAdapter {
    pub fn new(inner: PgUserRepository) -> Self {
        Self { inner }
    }
}

#[async_trait]
impl UserRepository for UserRepositoryAdapter {
    async fn find_by_email(
        &self,
        ctx: &ExecutionContext,
        email: &Email,
    ) -> Result<Option<User>, RepositoryError> {
        PersistenceUserRepository::find_by_email(&self.inner, ctx, email)
            .await
            .map_err(map_error)
    }

    async fn find_by_id(
        &self,
        ctx: &ExecutionContext,
        id: UserId,
    ) -> Result<Option<User>, RepositoryError> {
        self.inner.find_by_id_full(ctx, id).await.map_err(map_error)
    }

    async fn create_pending_user(
        &self,
        ctx: &ExecutionContext,
        full_name: String,
        email: Email,
        password_hash: String,
    ) -> Result<UserId, RepositoryError> {
        use klynt_persistence::repositories::{CreateResult, UserRepository as _};

        let user_id = UserId::new();
        let user = User {
            id: user_id,
            email: Email::new(email.as_str().to_string()),
            full_name: Some(full_name).filter(|n| !n.is_empty()),
            password_hash,
            status: klynt_common::domain::UserStatus::Pending,
            role: klynt_common::domain::UserRole::Student,
            created_at: chrono::Utc::now(),
            updated_at: None,
            deleted_at: None,
        };

        match self
            .inner
            .create_if_not_exists(ctx, &email, &user)
            .await
            .map_err(map_error)?
        {
            CreateResult::Created => Ok(user_id),
            CreateResult::AlreadyExists(_) => Err(RepositoryError::Conflict(format!(
                "email already registered: {email}"
            ))),
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
        PersistenceUserRepository::update_password(&self.inner, ctx, user_id, &hashed)
            .await
            .map_err(map_error)
    }

    async fn update(&self, ctx: &ExecutionContext, user: User) -> Result<User, RepositoryError> {
        self.inner
            .update_full(ctx, &user)
            .await
            .map_err(map_error)?;
        Ok(user)
    }

    async fn delete(&self, ctx: &ExecutionContext, id: UserId) -> Result<(), RepositoryError> {
        self.inner.soft_delete(ctx, id).await.map_err(map_error)
    }

    async fn list(
        &self,
        ctx: &ExecutionContext,
        pagination: PaginationRequest,
    ) -> Result<(Vec<User>, u64), RepositoryError> {
        self.inner
            .list_full(ctx, pagination)
            .await
            .map_err(map_error)
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
