//! Membership operation commands.

use crate::membership::{Membership, TenantRole};
use crate::tenant::TenantId;
use crate::user::UserId;

/// Membership repository operation.
pub enum MembershipOp {
    Create {
        membership: Membership,
    },
    Find {
        tenant_id: TenantId,
        user_id: UserId,
    },
    ListForUser {
        user_id: UserId,
    },
    ListForTenant {
        tenant_id: TenantId,
    },
    UpdateRole {
        tenant_id: TenantId,
        user_id: UserId,
        role: TenantRole,
    },
    Delete {
        tenant_id: TenantId,
        user_id: UserId,
    },
}
