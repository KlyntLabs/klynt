//! # Tenant Service
//!
//! Tenant and membership management service for the Klynt platform.
//!
//! ## Design
//!
//! This is a **deep module**: small interface, deep implementation.
//!
//! - **Interface**: 5 core methods covering tenant management
//! - **Implementation**: Authorization, persistence, and audit logging hidden inside
//! - **Tests**: Cross the same interface as callers

pub mod admin;
pub mod application;
pub mod builder;
pub mod config;
pub mod desktop_layout;
pub mod error;

pub use desktop_layout::TenantDesktopLayoutService;

use std::sync::Arc;

use base::ctx::ExecutionContext;
use domain::{
    Permission, PermissionId, RoleId, Tenant, TenantId, TenantMembershipSummary,
    TenantRoleAggregate, TenantSlug, UserId,
};
use infra_facades::{InfraFacade, PersistenceFacade};

pub use builder::TenantBuilder;
pub use config::TenantConfig;
pub use error::{TenantError, TenantResult};

use application::AuthorizationService;
use session_coordinator::SessionCoordinator;

/// Request to create a new tenant.
#[derive(Debug, Clone)]
pub struct CreateTenantRequest {
    /// Canonical URL slug for the tenant.
    pub slug: String,
    /// Human-readable tenant name.
    pub name: String,
}

/// Request to add a member to a tenant.
#[derive(Debug, Clone)]
pub struct AddMemberRequest {
    /// Email address of the user to add.
    pub email: String,
    /// Role to assign within the tenant.
    pub role: domain::membership::TenantRole,
}

/// Request to update a member's role.
#[derive(Debug, Clone)]
pub struct UpdateMemberRoleRequest {
    /// Email address of the member whose role is changing.
    pub email: String,
    /// New role to assign.
    pub role: domain::membership::TenantRole,
}

/// Request to remove a member from a tenant.
#[derive(Debug, Clone)]
pub struct RemoveMemberRequest {
    /// Email address of the member to remove.
    pub email: String,
}

/// Request to create a tenant invite.
#[derive(Debug, Clone)]
pub struct CreateTenantInviteRequest {
    /// Email address of the user to invite.
    pub email: String,
    /// Role to assign when the invite is accepted.
    pub role: domain::membership::TenantRole,
}

/// Request to create a custom tenant role.
#[derive(Debug, Clone)]
pub struct CreateRoleRequest {
    /// Display name for the role.
    pub name: String,
    /// Optional description.
    pub description: String,
    /// Permission IDs to grant to the role.
    pub permission_ids: Vec<PermissionId>,
}

/// Request to update a custom tenant role.
#[derive(Debug, Clone)]
pub struct UpdateRoleRequest {
    /// Permission IDs to grant to the role.
    pub permission_ids: Vec<PermissionId>,
}

/// Tenant service — deep module with small interface.
///
/// ## Interface
///
/// Five core methods covering tenant management:
/// - `create_tenant()` - Create a new tenant for the authenticated actor
/// - `list_my_tenants()` - List tenants the actor is a member of
/// - `get_tenant()` - Fetch a tenant by slug if the actor is a member
/// - `update_tenant()` - Rename a tenant (owner or admin)
/// - `delete_tenant()` - Remove a tenant (owner only)
///
/// ## Deep Implementation
///
/// Behind each method:
/// - Authentication and authorization checks
/// - Domain validation
/// - Audit logging
/// - Persistence
///
/// ## Tests
///
/// Tests cross the same interface as production code.
pub struct TenantService {
    internal_state: InternalState,
}

impl TenantService {
    /// Return a builder for constructing the service with sensible defaults.
    pub fn builder() -> TenantBuilder {
        TenantBuilder::new()
    }

