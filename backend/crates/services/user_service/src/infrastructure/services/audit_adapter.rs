//! Adapter from user_service `AuditLogger` port to the telemetry audit service.

use std::sync::Arc;

use async_trait::async_trait;

use klynt_base::ctx::ExecutionContext;
use klynt_common::util::UserId;

use crate::application::ports::AuditLogger;

/// Adapter wrapping the telemetry [`klynt_telemetry::audit::AuditService`].
pub struct AuditLoggerAdapter {
    inner: Arc<klynt_telemetry::audit::AuditService>,
}

impl AuditLoggerAdapter {
    pub fn new(inner: Arc<klynt_telemetry::audit::AuditService>) -> Self {
        Self { inner }
    }
}

#[async_trait]
impl AuditLogger for AuditLoggerAdapter {
    async fn log_profile_updated(&self, ctx: &ExecutionContext, user_id: UserId) {
        self.inner
            .try_log(
                ctx,
                "user_profile_updated",
                self.inner.log_profile_updated(ctx, user_id),
            )
            .await;
    }

    async fn log_password_changed(&self, ctx: &ExecutionContext, user_id: UserId) {
        self.inner
            .try_log(
                ctx,
                "user_password_changed",
                self.inner.log_password_changed(ctx, user_id),
            )
            .await;
    }

    async fn log_user_deleted(&self, ctx: &ExecutionContext, user_id: UserId) {
        self.inner
            .try_log(
                ctx,
                "user_deleted",
                self.inner.log_user_deleted(ctx, user_id),
            )
            .await;
    }
}
