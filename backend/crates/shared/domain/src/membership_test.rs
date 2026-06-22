//! Tests for the tenant membership aggregate.

use std::str::FromStr;

use super::*;

#[test]
fn tenant_role_parses_case_insensitively() {
    assert_eq!(TenantRole::parse("owner").unwrap(), TenantRole::Owner);
    assert_eq!(TenantRole::parse("ADMIN").unwrap(), TenantRole::Admin);
    assert_eq!(TenantRole::parse("Member").unwrap(), TenantRole::Member);
    assert_eq!(TenantRole::parse("gUeSt").unwrap(), TenantRole::Guest);
}

#[test]
fn tenant_role_from_str_matches_parse() {
    assert_eq!(TenantRole::from_str("admin").unwrap(), TenantRole::Admin);
    assert!(TenantRole::from_str("unknown").is_err());
}

#[test]
fn tenant_role_rejects_unknown_values() {
    assert!(TenantRole::parse("superuser").is_err());
    assert!(TenantRole::parse("").is_err());
}

#[test]
fn tenant_role_as_str_and_display_round_trip() {
    for role in [
        TenantRole::Owner,
        TenantRole::Admin,
        TenantRole::Member,
        TenantRole::Guest,
    ] {
        assert_eq!(role.as_str(), role.to_string());
        assert_eq!(TenantRole::parse(&role.to_string()).unwrap(), role);
    }
}

#[test]
fn tenant_role_can_administer() {
    assert!(TenantRole::Owner.can_administer());
    assert!(TenantRole::Admin.can_administer());
    assert!(!TenantRole::Member.can_administer());
    assert!(!TenantRole::Guest.can_administer());
}

#[test]
fn membership_new_sets_fields() {
    let tenant_id = TenantId::new();
    let user_id = UserId::new();
    let role = TenantRole::Member;

    let membership = Membership::new(tenant_id, user_id, role);

    assert_eq!(membership.tenant_id, tenant_id);
    assert_eq!(membership.user_id, user_id);
    assert_eq!(membership.role, role);
    assert!((Utc::now() - membership.joined_at).num_seconds() < 1);
}

#[test]
fn membership_set_role_updates_role() {
    let mut membership = Membership::new(TenantId::new(), UserId::new(), TenantRole::Guest);

    membership.set_role(TenantRole::Admin);

    assert_eq!(membership.role, TenantRole::Admin);
}