    /// Create a new tenant service.
    ///
    /// Prefer [`TenantService::builder`] for production wiring; this constructor
    /// remains available for tests and custom dependency injection.
    pub fn new(_config: TenantConfig, dependencies: Dependencies) -> Result<Self, TenantError> {
        let authorization_service = AuthorizationService::new(
            dependencies
                .persistence_facade
                .membership_repository
                .clone(),
            dependencies
                .persistence_facade
                .permission_repository
                .clone(),
            dependencies.persistence_facade.role_repository.clone(),
        );

        Ok(Self {
            internal_state: InternalState {
                persistence_facade: dependencies.persistence_facade,
                infra_facade: dependencies.infra_facade,
                session_coordinator: dependencies.session_coordinator,
                authorization_service,
            },
        })
    }

    /// Create a new tenant for the authenticated actor.
    pub async fn create_tenant(
        &self,
        ctx: &ExecutionContext,
        request: CreateTenantRequest,
    ) -> Result<TenantMembershipSummary, TenantError> {
        application::use_cases::create_tenant::execute(self, ctx, request).await
    }

    /// List all tenants where the authenticated actor is a member.
    pub async fn list_my_tenants(
        &self,
        ctx: &ExecutionContext,
    ) -> Result<Vec<TenantMembershipSummary>, TenantError> {
        application::use_cases::list_my_tenants::execute(self, ctx).await
    }

    /// Get a tenant by slug if the actor is a member.
    pub async fn get_tenant(
        &self,
        ctx: &ExecutionContext,
        slug: &str,
    ) -> Result<Tenant, TenantError> {
        application::use_cases::get_tenant::execute(self, ctx, slug).await
    }

    /// Rename a tenant. Requires owner or admin role.
    pub async fn update_tenant(
        &self,
        ctx: &ExecutionContext,
        slug: &str,
        name: String,
    ) -> Result<Tenant, TenantError> {
        application::use_cases::update_tenant::execute(self, ctx, slug, name).await
    }

    /// Delete a tenant. Requires owner role.
    pub async fn delete_tenant(
        &self,
        ctx: &ExecutionContext,
        slug: &str,
    ) -> Result<(), TenantError> {
        application::use_cases::delete_tenant::execute(self, ctx, slug).await
    }

    /// List members of a tenant. Requires membership.
    pub async fn list_members(
        &self,
        ctx: &ExecutionContext,
        slug: &str,
    ) -> Result<Vec<domain::membership::TenantMember>, TenantError> {
        application::use_cases::list_members::execute(self, ctx, slug).await
    }

    /// Add a member to a tenant by email. Requires owner or admin role.
    pub async fn add_member(
        &self,
        ctx: &ExecutionContext,
        slug: &str,
        request: AddMemberRequest,
    ) -> Result<domain::membership::Membership, TenantError> {
        application::use_cases::add_member::execute(self, ctx, slug, request).await
    }

    /// Accept a tenant invite and add the authenticated user as a member.
    pub async fn accept_invite(
        &self,
        ctx: &ExecutionContext,
        token: &str,
    ) -> Result<TenantMembershipSummary, TenantError> {
        application::use_cases::accept_invite::execute(self, ctx, token).await
    }

    /// Create a tenant invite. Requires `tenant.manage_members`.
    pub async fn create_invite(
        &self,
        ctx: &ExecutionContext,
        slug: &str,
        request: CreateTenantInviteRequest,
    ) -> Result<domain::TenantInvite, TenantError> {
        application::use_cases::create_invite::execute(self, ctx, slug, request).await
    }

    /// Update a member's role by email. Requires owner or admin role.
    pub async fn update_member_role(
        &self,
        ctx: &ExecutionContext,
        slug: &str,
        request: UpdateMemberRoleRequest,
    ) -> Result<(), TenantError> {
        application::use_cases::update_member_role::execute(self, ctx, slug, request).await
    }

    /// Remove a member from a tenant by email. Requires owner or admin role.
    pub async fn remove_member(
        &self,
        ctx: &ExecutionContext,
        slug: &str,
        request: RemoveMemberRequest,
    ) -> Result<(), TenantError> {
        application::use_cases::remove_member::execute(self, ctx, slug, request).await
    }

