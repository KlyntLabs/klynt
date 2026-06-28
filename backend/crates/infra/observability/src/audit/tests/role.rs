use super::*;

#[tokio::test]
async fn log_role_created_creates_expected_event() {
    let (service, repo) = capturing_service();
    let ctx = ExecutionContext::new(RequestContext::new());
    let tenant_id = TenantId::new();
    let role_id = RoleId::new();
    let permission_ids = vec![PermissionId::new(), PermissionId::new()];

    AuditLogger::log_role_created(
        &service,
        &ctx,
        tenant_id,
        role_id,
        "Custom Role",
        "A custom role",
        permission_ids.clone(),
    )
    .await;

    let events = repo.events();
    assert_eq!(events.len(), 1);

    let event = &events[0];
    assert_eq!(event.action, AuditAction::RoleCreated);
    assert_eq!(event.resource_type, ResourceType::Role);
    assert_eq!(event.resource_id, Some(role_id.0));
    assert_eq!(event.tenant_id, Some(tenant_id.inner()));
    assert!(event.before_data.is_none());
    assert_eq!(event.after_data.as_ref().unwrap()["name"], "Custom Role");
    assert_eq!(
        event.after_data.as_ref().unwrap()["permission_ids"]
            .as_array()
            .unwrap()
            .len(),
        permission_ids.len()
    );
}

#[tokio::test]
async fn log_role_permissions_updated_creates_expected_event() {
    let (service, repo) = capturing_service();
    let ctx = ExecutionContext::new(RequestContext::new());
    let tenant_id = TenantId::new();
    let role_id = RoleId::new();
    let before_ids = vec![PermissionId::new(), PermissionId::new()];
    let after_ids = vec![PermissionId::new()];

    AuditLogger::log_role_permissions_updated(
        &service,
        &ctx,
        tenant_id,
        role_id,
        before_ids.clone(),
        after_ids.clone(),
    )
    .await;

    let events = repo.events();
    assert_eq!(events.len(), 1);

    let event = &events[0];
    assert_eq!(event.action, AuditAction::RolePermissionsUpdated);
    assert_eq!(event.resource_type, ResourceType::Role);
    assert_eq!(event.resource_id, Some(role_id.0));
    assert_eq!(
        event.before_data.as_ref().unwrap()["permission_ids"]
            .as_array()
            .unwrap()
            .len(),
        before_ids.len()
    );
    assert_eq!(
        event.after_data.as_ref().unwrap()["permission_ids"]
            .as_array()
            .unwrap()
            .len(),
        after_ids.len()
    );
}

#[tokio::test]
async fn log_role_deleted_creates_expected_event() {
    let (service, repo) = capturing_service();
    let ctx = ExecutionContext::new(RequestContext::new());
    let tenant_id = TenantId::new();
    let role_id = RoleId::new();
    let permission_ids = vec![PermissionId::new()];

    AuditLogger::log_role_deleted(
        &service,
        &ctx,
        tenant_id,
        role_id,
        "Old Role",
        "An old role",
        permission_ids.clone(),
    )
    .await;

    let events = repo.events();
    assert_eq!(events.len(), 1);

    let event = &events[0];
    assert_eq!(event.action, AuditAction::RoleDeleted);
    assert_eq!(event.resource_type, ResourceType::Role);
    assert_eq!(event.resource_id, Some(role_id.0));
    assert_eq!(event.before_data.as_ref().unwrap()["name"], "Old Role");
    assert!(event.after_data.is_none());
}

#[tokio::test]
async fn log_role_updated_creates_expected_event() {
    let (service, repo) = capturing_service();
    let ctx = ExecutionContext::new(RequestContext::new());
    let tenant_id = TenantId::new();
    let role_id = RoleId::new();

    AuditLogger::log_role_updated(
        &service,
        &ctx,
        tenant_id,
        role_id,
        RoleMetadataSnapshot {
            name: "Old Name".to_string(),
            description: "Old Description".to_string(),
        },
        RoleMetadataSnapshot {
            name: "New Name".to_string(),
            description: "New Description".to_string(),
        },
    )
    .await;

    let events = repo.events();
    assert_eq!(events.len(), 1);

    let event = &events[0];
    assert_eq!(event.action, AuditAction::RoleUpdated);
    assert_eq!(event.resource_type, ResourceType::Role);
    assert_eq!(event.before_data.as_ref().unwrap()["name"], "Old Name");
    assert_eq!(event.after_data.as_ref().unwrap()["name"], "New Name");
}

#[test]
fn role_audit_actions_round_trip_through_display_and_from_str() {
    for action in [
        AuditAction::RoleCreated,
        AuditAction::RoleUpdated,
        AuditAction::RoleDeleted,
        AuditAction::RolePermissionsUpdated,
    ] {
        let serialized = action.to_string();
        assert_eq!(AuditAction::from_str(&serialized).unwrap(), action);
    }
}
