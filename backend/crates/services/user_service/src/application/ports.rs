//! Application-layer ports (dependency interfaces).

use async_trait::async_trait;

use klynt_base::ctx::ExecutionContext;
use klynt_common::util::UserId;

// Canonical user repository port from klynt_base.
pub use klynt_base::ports::repository::UserRepository;

#[async_trait]
pub trait AuditLogger: Send + Sync {
    async fn log_profile_updated(&self, ctx: &ExecutionContext, user_id: UserId);
    async fn log_password_changed(&self, ctx: &ExecutionContext, user_id: UserId);
    async fn log_user_deleted(&self, ctx: &ExecutionContext, user_id: UserId);
}
