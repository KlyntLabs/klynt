use super::*;

#[test]
fn slug_rejects_invalid_characters() {
    assert!(TenantSlug::parse("hello world").is_err());
    assert!(TenantSlug::parse("ab").is_err());
    assert!(TenantSlug::parse("-bad-").is_err());
    assert!(TenantSlug::parse("bad-").is_err());
    assert!(TenantSlug::parse("-bad").is_err());
    assert!(TenantSlug::parse("bad_bad").is_err());
}

#[test]
fn slug_rejects_reserved_subdomains() {
    assert!(TenantSlug::parse("admin").is_err());
    assert!(TenantSlug::parse("login").is_err());
    assert!(TenantSlug::parse("www").is_err());
    assert!(TenantSlug::parse("u").is_err());
    assert!(TenantSlug::parse("api").is_err());
    assert!(TenantSlug::parse("static").is_err());
}

#[test]
fn slug_accepts_valid_input() {
    let slug = TenantSlug::parse("klynt-edu").unwrap();
    assert_eq!(slug.as_str(), "klynt-edu");

    let uppercase = TenantSlug::parse("Klynt-Edu").unwrap();
    assert_eq!(uppercase.as_str(), "klynt-edu");
}

#[test]
fn slug_parses_from_str() {
    let slug: TenantSlug = "klynt-edu".parse().unwrap();
    assert_eq!(slug.as_str(), "klynt-edu");
}

#[test]
fn tenant_requires_non_empty_name() {
    let owner = UserId::new();
    let slug = TenantSlug::parse("valid-slug").unwrap();
    assert!(Tenant::create(slug.clone(), "   ".to_string(), owner).is_err());
    assert!(Tenant::create(slug, "".to_string(), owner).is_err());
}

#[test]
fn tenant_create_succeeds_with_valid_input() {
    let owner = UserId::new();
    let slug = TenantSlug::parse("valid-slug").unwrap();
    let tenant = Tenant::create(slug.clone(), "Valid Tenant".to_string(), owner).unwrap();

    assert_eq!(tenant.slug.as_str(), "valid-slug");
    assert_eq!(tenant.name, "Valid Tenant");
    assert_eq!(tenant.owner_id, owner);
    assert_eq!(tenant.max_members, 100);
    assert_eq!(tenant.max_owners, 1);
    assert!(tenant.settings.is_object());
    assert!(tenant.is_active());
}

#[test]
fn tenant_rename_updates_name() {
    let owner = UserId::new();
    let slug = TenantSlug::parse("renamed-slug").unwrap();
    let mut tenant = Tenant::create(slug, "Old Name".to_string(), owner).unwrap();
    let before = tenant.updated_at;

    tenant.rename("New Name".to_string()).unwrap();

    assert_eq!(tenant.name, "New Name");
    assert!(tenant.updated_at >= before);
}

#[test]
fn tenant_rename_rejects_empty_name() {
    let owner = UserId::new();
    let slug = TenantSlug::parse("rename-slug").unwrap();
    let mut tenant = Tenant::create(slug, "Name".to_string(), owner).unwrap();

    assert!(tenant.rename("   ".to_string()).is_err());
    assert!(tenant.rename("".to_string()).is_err());
}

#[test]
fn tenant_serializes_full_payload() {
    let owner = UserId::new();
    let slug = TenantSlug::parse("full-payload").unwrap();
    let tenant = Tenant::create(slug, "Full Payload".to_string(), owner).unwrap();

    let json = serde_json::to_value(&tenant).unwrap();
    assert!(json.get("id").is_some());
    assert_eq!(json["slug"], "full-payload");
    assert_eq!(json["name"], "Full Payload");
    assert!(json.get("owner_id").is_some());
    assert_eq!(json["max_members"], 100);
    assert_eq!(json["max_owners"], 1);
    assert!(json["settings"].is_object());
    assert_eq!(json["status"], "active");
    assert!(json.get("created_at").is_some());
    assert!(json.get("updated_at").is_some());
}

#[test]
fn tenant_status_round_trips_through_str() {
    assert_eq!(TenantStatus::Active.as_str(), "active");
    assert_eq!(TenantStatus::Suspended.as_str(), "suspended");

    assert_eq!(
        "active".parse::<TenantStatus>().unwrap(),
        TenantStatus::Active
    );
    assert_eq!(
        "SUSPENDED".parse::<TenantStatus>().unwrap(),
        TenantStatus::Suspended
    );
    assert!("unknown".parse::<TenantStatus>().is_err());
}
