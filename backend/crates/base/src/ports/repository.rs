//! Canonical repository ports for the Klynt platform.
//!
//! These traits define the persistence interface shared across all services.
//! By having a single source of truth for repository interfaces, we eliminate
//! the need for service-specific adapters and improve testability.

use crate::ctx::ExecutionContext;
use crate::ports::repository_execute;
use async_trait::async_trait;
use domain::membership::{Membership, TenantMember, TenantRole};
use domain::operations::{MembershipOp, TenantOp, UserOp};
use domain::tenant::{Tenant, TenantId, TenantMembershipSummary, TenantSlug};
use domain::tenant_desktop_layout::{LayoutScope, TenantDesktopLayout};
use domain::{
    DesktopApp, DomainResult, Email, IconTreePosition, PaginationRequest, RoleId, TenantInvite,
    User, UserId, UserRole,
};
use uuid::Uuid;

pub use crate::ports::repository_error::RepositoryError;

pub use repository_execute::{MembershipOpResult, TenantOpResult, UserOpResult};

/// Canonical User repository interface.
///
/// Combines methods from both auth and user services into a single,
/// complete interface. All services depend on this trait rather than
/// defining their own fragmented versions.
///
/// ## Design Rationale
///
/// - **Auth methods** (`find_by_email`, `create_pending_user`, `activate_user`,
///   `update_password`) are included because user registration is an auth concern.
/// - **User management methods** (`find_by_id`, `update`, `delete`, `list`) are
///   needed for profile management.
/// - **Single adapter:** One implementation serves both services.
/// - **Test locality:** Tests use local fakes; canonical test doubles will live in `base::testkit`.
#[async_trait]
pub trait UserRepository: Send + Sync {
    /// Find user by email address (auth flow).
    async fn find_by_email(
        &self,
        ctx: &ExecutionContext,
        email: &Email,
    ) -> Result<Option<User>, RepositoryError>;

    /// Find user by ID (user management flow).
    async fn find_by_id(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
    ) -> Result<Option<User>, RepositoryError>;

    /// Create a new pending user (registration flow).
    ///
    /// Returns the ID of the created user.
    #[allow(clippy::too_many_arguments)]
    async fn create_pending_user(
        &self,
        ctx: &ExecutionContext,
        full_name: String,
        username: String,
        email: Email,
        password_hash: String,
        role: UserRole,
        institution_id: Option<Uuid>,
    ) -> Result<UserId, RepositoryError>;

    /// Activate a pending user (email verification flow).
    async fn activate_user(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
    ) -> Result<(), RepositoryError>;

    /// Update user password (password reset/change flows).
    async fn update_password(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
        password_hash: String,
    ) -> Result<(), RepositoryError>;

    /// Update full user record (profile management).
    async fn update(&self, ctx: &ExecutionContext, user: User) -> Result<User, RepositoryError>;

    /// Soft delete a user (account deletion).
    async fn delete(&self, ctx: &ExecutionContext, user_id: UserId) -> Result<(), RepositoryError>;

    /// List users with pagination (admin/user management).
    async fn list(
        &self,
        ctx: &ExecutionContext,
        pagination: PaginationRequest,
    ) -> Result<(Vec<User>, u64), RepositoryError>;

    /// Execute a user operation command.
    ///
    /// This provides a single-entry-point interface that delegates to the
    /// specific methods above. New operations can be added without changing
    /// the interface.
    ///
    /// The default implementation dispatches to the concrete methods; adapters
    /// may override it for optimized or batched execution.
    async fn execute(
        &self,
        ctx: &ExecutionContext,
        op: UserOp,
    ) -> Result<UserOpResult, RepositoryError> {
        repository_execute::execute_user(self, ctx, op).await
    }
}

/// Canonical Tenant repository interface.
#[async_trait]
pub trait TenantRepository: Send + Sync {
    /// Create a new tenant.
    async fn create(&self, ctx: &ExecutionContext, tenant: &Tenant) -> DomainResult<Tenant>;

    /// Find a tenant by ID.
    async fn find_by_id(
        &self,
        ctx: &ExecutionContext,
        id: TenantId,
    ) -> DomainResult<Option<Tenant>>;

    /// Find a tenant by slug.
    async fn find_by_slug(
        &self,
        ctx: &ExecutionContext,
        slug: &TenantSlug,
    ) -> DomainResult<Option<Tenant>>;

    /// List all tenants where the user has a membership, including the user's
    /// role and join timestamp.
    async fn list_for_user(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
    ) -> DomainResult<Vec<TenantMembershipSummary>>;

    /// Update a tenant.
    async fn update(&self, ctx: &ExecutionContext, tenant: &Tenant) -> DomainResult<Tenant>;

    /// Delete a tenant.
    async fn delete(&self, ctx: &ExecutionContext, id: TenantId) -> DomainResult<()>;

    /// Count active tenants owned by a user.
    async fn count_owned_by_user(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
    ) -> DomainResult<i64>;

    /// Execute a tenant operation command.
    ///
    /// This provides a single-entry-point interface that delegates to the
    /// specific methods above. New operations can be added without changing
    /// the interface.
    ///
    /// The default implementation dispatches to the concrete methods; adapters
    /// may override it for optimized or batched execution.
    async fn execute(&self, ctx: &ExecutionContext, op: TenantOp) -> DomainResult<TenantOpResult> {
        repository_execute::execute_tenant(self, ctx, op).await
    }
}

