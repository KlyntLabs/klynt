//! Canonical audit logging interface.

use async_trait::async_trait;
use domain::tenant::TenantId;
use domain::{PermissionId, RoleId, UserId};
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

/// Snapshot metadata for a role name/description change audit event.
///
/// Carries only non-sensitive role metadata; permission changes are logged
/// separately via [`AuditLogger::log_role_permissions_updated`].
#[derive(Debug, Clone, Serialize)]
pub struct RoleMetadataSnapshot {
    pub name: String,
    pub description: String,
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

    /// Log a member being added to a tenant.
    async fn log_member_added(&self, ctx: &ExecutionContext, tenant_id: TenantId, user_id: UserId);

    /// Log a member being invited to a tenant.
    async fn log_member_invited(
        &self,
        ctx: &ExecutionContext,
        tenant_id: TenantId,
        email: &str,
        role_name: &str,
    );

    /// Log a member's role being changed within a tenant.
    async fn log_member_role_changed(
        &self,
        ctx: &ExecutionContext,
        tenant_id: TenantId,
        user_id: UserId,
        old_role: &str,
        new_role: &str,
    );

    /// Log a member being removed from a tenant.
    async fn log_member_removed(
        &self,
        ctx: &ExecutionContext,
        tenant_id: TenantId,
        user_id: UserId,
    );

    // Role management events

    /// Log a custom role being created within a tenant.
    async fn log_role_created(
        &self,
        ctx: &ExecutionContext,
        tenant_id: TenantId,
        role_id: RoleId,
        name: &str,
        description: &str,
        permission_ids: Vec<PermissionId>,
    );

    /// Log a role's name or description being changed.
    async fn log_role_updated(
        &self,
        ctx: &ExecutionContext,
        tenant_id: TenantId,
        role_id: RoleId,
        before: RoleMetadataSnapshot,
        after: RoleMetadataSnapshot,
    );

    /// Log a role's permission set being changed.
    async fn log_role_permissions_updated(
        &self,
        ctx: &ExecutionContext,
        tenant_id: TenantId,
        role_id: RoleId,
        before_permission_ids: Vec<PermissionId>,
        after_permission_ids: Vec<PermissionId>,
    );

    /// Log a custom role being deleted.
    async fn log_role_deleted(
        &self,
        ctx: &ExecutionContext,
        tenant_id: TenantId,
        role_id: RoleId,
        before_name: &str,
        before_description: &str,
        before_permission_ids: Vec<PermissionId>,
    );
}
