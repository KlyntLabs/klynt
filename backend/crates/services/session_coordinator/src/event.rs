//! Membership change events for session coordination.

use domain::{membership::TenantRole, TenantId, UserId};
use serde::{Deserialize, Serialize};

/// Event representing a membership change.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MembershipEvent {
    /// A new membership was created.
    Added {
        tenant_id: TenantId,
        user_id: UserId,
        role: TenantRole,
    },
    /// A membership's role was updated.
    Updated {
        tenant_id: TenantId,
        user_id: UserId,
        role: TenantRole,
    },
    /// A membership was removed.
    Removed {
        tenant_id: TenantId,
        user_id: UserId,
    },
}

impl MembershipEvent {
    /// Return the tenant ID this event relates to.
    pub fn tenant_id(&self) -> TenantId {
        match self {
            Self::Added { tenant_id, .. }
            | Self::Updated { tenant_id, .. }
            | Self::Removed { tenant_id, .. } => *tenant_id,
        }
    }

    /// Return the user ID this event relates to.
    pub fn user_id(&self) -> UserId {
        match self {
            Self::Added { user_id, .. }
            | Self::Updated { user_id, .. }
            | Self::Removed { user_id, .. } => *user_id,
        }
    }

    /// Return a stable, human-readable name for the event kind.
    pub fn kind(&self) -> &'static str {
        match self {
            Self::Added { .. } => "added",
            Self::Updated { .. } => "updated",
            Self::Removed { .. } => "removed",
        }
    }
}