/// Canonical Membership repository interface.
#[async_trait]
pub trait MembershipRepository: Send + Sync {
    /// Create a new membership.
    async fn create(
        &self,
        ctx: &ExecutionContext,
        membership: &Membership,
    ) -> DomainResult<Membership>;

    /// Create a new membership and associate it with a tenant role.
    ///
    /// The default implementation ignores the role ID and delegates to
    /// [`Self::create`]; real persistence adapters should override it to
    /// populate `tenant_role_id`.
    async fn create_with_role_id(
        &self,
        ctx: &ExecutionContext,
        membership: &Membership,
        _tenant_role_id: RoleId,
    ) -> DomainResult<Membership> {
        self.create(ctx, membership).await
    }

    /// Find a membership by tenant and user.
    async fn find(
        &self,
        ctx: &ExecutionContext,
        tenant_id: TenantId,
        user_id: UserId,
    ) -> DomainResult<Option<Membership>>;

    /// List all memberships for a user.
    async fn list_for_user(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
    ) -> DomainResult<Vec<Membership>>;

    /// List all memberships within a tenant.
    async fn list_for_tenant(
        &self,
        ctx: &ExecutionContext,
        tenant_id: TenantId,
    ) -> DomainResult<Vec<Membership>>;

    /// List all members of a tenant with their user details.
    async fn list_members(
        &self,
        ctx: &ExecutionContext,
        tenant_id: TenantId,
    ) -> DomainResult<Vec<TenantMember>>;

    /// Update the role for a membership.
    async fn update_role(
        &self,
        ctx: &ExecutionContext,
        tenant_id: TenantId,
        user_id: UserId,
        role: TenantRole,
    ) -> DomainResult<()>;

    /// Delete a membership.
    async fn delete(
        &self,
        ctx: &ExecutionContext,
        tenant_id: TenantId,
        user_id: UserId,
    ) -> DomainResult<()>;

    /// Execute a membership operation command.
    ///
    /// This provides a single-entry-point interface that delegates to the
    /// specific methods above. New operations can be added without changing
    /// the interface.
    ///
    /// The default implementation dispatches to the concrete methods; adapters
    /// may override it for optimized or batched execution.
    async fn execute(
        &self,
        ctx: &ExecutionContext,
        op: MembershipOp,
    ) -> DomainResult<MembershipOpResult> {
        repository_execute::execute_membership(self, ctx, op).await
    }
}

/// Canonical tenant invite repository interface.
#[async_trait]
pub trait TenantInviteRepository: Send + Sync {
    /// Create a new tenant invite.
    async fn create(
        &self,
        ctx: &ExecutionContext,
        invite: TenantInvite,
    ) -> Result<TenantInvite, RepositoryError>;

    /// Find an invite by its opaque token.
    async fn find_by_token(
        &self,
        ctx: &ExecutionContext,
        token: &str,
    ) -> Result<Option<TenantInvite>, RepositoryError>;

    /// Mark an invite as accepted now.
    async fn mark_accepted(
        &self,
        ctx: &ExecutionContext,
        invite_id: Uuid,
    ) -> Result<(), RepositoryError>;
}

/// Canonical tenant desktop layout repository interface.
#[async_trait]
pub trait TenantDesktopLayoutRepository: Send + Sync {
    /// Find a layout by tenant, scope, and optional user.
    async fn find(
        &self,
        ctx: &ExecutionContext,
        tenant_id: Uuid,
        scope: LayoutScope,
        user_id: Option<Uuid>,
    ) -> DomainResult<Option<TenantDesktopLayout>>;

    /// Create or replace a layout.
    async fn upsert(
        &self,
        ctx: &ExecutionContext,
        layout: &TenantDesktopLayout,
    ) -> DomainResult<TenantDesktopLayout>;

    /// List all user-scoped layouts for a tenant.
    async fn list_user_layouts(
        &self,
        ctx: &ExecutionContext,
        tenant_id: Uuid,
    ) -> DomainResult<Vec<TenantDesktopLayout>>;
}

/// Canonical desktop app repository interface.
#[async_trait]
pub trait DesktopAppRepository: Send + Sync {
    /// Create a new app within a transaction that also appends to icon_tree.
    async fn create_with_position(
        &self,
        ctx: &ExecutionContext,
        app: &DesktopApp,
        position: &IconTreePosition,
        scope: LayoutScope,
    ) -> DomainResult<DesktopApp>;

    /// Find apps visible to a caller (shared + own).
    async fn list_visible(
        &self,
        ctx: &ExecutionContext,
        tenant_id: Uuid,
        caller_id: Uuid,
    ) -> DomainResult<Vec<DesktopApp>>;

    /// Find a single app by id within a tenant. Returns `Ok(None)` when the app
    /// does not exist. Ownership/visibility checks are enforced by the service layer.
    async fn find_by_id(
        &self,
        ctx: &ExecutionContext,
        tenant_id: Uuid,
        app_id: Uuid,
    ) -> DomainResult<Option<DesktopApp>>;

    /// Update app content/menu_config (with etag check).
    async fn update(
        &self,
        ctx: &ExecutionContext,
        app: &DesktopApp,
        expected_etag: &str,
    ) -> DomainResult<DesktopApp>;

    /// Delete an app. Removing the app from the shared `icon_tree` is the
    /// responsibility of the caller/service layer; this method only deletes the
    /// app row.
    async fn delete(
        &self,
        ctx: &ExecutionContext,
        tenant_id: Uuid,
        app_id: Uuid,
    ) -> DomainResult<()>;
}

#[cfg(test)]
#[path = "repository_test.rs"]
mod repository_test;
