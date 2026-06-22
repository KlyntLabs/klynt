use super::*;

fn sample_user() -> User {
    let now = Utc::now();
    User {
        id: UserId::new(),
        email: Email::new("ada@example.com".to_string()),
        full_name: Some("Ada".to_string()),
        password_hash: "hash".to_string(),
        status: UserStatus::Active,
        role: UserRole::Student,
        global_role: None,
        email_verified_at: None,
        institution_id: None,
        terms_accepted_at: now,
        terms_version: "1.0".to_string(),
        created_at: now,
        updated_at: now,
        deleted_at: None,
    }
}

#[test]
fn user_id_new_is_unique() {
    let a = UserId::new();
    let b = UserId::new();
    assert_ne!(a, b);
}

#[test]
fn user_id_from_uuid_round_trips() {
    let uuid = Uuid::new_v4();
    let user_id = UserId::from_uuid(uuid);
    assert_eq!(user_id.inner(), uuid);
}

#[test]
fn user_id_default_creates_new() {
    let id: UserId = Default::default();
    assert_eq!(id.inner().get_version_num(), 4);
}

#[test]
fn user_id_display_formats_as_uuid() {
    let uuid = Uuid::new_v4();
    let user_id = UserId::from_uuid(uuid);
    assert_eq!(user_id.to_string(), uuid.to_string());
}

#[test]
fn user_id_from_str_round_trips() {
    let original = UserId::new();
    let parsed: UserId = original.to_string().parse().unwrap();
    assert_eq!(parsed, original);
}

#[test]
fn parse_valid_email() {
    let email = Email::parse("User@Example.COM").unwrap();
    assert_eq!(email.as_str(), "user@example.com");
}

#[test]
fn parse_empty_email_fails() {
    assert_eq!(Email::parse("  ").unwrap_err(), EmailError::Empty);
}

#[test]
fn parse_missing_at_sign_fails() {
    assert_eq!(
        Email::parse("user.example.com").unwrap_err(),
        EmailError::InvalidFormat
    );
}

#[test]
fn parse_missing_domain_dot_fails() {
    assert_eq!(
        Email::parse("user@example").unwrap_err(),
        EmailError::InvalidFormat
    );
}

#[test]
fn parse_leading_or_trailing_domain_dot_fails() {
    assert!(matches!(
        Email::parse("user@.example.com").unwrap_err(),
        EmailError::InvalidFormat
    ));
    assert!(matches!(
        Email::parse("user@example.com.").unwrap_err(),
        EmailError::InvalidFormat
    ));
}

#[test]
fn display_and_as_str_match() {
    let email = Email::parse("test@klynt.dev").unwrap();
    assert_eq!(email.to_string(), email.as_str());
}

#[test]
fn new_preserves_lower_case() {
    let email = Email::new("Admin@Klynt.Dev".to_string());
    assert_eq!(email.as_str(), "admin@klynt.dev");
}

#[test]
fn active_user_is_active() {
    let user = sample_user();
    assert!(user.is_active());
    assert!(!user.is_deleted());
}

#[test]
fn deleted_user_is_not_active() {
    let mut user = sample_user();
    user.deleted_at = Some(Utc::now());
    assert!(!user.is_active());
    assert!(user.is_deleted());
}

#[test]
fn suspended_user_is_not_active() {
    let mut user = sample_user();
    user.status = UserStatus::Suspended;
    assert!(!user.is_active());
}

#[test]
fn admin_cannot_be_deleted() {
    let mut user = sample_user();
    user.role = UserRole::Admin;
    assert!(!user.can_delete());
}

#[test]
fn new_user_defaults_to_pending() {
    let email = Email::new("new@example.com".to_string());
    let user = User::new(email, "hash".to_string(), None, UserRole::Student);
    assert_eq!(user.status, UserStatus::Pending);
    assert!(!user.is_active());
}

#[test]
fn pagination_request_clamps_values() {
    let req = PaginationRequest::new(0, 200);
    assert_eq!(req.page, 1);
    assert_eq!(req.page_size, 100);
    assert_eq!(req.offset(), 0);

    let first = PaginationRequest::first();
    assert_eq!(first.page, 1);
    assert_eq!(first.page_size, 20);
    assert_eq!(first.offset(), 0);
}

#[test]
fn paginated_response_calculates_total_pages() {
    let resp: PaginatedResponse<i32> = PaginatedResponse::new(vec![1, 2, 3], 23, 1, 10);
    assert_eq!(resp.total_count, 23);
    assert_eq!(resp.total_pages, 3);

    let empty = PaginatedResponse::<i32>::empty(1, 10);
    assert!(empty.items.is_empty());
    assert_eq!(empty.total_pages, 1);
}

#[test]
fn user_role_and_status_serialize() {
    let role = UserRole::Instructor;
    assert_eq!(serde_json::to_string(&role).unwrap(), "\"instructor\"");

    let status = UserStatus::Pending;
    assert_eq!(serde_json::to_string(&status).unwrap(), "\"pending\"");
}

#[test]
fn new_user_includes_schema_aligned_fields() {
    let email = Email::new("new@example.com".to_string());
    let user = User::new(email, "hash".to_string(), None, UserRole::Student);

    assert_eq!(user.status, UserStatus::Pending);
    assert_eq!(user.role, UserRole::Student);
    assert!(user.global_role.is_none());
    assert!(user.email_verified_at.is_none());
    assert!(user.institution_id.is_none());
    assert_eq!(user.terms_version, "1.0");
    assert!(!user.is_active());
}

#[test]
fn user_role_requires_institution_for_instructor_and_admin() {
    assert!(!UserRole::Student.requires_institution());
    assert!(UserRole::Instructor.requires_institution());
    assert!(UserRole::Admin.requires_institution());
}

#[test]
fn user_role_parses_known_values() {
    assert_eq!(UserRole::parse("student").unwrap(), UserRole::Student);
    assert_eq!(UserRole::parse("teacher").unwrap(), UserRole::Instructor);
    assert_eq!(UserRole::parse("instructor").unwrap(), UserRole::Instructor);
    assert_eq!(UserRole::parse("admin").unwrap(), UserRole::Admin);
}

#[test]
fn user_role_parse_rejects_unknown_value() {
    assert_eq!(UserRole::parse("parent").unwrap_err(), RoleError::Unknown);
    assert_eq!(UserRole::parse("guest").unwrap_err(), RoleError::Unknown);
}

#[test]
fn user_role_default_is_student() {
    let role: UserRole = Default::default();
    assert_eq!(role, UserRole::Student);
}
