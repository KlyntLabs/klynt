//! Audit event types.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fmt::{self, Display};
use std::str::FromStr;
use uuid::Uuid;

use klynt_base::ctx::Ctx;
use klynt_common::util::UserId;

/// Immutable audit event for compliance and security tracking.
///
/// Audit events capture all security-relevant mutations for
/// compliance (FERPA/COPPA/GDPR) and incident response.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditEvent {
    pub id: Uuid,
    pub actor_user_id: Option<UserId>,
    pub actor_ip_address: Option<String>,
    pub action: AuditAction,
    pub resource_type: ResourceType,
    pub resource_id: Option<Uuid>,
    pub tenant_id: Option<Uuid>,
    pub before_data: Option<serde_json::Value>,
    pub after_data: Option<serde_json::Value>,
    pub success: bool,
    pub error_message: Option<String>,
    pub created_at: DateTime<Utc>,
    pub request_id: Option<Uuid>,
}

/// Actions that can be audited.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AuditAction {
    // User actions
    UserRegistered,
    UserEmailVerified,
    UserPasswordChanged,
    UserPasswordReset,
    UserProfileUpdated,
    UserSuspended,
    UserDeleted,

    // Session actions
    SessionCreated,
    SessionRevoked,
    SessionRefreshed,
    LoginFailed,

    // Tenant actions (Phase 2+)
    TenantCreated,
    TenantUpdated,
    TenantDeleted,

    // Membership actions (Phase 2+)
    MemberInvited,
    MemberRoleChanged,
    MemberRemoved,

    // Permission actions (Phase 3+)
    PermissionGranted,
    PermissionRevoked,
}

/// Types of resources that can be affected.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ResourceType {
    User,
    Session,
    Tenant,
    Membership,
    Permission,
    Role,
}

impl AuditEvent {
    /// Create a new audit event.
    pub fn new(action: AuditAction, resource_type: ResourceType) -> Self {
        Self {
            id: Uuid::new_v4(),
            actor_user_id: None,
            actor_ip_address: None,
            action,
            resource_type,
            resource_id: None,
            tenant_id: None,
            before_data: None,
            after_data: None,
            success: true,
            error_message: None,
            created_at: Utc::now(),
            request_id: None,
        }
    }

    /// Set the actor (user who performed the action).
    pub fn with_actor(mut self, user_id: UserId) -> Self {
        self.actor_user_id = Some(user_id);
        self
    }

    /// Set the actor's IP address.
    pub fn with_ip(mut self, ip: String) -> Self {
        self.actor_ip_address = Some(ip);
        self
    }

    /// Set the resource ID that was affected.
    pub fn with_resource(mut self, id: Uuid) -> Self {
        self.resource_id = Some(id);
        self
    }

    /// Set the tenant context.
    pub fn with_tenant(mut self, tenant_id: Uuid) -> Self {
        self.tenant_id = Some(tenant_id);
        self
    }

    /// Set the "before" state snapshot.
    pub fn with_before(mut self, data: serde_json::Value) -> Self {
        self.before_data = Some(data);
        self
    }

    /// Set the "after" state snapshot.
    pub fn with_after(mut self, data: serde_json::Value) -> Self {
        self.after_data = Some(data);
        self
    }

    /// Mark the event as failed with error message.
    pub fn with_error(mut self, error: String) -> Self {
        self.success = false;
        self.error_message = Some(error);
        self
    }

    /// Set the request correlation ID.
    pub fn with_request_id(mut self, request_id: Uuid) -> Self {
        self.request_id = Some(request_id);
        self
    }
}

impl FromStr for AuditAction {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "user_registered" => Ok(AuditAction::UserRegistered),
            "user_email_verified" => Ok(AuditAction::UserEmailVerified),
            "user_password_changed" => Ok(AuditAction::UserPasswordChanged),
            "user_password_reset" => Ok(AuditAction::UserPasswordReset),
            "user_profile_updated" => Ok(AuditAction::UserProfileUpdated),
            "user_suspended" => Ok(AuditAction::UserSuspended),
            "user_deleted" => Ok(AuditAction::UserDeleted),
            "session_created" => Ok(AuditAction::SessionCreated),
            "session_revoked" => Ok(AuditAction::SessionRevoked),
            "session_refreshed" => Ok(AuditAction::SessionRefreshed),
            "login_failed" => Ok(AuditAction::LoginFailed),
            "tenant_created" => Ok(AuditAction::TenantCreated),
            "tenant_updated" => Ok(AuditAction::TenantUpdated),
            "tenant_deleted" => Ok(AuditAction::TenantDeleted),
            "member_invited" => Ok(AuditAction::MemberInvited),
            "member_role_changed" => Ok(AuditAction::MemberRoleChanged),
            "member_removed" => Ok(AuditAction::MemberRemoved),
            "permission_granted" => Ok(AuditAction::PermissionGranted),
            "permission_revoked" => Ok(AuditAction::PermissionRevoked),
            _ => Err(format!("Unknown action: {s}")),
        }
    }
}