    /// List all roles within a tenant. Requires `tenant.manage_roles`.
    pub async fn list_roles(
        &self,
        ctx: &ExecutionContext,
        slug: &str,
    ) -> Result<Vec<TenantRoleAggregate>, TenantError> {
        application::use_cases::roles::list_roles::execute(self, ctx, slug).await
    }

    /// Create a custom role within a tenant. Requires `tenant.manage_roles`.
    pub async fn create_role(
        &self,
        ctx: &ExecutionContext,
        slug: &str,
        request: CreateRoleRequest,
    ) -> Result<TenantRoleAggregate, TenantError> {
        application::use_cases::roles::create_role::execute(self, ctx, slug, request).await
    }

    /// Get a role by ID. Requires `tenant.manage_roles`.
    pub async fn get_role(
        &self,
        ctx: &ExecutionContext,
        slug: &str,
        role_id: RoleId,
    ) -> Result<TenantRoleAggregate, TenantError> {
        application::use_cases::roles::get_role::execute(self, ctx, slug, role_id).await
    }

    /// Update a custom role's permissions. Requires `tenant.manage_roles`.
    pub async fn update_role(
        &self,
        ctx: &ExecutionContext,
        slug: &str,
        role_id: RoleId,
        request: UpdateRoleRequest,
    ) -> Result<TenantRoleAggregate, TenantError> {
        application::use_cases::roles::update_role::execute(self, ctx, slug, role_id, request).await
    }

    /// Delete a custom role. Requires `tenant.manage_roles`.
    pub async fn delete_role(
        &self,
        ctx: &ExecutionContext,
        slug: &str,
        role_id: RoleId,
    ) -> Result<(), TenantError> {
        application::use_cases::roles::delete_role::execute(self, ctx, slug, role_id).await
    }

    /// List the global permission catalog. Requires authentication.
    pub async fn list_permissions(
        &self,
        ctx: &ExecutionContext,
    ) -> Result<Vec<Permission>, TenantError> {
        application::use_cases::permissions::list_permissions::execute(self, ctx).await
    }

    /// Look up a tenant by its canonical slug.
    pub async fn get_by_slug(
        &self,
        ctx: &ExecutionContext,
        slug: &TenantSlug,
    ) -> Result<Option<Tenant>, TenantError> {
        self.internal()
            .persistence_facade
            .tenant_repository
            .find_by_slug(ctx, slug)
            .await
            .map_err(TenantError::Domain)
    }

    /// Ensure the given user is a member of the tenant.
    pub async fn ensure_member(
        &self,
        ctx: &ExecutionContext,
        tenant_id: TenantId,
        user_id: UserId,
    ) -> Result<(), TenantError> {
        let membership = self
            .internal()
            .persistence_facade
            .membership_repository
            .find(ctx, tenant_id, user_id)
            .await?;

        if membership.is_some() {
            Ok(())
        } else {
            Err(TenantError::NotMember)
        }
    }

    pub(crate) fn internal(&self) -> &InternalState {
        &self.internal_state
    }

    pub(crate) fn session_coordinator(&self) -> &Arc<SessionCoordinator> {
        &self.internal_state.session_coordinator
    }

    pub(crate) fn authorization(&self) -> &AuthorizationService {
        &self.internal_state.authorization_service
    }
}

/// Dependencies wired into the tenant service.
#[derive(Clone)]
pub struct Dependencies {
    pub persistence_facade: Arc<PersistenceFacade>,
    pub infra_facade: Arc<InfraFacade>,
    pub session_coordinator: Arc<SessionCoordinator>,
}

/// Internal state — not part of the public interface.
pub(crate) struct InternalState {
    pub persistence_facade: Arc<PersistenceFacade>,
    /// Retained for dependency injection; not currently used by tenant use cases.
    #[allow(dead_code)]
    pub infra_facade: Arc<InfraFacade>,
    pub session_coordinator: Arc<SessionCoordinator>,
    pub authorization_service: AuthorizationService,
}
