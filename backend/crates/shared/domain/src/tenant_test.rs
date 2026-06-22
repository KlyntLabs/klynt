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