impl Display for AuditAction {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            AuditAction::UserRegistered => "user_registered",
            AuditAction::UserEmailVerified => "user_email_verified",
            AuditAction::UserPasswordChanged => "user_password_changed",
            AuditAction::UserPasswordReset => "user_password_reset",
            AuditAction::UserProfileUpdated => "user_profile_updated",
            AuditAction::UserSuspended => "user_suspended",
            AuditAction::UserDeleted => "user_deleted",
            AuditAction::SessionCreated => "session_created",
            AuditAction::SessionRevoked => "session_revoked",
            AuditAction::SessionRefreshed => "session_refreshed",
            AuditAction::LoginFailed => "login_failed",
            AuditAction::TenantCreated => "tenant_created",
            AuditAction::TenantUpdated => "tenant_updated",
            AuditAction::TenantDeleted => "tenant_deleted",
            AuditAction::MemberInvited => "member_invited",
            AuditAction::MemberRoleChanged => "member_role_changed",
            AuditAction::MemberRemoved => "member_removed",
            AuditAction::PermissionGranted => "permission_granted",
            AuditAction::PermissionRevoked => "permission_revoked",
        };
        write!(f, "{s}")
    }
}

impl FromStr for ResourceType {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "user" => Ok(ResourceType::User),
            "session" => Ok(ResourceType::Session),
            "tenant" => Ok(ResourceType::Tenant),
            "membership" => Ok(ResourceType::Membership),
            "permission" => Ok(ResourceType::Permission),
            "role" => Ok(ResourceType::Role),
            _ => Err(format!("Unknown resource type: {s}")),
        }
    }
}

impl Display for ResourceType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            ResourceType::User => "user",
            ResourceType::Session => "session",
            ResourceType::Tenant => "tenant",
            ResourceType::Membership => "membership",
            ResourceType::Permission => "permission",
            ResourceType::Role => "role",
        };
        write!(f, "{s}")
    }
}

/// Audit event repository port.
#[async_trait::async_trait]
pub trait AuditEventRepository: Send + Sync {
    /// Log an audit event (append-only).
    async fn log(
        &self,
        ctx: &Ctx,
        event: AuditEvent,
    ) -> Result<(), klynt_common::domain::DomainError>;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn creates_basic_audit_event() {
        let event = AuditEvent::new(AuditAction::UserRegistered, ResourceType::User);
        assert_eq!(event.action, AuditAction::UserRegistered);
        assert_eq!(event.resource_type, ResourceType::User);
        assert!(event.success);
        assert!(event.error_message.is_none());
    }

    #[test]
    fn builder_pattern_works() {
        let user_id = UserId::new();
        let resource_id = Uuid::new_v4();
        let request_id = Uuid::new_v4();

        let event = AuditEvent::new(AuditAction::SessionCreated, ResourceType::Session)
            .with_actor(user_id)
            .with_ip("127.0.0.1".to_string())
            .with_resource(resource_id)
            .with_request_id(request_id);

        assert_eq!(event.actor_user_id, Some(user_id));
        assert_eq!(event.actor_ip_address, Some("127.0.0.1".to_string()));
        assert_eq!(event.resource_id, Some(resource_id));
        assert_eq!(event.request_id, Some(request_id));
    }

    #[test]
    fn can_mark_event_as_failed() {
        let event = AuditEvent::new(AuditAction::UserPasswordReset, ResourceType::User)
            .with_error("Token expired".to_string());

        assert!(!event.success);
        assert_eq!(event.error_message, Some("Token expired".to_string()));
    }

    #[test]
    fn can_set_before_after_snapshots() {
        let before = serde_json::json!({"status": "pending"});
        let after = serde_json::json!({"status": "active"});

        let event = AuditEvent::new(AuditAction::UserEmailVerified, ResourceType::User)
            .with_before(before)
            .with_after(after);

        assert_eq!(
            event.before_data,
            Some(serde_json::json!({"status": "pending"}))
        );
        assert_eq!(
            event.after_data,
            Some(serde_json::json!({"status": "active"}))
        );
    }

    #[test]
    fn audit_action_round_trips_through_display_and_from_str() {
        let action = AuditAction::PermissionGranted;
        let serialized = action.to_string();
        assert_eq!(serialized, "permission_granted");
        assert_eq!(
            AuditAction::from_str(&serialized).unwrap(),
            AuditAction::PermissionGranted
        );
    }

    #[test]
    fn login_failed_action_round_trips() {
        let action = AuditAction::LoginFailed;
        let serialized = action.to_string();
        assert_eq!(serialized, "login_failed");
        assert_eq!(
            AuditAction::from_str(&serialized).unwrap(),
            AuditAction::LoginFailed
        );
    }

    #[test]
    fn audit_action_from_str_rejects_unknown() {
        assert!(AuditAction::from_str("unknown_action").is_err());
    }

    #[test]
    fn resource_type_round_trips_through_display_and_from_str() {
        let resource_type = ResourceType::Membership;
        let serialized = resource_type.to_string();
        assert_eq!(serialized, "membership");
        assert_eq!(
            ResourceType::from_str(&serialized).unwrap(),
            ResourceType::Membership
        );
    }

    #[test]
    fn resource_type_from_str_rejects_unknown() {
        assert!(ResourceType::from_str("unknown_type").is_err());
    }
}
