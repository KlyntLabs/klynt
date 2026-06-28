//! Tenant operation commands.

use crate::tenant::{Tenant, TenantId, TenantSlug};
use crate::user::UserId;

/// Tenant repository operation.
#[derive(Debug, Clone, PartialEq)]
pub enum TenantOp {
    Create { tenant: Tenant },
    FindById { id: TenantId },
    FindBySlug { slug: TenantSlug },
    ListForUser { user_id: UserId },
    Update { tenant: Tenant },
    Delete { id: TenantId },
    CountOwnedByUser { user_id: UserId },
}
