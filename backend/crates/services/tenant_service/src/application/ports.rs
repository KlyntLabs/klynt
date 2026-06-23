//! Application-layer ports (dependency interfaces).

// Canonical ports from base.
pub use base::ports::audit::AuditLogger;
pub use base::ports::permission::{PermissionRepository, RoleRepository};
pub use base::ports::repository::{MembershipRepository, TenantRepository, UserRepository};
