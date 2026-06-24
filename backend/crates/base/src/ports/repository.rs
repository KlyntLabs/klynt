//! Canonical repository ports for the Klynt platform.
//!
//! These traits define the persistence interface shared across all services.
//! By having a single source of truth for repository interfaces, we eliminate
//! the need for service-specific adapters and improve testability.

use crate::ctx::ExecutionContext;
use async_trait::async_trait;
use domain::membership::{Membership, TenantMember, TenantRole};
use domain::tenant::{Tenant, TenantId, TenantMembershipSummary, TenantSlug};
use domain::{
    DomainResult, Email, PaginationRequest, RoleId, TenantInvite, User, UserId, UserRole,
};
use uuid::Uuid;

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

/// Canonical repository error type.
///
/// Centralized error type for all repository operations.
/// Services map this to their domain-specific errors.
#[derive(Debug, thiserror::Error)]
pub enum RepositoryError {
    /// Requested user was not found.
    #[error("User not found")]
    NotFound,

    /// User already exists with a conflicting identifier.
    #[error("User already exists ({0})")]
    Conflict(String),

    /// Input validation failed.
    #[error("Validation error: {0}")]
    Validation(String),

    /// Underlying database error.
    #[error("Database error: {0}")]
    Database(String),

    /// Internal unexpected error.
    #[error("Internal error: {0}")]
    Internal(String),
}

// Convert from sqlx::Error for repository implementations.
impl From<sqlx::Error> for RepositoryError {
    fn from(err: sqlx::Error) -> Self {
        match err {
            sqlx::Error::RowNotFound => RepositoryError::NotFound,
            sqlx::Error::Database(db_err) => {
                if db_err.is_unique_violation() {
                    RepositoryError::Conflict(db_err.constraint().unwrap_or("unknown").to_string())
                } else if db_err.is_foreign_key_violation() {
                    RepositoryError::Validation(
                        db_err.constraint().unwrap_or("unknown").to_string(),
                    )
                } else {
                    RepositoryError::Database(db_err.to_string())
                }
            }
            _ => RepositoryError::Internal(err.to_string()),
        }
    }
}

#[cfg(test)]
#[path = "repository_test.rs"]
mod repository_test;
