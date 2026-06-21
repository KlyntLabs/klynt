//! Adapter from auth_service `AuditLogger` port to legacy audit service.

use std::sync::Arc;

use async_trait::async_trait;

use klynt_core::ctx::ExecutionContext;
use klynt_utils::UserId;

use crate::application::ports::AuditLogger;

/// Adapter wrapping the legacy [`klynt_audit::AuditService`].
pub struct AuditLoggerAdapter {
    inner: Arc<klynt_audit::AuditService>,
}

impl AuditLoggerAdapter {
    pub fn new(inner: Arc<klynt_audit::AuditService>) -> Self {
        Self { inner }
    }
}

#[async_trait]
impl AuditLogger for AuditLoggerAdapter {
    async fn log_login_success(&self, ctx: &ExecutionContext, user_id: UserId) {
        let legacy_ctx = crate::infrastructure::conversion::to_legacy_ctx(ctx);
        let legacy_user_id = crate::infrastructure::conversion::to_legacy_user_id(user_id);

        self.inner
            .try_log(
                &legacy_ctx,
                "login_success",
                self.inner.log_session_created(
                    &legacy_ctx,
                    legacy_user_id,
                    uuid::Uuid::new_v4(),
                    ctx.request.client_ip.clone(),
                ),
            )
            .await;
    }

    async fn log_login_failed(&self, ctx: &ExecutionContext, email: &str, error: String) {
        let legacy_ctx = crate::infrastructure::conversion::to_legacy_ctx(ctx);

        self.inner
            .try_log(
                &legacy_ctx,
                "login_failed",
                self.inner.log_login_failed(
                    &legacy_ctx,
                    email,
                    ctx.request.client_ip.clone(),
                    error,
                ),
            )
            .await;
    }

    async fn log_user_registered(&self, ctx: &ExecutionContext, user_id: UserId) {
        let legacy_ctx = crate::infrastructure::conversion::to_legacy_ctx(ctx);
        let legacy_user_id = crate::infrastructure::conversion::to_legacy_user_id(user_id);

        self.inner
            .try_log(
                &legacy_ctx,
                "user_registered",
                self.inner.log_user_registered(
                    &legacy_ctx,
                    legacy_user_id,
                    ctx.request.client_ip.clone(),
                ),
            )
            .await;
    }

    async fn log_email_verified(&self, ctx: &ExecutionContext, user_id: UserId) {
        let legacy_ctx = crate::infrastructure::conversion::to_legacy_ctx(ctx);
        let legacy_user_id = crate::infrastructure::conversion::to_legacy_user_id(user_id);

        self.inner
            .try_log(
                &legacy_ctx,
                "email_verified",
                self.inner.log_email_verified(&legacy_ctx, legacy_user_id),
            )
            .await;
    }

    async fn log_password_reset(&self, ctx: &ExecutionContext, user_id: UserId) {
        let legacy_ctx = crate::infrastructure::conversion::to_legacy_ctx(ctx);
        let legacy_user_id = crate::infrastructure::conversion::to_legacy_user_id(user_id);

        self.inner
            .try_log(
                &legacy_ctx,
                "password_reset",
                self.inner.log_password_reset(&legacy_ctx, legacy_user_id),
            )
            .await;
    }

    async fn log_session_created(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
        session_id: uuid::Uuid,
    ) {
        let legacy_ctx = crate::infrastructure::conversion::to_legacy_ctx(ctx);
        let legacy_user_id = crate::infrastructure::conversion::to_legacy_user_id(user_id);

        self.inner
            .try_log(
                &legacy_ctx,
                "session_created",
                self.inner.log_session_created(
                    &legacy_ctx,
                    legacy_user_id,
                    session_id,
                    ctx.request.client_ip.clone(),
                ),
            )
            .await;
    }
}

#[cfg(test)]
mod tests {
    use std::sync::Mutex;

    use super::*;
    use klynt_core::ctx::RequestContext;

    struct CapturingRepo {
        events: Mutex<Vec<klynt_audit::types::AuditEvent>>,
    }

    impl Default for CapturingRepo {
        fn default() -> Self {
            Self {
                events: Mutex::new(Vec::new()),
            }
        }
    }

    #[async_trait]
    impl klynt_infrastructure::repositories::AuditEventRepository for CapturingRepo {
        async fn log(
            &self,
            _ctx: &klynt_core::ctx::Ctx,
            event: klynt_audit::types::AuditEvent,
        ) -> Result<(), klynt_shared_domain::DomainError> {
            self.events.lock().unwrap().push(event);
            Ok(())
        }
    }

    fn adapter() -> (AuditLoggerAdapter, Arc<CapturingRepo>) {
        let repo = Arc::new(CapturingRepo::default());
        let audit = Arc::new(klynt_audit::AuditService::new(repo.clone()));
        (AuditLoggerAdapter::new(audit), repo)
    }

    #[tokio::test]
    async fn log_user_registered_creates_event() {
        let (adapter, repo) = adapter();
        let ctx = ExecutionContext::new(RequestContext::new());
        let user_id = UserId::new();

        adapter.log_user_registered(&ctx, user_id).await;

        let events = repo.events.lock().unwrap();
        assert_eq!(events.len(), 1);
        assert_eq!(
            events[0].action,
            klynt_audit::types::AuditAction::UserRegistered
        );
    }

    #[tokio::test]
    async fn log_email_verified_creates_event() {
        let (adapter, repo) = adapter();
        let ctx = ExecutionContext::new(RequestContext::new());
        let user_id = UserId::new();

        adapter.log_email_verified(&ctx, user_id).await;

        let events = repo.events.lock().unwrap();
        assert_eq!(events.len(), 1);
        assert_eq!(
            events[0].action,
            klynt_audit::types::AuditAction::UserEmailVerified
        );
    }

    #[tokio::test]
    async fn log_password_reset_creates_event() {
        let (adapter, repo) = adapter();
        let ctx = ExecutionContext::new(RequestContext::new());
        let user_id = UserId::new();

        adapter.log_password_reset(&ctx, user_id).await;

        let events = repo.events.lock().unwrap();
        assert_eq!(events.len(), 1);
        assert_eq!(
            events[0].action,
            klynt_audit::types::AuditAction::UserPasswordReset
        );
    }
}
