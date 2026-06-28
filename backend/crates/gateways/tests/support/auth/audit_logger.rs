use async_trait::async_trait;
use auth_service::application::ports::{AuditLogger, MembershipRepository};
use base::ctx::ExecutionContext;
use base::ports::audit::{PasswordChangeSnapshot, ProfileUpdateSnapshot, RoleMetadataSnapshot};
use domain::{DomainResult, Membership, PermissionId, RoleId, TenantId, TenantMember, UserId};

/// Stub audit logger that does nothing.
#[derive(Default, Clone)]
pub struct StubAuditLogger;

#[async_trait]
impl AuditLogger for StubAuditLogger {
    async fn log_login_success(&self, _ctx: &ExecutionContext, _user_id: UserId) {}

    async fn log_login_failed(&self, _ctx: &ExecutionContext, _email: &str, _error: &str) {}

    async fn log_user_registered(&self, _ctx: &ExecutionContext, _user_id: UserId) {}

    async fn log_email_verified(&self, _ctx: &ExecutionContext, _user_id: UserId) {}

    async fn log_password_reset(&self, _ctx: &ExecutionContext, _user_id: UserId) {}

    async fn log_session_created(
        &self,
        _ctx: &ExecutionContext,
        _user_id: UserId,
        _session_id: String,
    ) {
    }

    async fn log_profile_updated(
        &self,
        _ctx: &ExecutionContext,
        _user_id: UserId,
        _before: ProfileUpdateSnapshot,
        _after: ProfileUpdateSnapshot,
    ) {
    }

    async fn log_password_changed(
        &self,
        _ctx: &ExecutionContext,
        _user_id: UserId,
        _before: PasswordChangeSnapshot,
        _after: PasswordChangeSnapshot,
    ) {
    }

    async fn log_user_deleted(&self, _ctx: &ExecutionContext, _user_id: UserId) {}

    async fn log_tenant_created(&self, _ctx: &ExecutionContext, _tenant_id: TenantId) {}

    async fn log_tenant_updated(&self, _ctx: &ExecutionContext, _tenant_id: TenantId) {}

    async fn log_tenant_deleted(&self, _ctx: &ExecutionContext, _tenant_id: TenantId) {}

    async fn log_member_added(
        &self,
        _ctx: &ExecutionContext,
        _tenant_id: TenantId,
        _user_id: UserId,
    ) {
    }

    async fn log_member_invited(
        &self,
        _ctx: &ExecutionContext,
        _tenant_id: TenantId,
        _email: &str,
        _role_name: &str,
    ) {
    }

    async fn log_member_role_changed(
        &self,
        _ctx: &ExecutionContext,
        _tenant_id: TenantId,
        _user_id: UserId,
        _old_role: &str,
        _new_role: &str,
    ) {
    }

    async fn log_member_removed(
        &self,
        _ctx: &ExecutionContext,
        _tenant_id: TenantId,
        _user_id: UserId,
    ) {
    }

    async fn log_role_created(
        &self,
        _ctx: &ExecutionContext,
        _tenant_id: TenantId,
        _role_id: RoleId,
        _name: &str,
        _description: &str,
        _permission_ids: Vec<PermissionId>,
    ) {
    }

    async fn log_role_updated(
        &self,
        _ctx: &ExecutionContext,
        _tenant_id: TenantId,
        _role_id: RoleId,
        _before: RoleMetadataSnapshot,
        _after: RoleMetadataSnapshot,
    ) {
    }

    async fn log_role_permissions_updated(
        &self,
        _ctx: &ExecutionContext,
        _tenant_id: TenantId,
        _role_id: RoleId,
        _before_permission_ids: Vec<PermissionId>,
        _after_permission_ids: Vec<PermissionId>,
    ) {
    }

    async fn log_role_deleted(
        &self,
        _ctx: &ExecutionContext,
        _tenant_id: TenantId,
        _role_id: RoleId,
        _before_name: &str,
        _before_description: &str,
        _before_permission_ids: Vec<PermissionId>,
    ) {
    }
}

/// Stub membership repository that returns empty lists and NotFound errors.
#[derive(Default, Clone)]
pub struct StubMembershipRepository;

#[async_trait]
impl MembershipRepository for StubMembershipRepository {
    async fn create(
        &self,
        _ctx: &ExecutionContext,
        _membership: &Membership,
    ) -> DomainResult<Membership> {
        Err(domain::DomainError::not_found("membership"))
    }

    async fn find(
        &self,
        _ctx: &ExecutionContext,
        _tenant_id: TenantId,
        _user_id: UserId,
    ) -> DomainResult<Option<Membership>> {
        Ok(None)
    }

    async fn list_for_user(
        &self,
        _ctx: &ExecutionContext,
        _user_id: UserId,
    ) -> DomainResult<Vec<Membership>> {
        Ok(Vec::new())
    }

    async fn list_for_tenant(
        &self,
        _ctx: &ExecutionContext,
        _tenant_id: TenantId,
    ) -> DomainResult<Vec<Membership>> {
        Ok(Vec::new())
    }

    async fn list_members(
        &self,
        _ctx: &ExecutionContext,
        _tenant_id: TenantId,
    ) -> DomainResult<Vec<TenantMember>> {
        Ok(Vec::new())
    }

    async fn update_role(
        &self,
        _ctx: &ExecutionContext,
        _tenant_id: TenantId,
        _user_id: UserId,
        _role: domain::membership::TenantRole,
    ) -> DomainResult<()> {
        Err(domain::DomainError::not_found("membership"))
    }

    async fn delete(
        &self,
        _ctx: &ExecutionContext,
        _tenant_id: TenantId,
        _user_id: UserId,
    ) -> DomainResult<()> {
        Err(domain::DomainError::not_found("membership"))
    }
}
