//! Tenant service errors.

use domain::DomainError;

/// Tenant service-specific error type.
#[derive(thiserror::Error, Debug)]
pub enum TenantError {
    #[error("authentication required")]
    AuthenticationRequired,

    #[error("tenant not found")]
    NotFound,

    #[error("not a member of this tenant")]
    NotMember,

    #[error("admin privileges required")]
    NotAdmin,

    #[error("owner privileges required")]
    NotOwner,

    #[error(transparent)]
    Domain(#[from] DomainError),

    #[error("internal error: {0}")]
    Internal(String),
}

impl TenantError {
    /// Constructor for internal errors.
    pub fn internal(msg: impl Into<String>) -> Self {
        Self::Internal(msg.into())
    }

    /// Stable machine-readable error code for gateway mapping.
    pub fn error_code(&self) -> &'static str {
        match self {
            Self::AuthenticationRequired => "AUTHENTICATION_REQUIRED",
            Self::NotFound => "NOT_FOUND",
            Self::NotMember => "NOT_TENANT_MEMBER",
            Self::NotAdmin => "ADMIN_PRIVILEGES_REQUIRED",
            Self::NotOwner => "OWNER_PRIVILEGES_REQUIRED",
            Self::Domain(err) => err.error_code(),
            Self::Internal(_) => "INTERNAL_SERVER_ERROR",
        }
    }
}

/// Result type for tenant operations.
pub type TenantResult<T> = Result<T, TenantError>;
