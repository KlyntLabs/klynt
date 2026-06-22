//! Canonical [`klynt_base::ports::repository::UserRepository`] implementation for
//! [`PgUserRepository`].

use async_trait::async_trait;

use super::PgUserRepository;
use crate::ports::HashedPassword;
use crate::repositories::{CreateResult, UserRepository as PersistenceUserRepository};
use klynt_base::ctx::ExecutionContext;
use klynt_base::ports::repository::{RepositoryError, UserRepository};
use klynt_common::domain::{Email, PaginationRequest, User, UserRole, UserStatus};
use klynt_common::util::UserId;

#[async_trait]
impl UserRepository for PgUserRepository {
    async fn find_by_email(
        &self,
        ctx: &ExecutionContext,
        email: &Email,
    ) -> Result<Option<User>, RepositoryError> {
        <Self as PersistenceUserRepository>::find_by_email(self, ctx, email)
            .await
            .map_err(map_domain_error)
    }

    async fn find_by_id(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
    ) -> Result<Option<User>, RepositoryError> {
        self.find_by_id_full(ctx, user_id)
            .await
            .map_err(map_domain_error)
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
            created_at: chrono::Utc::now(),
            updated_at: None,
            deleted_at: None,
        };

        match <Self as PersistenceUserRepository>::create_if_not_exists(self, ctx, &email, &user)
            .await
            .map_err(map_domain_error)?
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
        <Self as PersistenceUserRepository>::set_email_verified(self, ctx, user_id)
            .await
            .map_err(map_domain_error)
    }

    async fn update_password(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
        password_hash: String,
    ) -> Result<(), RepositoryError> {
        let hashed = HashedPassword::new(&password_hash);
        <Self as PersistenceUserRepository>::update_password(self, ctx, user_id, &hashed)
            .await
            .map_err(map_domain_error)
    }

    async fn update(&self, ctx: &ExecutionContext, user: User) -> Result<User, RepositoryError> {
        self.update_full(ctx, &user)
            .await
            .map_err(map_domain_error)?;
        Ok(user)
    }

    async fn delete(&self, ctx: &ExecutionContext, user_id: UserId) -> Result<(), RepositoryError> {
        self.soft_delete(ctx, user_id)
            .await
            .map_err(map_domain_error)
    }

    async fn list(
        &self,
        ctx: &ExecutionContext,
        pagination: PaginationRequest,
    ) -> Result<(Vec<User>, u64), RepositoryError> {
        self.list_full(ctx, pagination)
            .await
            .map_err(map_domain_error)
    }
}

fn map_domain_error(err: klynt_common::domain::DomainError) -> RepositoryError {
    use klynt_common::domain::DomainError;
    match err {
        DomainError::NotFound(_) => RepositoryError::NotFound,
        DomainError::Conflict(msg) => RepositoryError::Conflict(msg),
        DomainError::Validation(msg) => RepositoryError::Validation(msg),
        DomainError::InvalidInput(msg) => RepositoryError::Validation(msg),
        e => RepositoryError::Internal(e.to_string()),
    }
}
