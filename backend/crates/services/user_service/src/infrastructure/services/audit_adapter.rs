//! Adapter from user_service `AuditLogger` port to legacy audit service.

use std::sync::Arc;

use async_trait::async_trait;

use klynt_base::ctx::ExecutionContext;
use klynt_common::util::UserId;

use crate::application::ports::AuditLogger;
use crate::infrastructure::conversion::{to_legacy_ctx, to_legacy_user_id};

/// Adapter wrapping the legacy [`klynt_telemetry::audit::AuditService`].
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
        let legacy_ctx = to_legacy_ctx(ctx);
        let legacy_user_id = to_legacy_user_id(user_id);

        self.inner
            .try_log(
                &legacy_ctx,
                "user_profile_updated",
                self.inner.log_profile_updated(&legacy_ctx, legacy_user_id),
            )
            .await;
    }

    async fn log_password_changed(&self, ctx: &ExecutionContext, user_id: UserId) {
        let legacy_ctx = to_legacy_ctx(ctx);
        let legacy_user_id = to_legacy_user_id(user_id);

        self.inner
            .try_log(
                &legacy_ctx,
                "user_password_changed",
                self.inner.log_password_changed(&legacy_ctx, legacy_user_id),
            )
            .await;
    }

    async fn log_user_deleted(&self, ctx: &ExecutionContext, user_id: UserId) {
        let legacy_ctx = to_legacy_ctx(ctx);
        let legacy_user_id = to_legacy_user_id(user_id);

        self.inner
            .try_log(
                &legacy_ctx,
                "user_deleted",
                self.inner.log_user_deleted(&legacy_ctx, legacy_user_id),
            )
            .await;
    }
}
