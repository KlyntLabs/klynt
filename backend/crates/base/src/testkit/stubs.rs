//! Minimal in-memory stubs for facade wiring tests.
//!
//! These types provide canonical test doubles for repository, audit, and email
//! ports that do not yet have full in-memory fakes elsewhere in `base::testkit`.

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use async_trait::async_trait;

use crate::ctx::ExecutionContext;
use crate::ports::audit::{
    AuditLogger, PasswordChangeSnapshot, ProfileUpdateSnapshot, RoleMetadataSnapshot,
};
use crate::ports::email::{EmailError, EmailSender};
use crate::ports::repository::{
    RepositoryError, TenantDesktopLayoutRepository, TenantInviteRepository, TenantRepository,
};
use domain::{
    DomainResult, Email, LayoutScope, PermissionId, RoleId, Tenant, TenantDesktopLayout, TenantId,
    TenantInvite, TenantMembershipSummary, TenantSlug, UserId,
};

/// Stub tenant repository that returns empty results.
#[derive(Clone, Debug, Default)]
pub struct FakeTenantRepository;

#[async_trait]
impl TenantRepository for FakeTenantRepository {
    async fn create(&self, _ctx: &ExecutionContext, tenant: &Tenant) -> DomainResult<Tenant> {
        Ok(tenant.clone())
    }

    async fn find_by_id(
        &self,
        _ctx: &ExecutionContext,
        _id: TenantId,
    ) -> DomainResult<Option<Tenant>> {
        Ok(None)
    }

    async fn find_by_slug(
        &self,
        _ctx: &ExecutionContext,
        _slug: &TenantSlug,
    ) -> DomainResult<Option<Tenant>> {
        Ok(None)
    }

    async fn list_for_user(
        &self,
        _ctx: &ExecutionContext,
        _user_id: UserId,
    ) -> DomainResult<Vec<TenantMembershipSummary>> {
        Ok(Vec::new())
    }

    async fn update(&self, _ctx: &ExecutionContext, tenant: &Tenant) -> DomainResult<Tenant> {
        Ok(tenant.clone())
    }

    async fn delete(&self, _ctx: &ExecutionContext, _id: TenantId) -> DomainResult<()> {
        Ok(())
    }

    async fn count_owned_by_user(
        &self,
        _ctx: &ExecutionContext,
        _user_id: UserId,
    ) -> DomainResult<i64> {
        Ok(0)
    }
}

/// In-memory tenant invite repository for tests.
#[derive(Clone, Debug, Default)]
pub struct FakeTenantInviteRepository {
    invites: Arc<Mutex<HashMap<String, TenantInvite>>>,
}

impl FakeTenantInviteRepository {
    /// Create an empty fake invite repository.
    pub fn new() -> Self {
        Self::default()
    }

    /// Insert an invite into the repository.
    pub fn insert(&self, invite: TenantInvite) {
        self.invites
            .lock()
            .unwrap()
            .insert(invite.token.clone(), invite);
    }
}

#[async_trait]
impl TenantInviteRepository for FakeTenantInviteRepository {
    async fn create(
        &self,
        _ctx: &ExecutionContext,
        invite: TenantInvite,
    ) -> Result<TenantInvite, RepositoryError> {
        self.insert(invite.clone());
        Ok(invite)
    }

    async fn find_by_token(
        &self,
        _ctx: &ExecutionContext,
        token: &str,
    ) -> Result<Option<TenantInvite>, RepositoryError> {
        Ok(self.invites.lock().unwrap().get(token).cloned())
    }

    async fn mark_accepted(
        &self,
        _ctx: &ExecutionContext,
        invite_id: uuid::Uuid,
    ) -> Result<(), RepositoryError> {
        let mut invites = self.invites.lock().unwrap();
        let invite = invites
            .values_mut()
            .find(|i| i.id == invite_id)
            .ok_or(RepositoryError::NotFound)?;
        invite.accepted_at = Some(chrono::Utc::now());
        Ok(())
    }
}

/// Stub tenant desktop layout repository that returns empty results.
#[derive(Clone, Debug, Default)]
pub struct FakeTenantDesktopLayoutRepository;

#[async_trait]
impl TenantDesktopLayoutRepository for FakeTenantDesktopLayoutRepository {
    async fn find(
        &self,
        _ctx: &ExecutionContext,
        _tenant_id: uuid::Uuid,
        _scope: LayoutScope,
        _user_id: Option<uuid::Uuid>,
    ) -> DomainResult<Option<TenantDesktopLayout>> {
        Ok(None)
    }

    async fn upsert(
        &self,
        _ctx: &ExecutionContext,
        layout: &TenantDesktopLayout,
    ) -> DomainResult<TenantDesktopLayout> {
        Ok(layout.clone())
    }

    async fn list_user_layouts(
        &self,
        _ctx: &ExecutionContext,
        _tenant_id: uuid::Uuid,
    ) -> DomainResult<Vec<TenantDesktopLayout>> {
        Ok(Vec::new())
    }
}

/// Stub audit logger that records no events.
#[derive(Clone, Debug, Default)]
pub struct FakeAuditLogger;

#[async_trait]
impl AuditLogger for FakeAuditLogger {
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

/// Fake email sender that records sent emails.
#[derive(Clone, Debug, Default)]
pub struct FakeEmailSender {
    pub sent: Arc<Mutex<Vec<(String, String, String)>>>,
}

impl FakeEmailSender {
    /// Create an empty fake email sender.
    pub fn new() -> Self {
        Self::default()
    }
}

#[async_trait]
impl EmailSender for FakeEmailSender {
    async fn send_verification(
        &self,
        _ctx: &ExecutionContext,
        email: &Email,
        token: &str,
        base_url: &str,
    ) -> Result<(), EmailError> {
        self.sent.lock().unwrap().push((
            "verification".to_string(),
            email.as_str().to_string(),
            format!("{base_url}/verify/{token}"),
        ));
        Ok(())
    }

    async fn send_password_reset(
        &self,
        _ctx: &ExecutionContext,
        email: &Email,
        token: &str,
        base_url: &str,
    ) -> Result<(), EmailError> {
        self.sent.lock().unwrap().push((
            "password_reset".to_string(),
            email.as_str().to_string(),
            format!("{base_url}/reset-password/{token}"),
        ));
        Ok(())
    }
}
