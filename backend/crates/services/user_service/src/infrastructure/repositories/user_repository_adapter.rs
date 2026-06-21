//! Adapter from user_service `UserRepository` port to the PostgreSQL repository.

use async_trait::async_trait;

use klynt_base::ctx::ExecutionContext;
use klynt_common::domain::PaginationRequest;
use klynt_common::util::UserId;
use klynt_persistence::repositories::pg_user::PgUserRepository;

use crate::application::ports::UserRepository;
use crate::domain::User;
use crate::error::UserError;
use crate::infrastructure::conversion::{
    from_legacy_user, map_legacy_error, to_legacy_ctx, to_legacy_user, to_legacy_user_id,
};

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
        let legacy_ctx = to_legacy_ctx(ctx);
        let legacy_id = to_legacy_user_id(id);

        let result = self
            .inner
            .find_by_id_full(&legacy_ctx, legacy_id)
            .await
            .map_err(map_legacy_error)?;

        Ok(result.map(|(legacy_user, deleted_at)| {
            let mut user = from_legacy_user(legacy_user);
            user.deleted_at = deleted_at;
            user
        }))
    }

    async fn update(&self, ctx: &ExecutionContext, user: &User) -> Result<(), UserError> {
        let legacy_ctx = to_legacy_ctx(ctx);
        let legacy_user = to_legacy_user(user.clone())?;

        self.inner
            .update_full(&legacy_ctx, &legacy_user)
            .await
            .map_err(map_legacy_error)
    }

    async fn delete(&self, ctx: &ExecutionContext, id: UserId) -> Result<(), UserError> {
        let legacy_ctx = to_legacy_ctx(ctx);
        let legacy_id = to_legacy_user_id(id);

        self.inner
            .soft_delete(&legacy_ctx, legacy_id)
            .await
            .map_err(map_legacy_error)
    }

    async fn list(
        &self,
        ctx: &ExecutionContext,
        pagination: PaginationRequest,
    ) -> Result<(Vec<User>, u64), UserError> {
        let legacy_ctx = to_legacy_ctx(ctx);

        let (users, total) = self
            .inner
            .list_full(&legacy_ctx, pagination)
            .await
            .map_err(map_legacy_error)?;

        let users = users
            .into_iter()
            .map(|(legacy_user, deleted_at)| {
                let mut user = from_legacy_user(legacy_user);
                user.deleted_at = deleted_at;
                user
            })
            .collect();

        Ok((users, total))
    }
}
