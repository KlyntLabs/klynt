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

pub mod application;
pub mod builder;
pub mod config;
pub mod error;

use std::sync::Arc;

use base::ctx::ExecutionContext;
use domain::{Tenant, TenantId, TenantSlug, UserId};

pub use builder::TenantBuilder;
pub use config::TenantConfig;
pub use error::{TenantError, TenantResult};

use application::ports::{AuditLogger, MembershipRepository, TenantRepository};
use base::ports::session::SessionStore;

/// Request to create a new tenant.
#[derive(Debug, Clone)]
pub struct CreateTenantRequest {
    /// Canonical URL slug for the tenant.
    pub slug: String,
    /// Human-readable tenant name.
    pub name: String,
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
        Ok(Self {
            internal_state: InternalState {
                tenant_repository: dependencies.tenant_repository,
                membership_repository: dependencies.membership_repository,
                session_store: dependencies.session_store,
                audit_logger: dependencies.audit_logger,
            },
        })
    }

    /// Create a new tenant for the authenticated actor.
    pub async fn create_tenant(
        &self,
        ctx: &ExecutionContext,
        request: CreateTenantRequest,
    ) -> Result<Tenant, TenantError> {
        application::use_cases::create_tenant::execute(self, ctx, request).await
    }

    /// List all tenants where the authenticated actor is a member.
    pub async fn list_my_tenants(
        &self,
        ctx: &ExecutionContext,
    ) -> Result<Vec<Tenant>, TenantError> {
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

    /// Look up a tenant by its canonical slug.
    pub async fn get_by_slug(
        &self,
        ctx: &ExecutionContext,
        slug: &TenantSlug,
    ) -> Result<Option<Tenant>, TenantError> {
        self.internal()
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

    pub(crate) fn session_store(&self) -> &Arc<dyn SessionStore> {
        &self.internal_state.session_store
    }
}

/// Dependencies wired into the tenant service.
#[derive(Clone)]
pub struct Dependencies {
    pub tenant_repository: Arc<dyn TenantRepository>,
    pub membership_repository: Arc<dyn MembershipRepository>,
    pub session_store: Arc<dyn SessionStore>,
    pub audit_logger: Arc<dyn AuditLogger>,
}

/// Internal state — not part of the public interface.
pub(crate) struct InternalState {
    pub tenant_repository: Arc<dyn TenantRepository>,
    pub membership_repository: Arc<dyn MembershipRepository>,
    pub session_store: Arc<dyn SessionStore>,
    pub audit_logger: Arc<dyn AuditLogger>,
}
