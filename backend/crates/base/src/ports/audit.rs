//! Canonical audit logging interface.

use async_trait::async_trait;
use domain::tenant::TenantId;
use domain::UserId;
use serde::Serialize;

use crate::ctx::ExecutionContext;

/// Snapshot metadata for a password change audit event.
///
/// Never include password hashes, plaintext passwords, or other credential
/// material in this snapshot. The audit event already records actor, action,
/// and resource; this struct carries only non-sensitive change metadata.
#[derive(Debug, Clone, Serialize)]
pub struct PasswordChangeSnapshot {
    pub changed: bool,
}

/// Snapshot metadata for a profile update audit event.
///
/// Avoid including PII or secrets in this snapshot. Use boolean flags or other
/// non-sensitive indicators of what changed.
#[derive(Debug, Clone, Serialize)]
pub struct ProfileUpdateSnapshot {
    pub full_name_changed: bool,
}

/// Canonical audit logging interface.
///
/// Consolidates auth and user service audit events into a single interface.
#[async_trait]
pub trait AuditLogger: Send + Sync {
    // Auth events

    /// Log a successful login.
    async fn log_login_success(&self, ctx: &ExecutionContext, user_id: UserId);

    /// Log a failed login attempt.
    async fn log_login_failed(&self, ctx: &ExecutionContext, email: &str, error: &str);

    /// Log user registration.
    async fn log_user_registered(&self, ctx: &ExecutionContext, user_id: UserId);

    /// Log email verification.
    async fn log_email_verified(&self, ctx: &ExecutionContext, user_id: UserId);

    /// Log password reset.
    async fn log_password_reset(&self, ctx: &ExecutionContext, user_id: UserId);

    /// Log session creation.
    async fn log_session_created(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
        session_id: String,
    );

    // User management events

    /// Log a profile update.
    async fn log_profile_updated(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
        before: ProfileUpdateSnapshot,
        after: ProfileUpdateSnapshot,
    );

    /// Log a password change.
    async fn log_password_changed(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
        before: PasswordChangeSnapshot,
        after: PasswordChangeSnapshot,
    );

    /// Log user deletion.
    async fn log_user_deleted(&self, ctx: &ExecutionContext, user_id: UserId);

    // Tenant management events

    /// Log tenant creation.
    async fn log_tenant_created(&self, ctx: &ExecutionContext, tenant_id: TenantId);

    /// Log tenant update.
    async fn log_tenant_updated(&self, ctx: &ExecutionContext, tenant_id: TenantId);

    /// Log tenant deletion.
    async fn log_tenant_deleted(&self, ctx: &ExecutionContext, tenant_id: TenantId);
}
