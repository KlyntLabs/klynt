//! Tenant invitation aggregate.

use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::tenant::TenantId;
use crate::tenant_role::RoleId;
use crate::user::{Email, UserId};

/// A pending invitation to join a tenant.
#[derive(Debug, Clone)]
pub struct TenantInvite {
    pub id: Uuid,
    pub tenant_id: TenantId,
    pub email: Email,
    pub role_id: RoleId,
    pub role_name: String,
    pub invited_by: UserId,
    pub expires_at: DateTime<Utc>,
    pub accepted_at: Option<DateTime<Utc>>,
    pub token: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
