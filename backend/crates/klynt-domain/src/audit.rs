use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::models::UserId;

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
    UserSuspended,
    UserDeleted,

    // Session actions
    SessionCreated,
    SessionRevoked,
    SessionRefreshed,

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
}
