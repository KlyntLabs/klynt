//! Adapter from user_service `UserRepository` port to the PostgreSQL repository.

use async_trait::async_trait;

use klynt_base::ctx::ExecutionContext;
use klynt_common::domain::{PaginationRequest, User};
use klynt_common::util::UserId;
use klynt_persistence::repositories::pg_user::PgUserRepository;

use crate::application::ports::UserRepository;
use crate::error::UserError;
use crate::infrastructure::error::map_domain_error;

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
    async fn find_by_id(
        &self,
        ctx: &ExecutionContext,
        id: UserId,
    ) -> Result<Option<User>, UserError> {
        self.inner
            .find_by_id_full(ctx, id)
            .await
            .map_err(map_domain_error)
    }

    async fn update(&self, ctx: &ExecutionContext, user: &User) -> Result<(), UserError> {
        self.inner
            .update_full(ctx, user)
            .await
            .map_err(map_domain_error)
    }

    async fn delete(&self, ctx: &ExecutionContext, id: UserId) -> Result<(), UserError> {
        self.inner
            .soft_delete(ctx, id)
            .await
            .map_err(map_domain_error)
    }

    async fn list(
        &self,
        ctx: &ExecutionContext,
        pagination: PaginationRequest,
    ) -> Result<(Vec<User>, u64), UserError> {
        self.inner
            .list_full(ctx, pagination)
            .await
            .map_err(map_domain_error)
    }
}
