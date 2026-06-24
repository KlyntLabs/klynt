use async_trait::async_trait;
use base::ctx::ExecutionContext;
use base::ports::audit::{
    AuditLogger, PasswordChangeSnapshot, ProfileUpdateSnapshot, RoleMetadataSnapshot,
};
use domain::{PermissionId, RoleId, TenantId, UserId};

use super::AuditService;

#[async_trait]
impl AuditLogger for AuditService {
    async fn log_login_success(&self, _ctx: &ExecutionContext, _user_id: UserId) {
        // Preserved from previous behavior: login success is recorded via
        // `log_session_created` after the session is created.
    }

    async fn log_login_failed(&self, ctx: &ExecutionContext, email: &str, error: &str) {
        self.try_log(
            ctx,
            "login_failed",
            self.log_login_failed(ctx, email, ctx.request.client_ip.clone(), error.to_string()),
        )
        .await;
    }

    async fn log_user_registered(&self, ctx: &ExecutionContext, user_id: UserId) {
        self.try_log(
            ctx,
            "user_registered",
            self.log_user_registered(ctx, user_id, ctx.request.client_ip.clone()),
        )
        .await;
    }

    async fn log_email_verified(&self, ctx: &ExecutionContext, user_id: UserId) {
        self.try_log(ctx, "email_verified", self.log_email_verified(ctx, user_id))
            .await;
    }

    async fn log_password_reset(&self, ctx: &ExecutionContext, user_id: UserId) {
        self.try_log(ctx, "password_reset", self.log_password_reset(ctx, user_id))
            .await;
    }

    async fn log_session_created(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
        session_id: String,
    ) {
        let session_id = match uuid::Uuid::parse_str(&session_id) {
            Ok(id) => id,
            Err(e) => {
                tracing::warn!(
                    error = %e,
                    session_id = %session_id,
                    "failed to parse session_id for audit log"
                );
                return;
            }
        };

        self.try_log(
            ctx,
            "session_created",
            self.log_session_created(ctx, user_id, session_id, ctx.request.client_ip.clone()),
        )
        .await;
    }

    async fn log_profile_updated(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
        before: ProfileUpdateSnapshot,
        after: ProfileUpdateSnapshot,
    ) {
        self.try_log(
            ctx,
            "user_profile_updated",
            self.log_profile_updated(ctx, user_id, before, after),
        )
        .await;
    }

    async fn log_password_changed(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
        before: PasswordChangeSnapshot,
        after: PasswordChangeSnapshot,
    ) {
        self.try_log(
            ctx,
            "user_password_changed",
            self.log_password_changed(ctx, user_id, before, after),
        )
        .await;
    }

    async fn log_user_deleted(&self, ctx: &ExecutionContext, user_id: UserId) {
        self.try_log(ctx, "user_deleted", self.log_user_deleted(ctx, user_id))
            .await;
    }

    async fn log_tenant_created(&self, ctx: &ExecutionContext, tenant_id: TenantId) {
        self.try_log(
            ctx,
            "tenant_created",
            self.log_tenant_created(ctx, tenant_id),
        )
        .await;
    }

    async fn log_tenant_updated(&self, ctx: &ExecutionContext, tenant_id: TenantId) {
        self.try_log(
            ctx,
            "tenant_updated",
            self.log_tenant_updated(ctx, tenant_id),
        )
        .await;
    }

    async fn log_tenant_deleted(&self, ctx: &ExecutionContext, tenant_id: TenantId) {
        self.try_log(
            ctx,
            "tenant_deleted",
            self.log_tenant_deleted(ctx, tenant_id),
        )
        .await;
    }

    async fn log_member_added(&self, ctx: &ExecutionContext, tenant_id: TenantId, user_id: UserId) {
        self.try_log(
            ctx,
            "member_added",
            self.log_member_added(ctx, tenant_id, user_id),
        )
        .await;
    }

    async fn log_member_invited(
        &self,
        ctx: &ExecutionContext,
        tenant_id: TenantId,
        email: &str,
        role_name: &str,
    ) {
        self.try_log(
            ctx,
            "member_invited",
            self.log_member_invited(ctx, tenant_id, email, role_name),
        )
        .await;
    }

    async fn log_member_role_changed(
        &self,
        ctx: &ExecutionContext,
        tenant_id: TenantId,
        user_id: UserId,
        old_role: &str,
        new_role: &str,
    ) {
        self.try_log(
            ctx,
            "member_role_changed",
            self.log_member_role_changed(ctx, tenant_id, user_id, old_role, new_role),
        )
        .await;
    }

    async fn log_member_removed(
        &self,
        ctx: &ExecutionContext,
        tenant_id: TenantId,
        user_id: UserId,
    ) {
        self.try_log(
            ctx,
            "member_removed",
            self.log_member_removed(ctx, tenant_id, user_id),
        )
        .await;
    }

    async fn log_role_created(
        &self,
        ctx: &ExecutionContext,
        tenant_id: TenantId,
        role_id: RoleId,
        name: &str,
        description: &str,
        permission_ids: Vec<PermissionId>,
    ) {
        self.try_log(
            ctx,
            "role_created",
            self.log_role_created(ctx, tenant_id, role_id, name, description, &permission_ids),
        )
        .await;
    }

    async fn log_role_updated(
        &self,
        ctx: &ExecutionContext,
        tenant_id: TenantId,
        role_id: RoleId,
        before: RoleMetadataSnapshot,
        after: RoleMetadataSnapshot,
    ) {
        self.try_log(
            ctx,
            "role_updated",
            self.log_role_updated(ctx, tenant_id, role_id, before, after),
        )
        .await;
    }

    async fn log_role_permissions_updated(
        &self,
        ctx: &ExecutionContext,
        tenant_id: TenantId,
        role_id: RoleId,
        before_permission_ids: Vec<PermissionId>,
        after_permission_ids: Vec<PermissionId>,
    ) {
        self.try_log(
            ctx,
            "role_permissions_updated",
            self.log_role_permissions_updated(
                ctx,
                tenant_id,
                role_id,
                &before_permission_ids,
                &after_permission_ids,
            ),
        )
        .await;
    }

    async fn log_role_deleted(
        &self,
        ctx: &ExecutionContext,
        tenant_id: TenantId,
        role_id: RoleId,
        before_name: &str,
        before_description: &str,
        before_permission_ids: Vec<PermissionId>,
    ) {
        self.try_log(
            ctx,
            "role_deleted",
            self.log_role_deleted(
                ctx,
                tenant_id,
                role_id,
                before_name,
                before_description,
                &before_permission_ids,
            ),
        )
        .await;
    }
}
