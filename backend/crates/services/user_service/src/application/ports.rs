//! Application-layer ports (dependency interfaces).

use async_trait::async_trait;

use klynt_base::ctx::ExecutionContext;
use klynt_common::domain::PaginationRequest;
use klynt_common::util::UserId;

use crate::domain::User;
use crate::error::UserError;

#[async_trait]
pub trait UserRepository: Send + Sync {
    async fn find_by_id(
        &self,
        ctx: &ExecutionContext,
        id: UserId,
    ) -> Result<Option<User>, UserError>;

    async fn update(&self, ctx: &ExecutionContext, user: &User) -> Result<(), UserError>;

    async fn delete(&self, ctx: &ExecutionContext, id: UserId) -> Result<(), UserError>;

    async fn list(
        &self,
        ctx: &ExecutionContext,
        pagination: PaginationRequest,
    ) -> Result<(Vec<User>, u64), UserError>;
}

#[async_trait]
pub trait AuditLogger: Send + Sync {
    async fn log_profile_updated(&self, ctx: &ExecutionContext, user_id: UserId);
    async fn log_password_changed(&self, ctx: &ExecutionContext, user_id: UserId);
    async fn log_user_deleted(&self, ctx: &ExecutionContext, user_id: UserId);
}
