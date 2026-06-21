//! Type conversions between auth_service types and legacy klynt-domain types.

use klynt_base::ctx::ExecutionContext;

/// Convert new execution context to legacy `Ctx`.
pub fn to_legacy_ctx(ctx: &ExecutionContext) -> klynt_base::ctx::Ctx {
    let actor_id = ctx.actor_id.map(klynt_common::util::UserId);
    klynt_base::ctx::Ctx {
        request_id: ctx.request.request_id.0,
        user_id: actor_id,
    }
}

/// Convert new `UserId` to legacy `UserId`.
pub fn to_legacy_user_id(user_id: klynt_common::util::UserId) -> klynt_common::util::UserId {
    klynt_common::util::UserId(user_id.inner())
}

/// Convert legacy `UserId` to new `UserId`.
pub fn from_legacy_user_id(user_id: klynt_common::util::UserId) -> klynt_common::util::UserId {
    klynt_common::util::UserId::from_uuid(user_id.0)
}

/// Convert legacy `Role` to shared `UserRole`.
pub fn from_legacy_role(role: klynt_common::util::Role) -> klynt_common::domain::UserRole {
    match role {
        klynt_common::util::Role::Student => klynt_common::domain::UserRole::Student,
        klynt_common::util::Role::Teacher => klynt_common::domain::UserRole::Instructor,
        klynt_common::util::Role::Admin => klynt_common::domain::UserRole::Admin,
        // Parent is not represented in the new shared domain; map to Student as least privilege.
        klynt_common::util::Role::Parent => klynt_common::domain::UserRole::Student,
    }
}

/// Convert legacy `UserStatus` to shared `UserStatus`.
pub fn from_legacy_status(
    status: klynt_common::util::UserStatus,
) -> klynt_common::domain::UserStatus {
    match status {
        klynt_common::util::UserStatus::PendingVerification => {
            klynt_common::domain::UserStatus::Pending
        }
        klynt_common::util::UserStatus::Active => klynt_common::domain::UserStatus::Active,
        klynt_common::util::UserStatus::Suspended => klynt_common::domain::UserStatus::Suspended,
    }
}

/// Convert legacy `User` to shared domain `User`.
pub fn from_legacy_user(user: klynt_persistence::repositories::User) -> klynt_common::domain::User {
    klynt_common::domain::User {
        id: from_legacy_user_id(user.id),
        email: klynt_common::domain::Email::new(user.email.as_str().to_string()),
        password_hash: user.password_hash,
        full_name: Some(user.name),
        status: from_legacy_status(user.status),
        role: from_legacy_role(user.role),
        created_at: user.created_at,
        updated_at: Some(user.created_at), // Legacy schema always maintains updated_at.
        deleted_at: None,
    }
}

#[cfg(test)]
mod tests {
    use chrono::Utc;
    use klynt_base::ctx::RequestContext;
    use klynt_common::domain::{UserRole, UserStatus};
    use klynt_common::util::UserId;

    use super::*;

    #[test]
    fn user_id_round_trips_through_legacy() {
        let original = UserId::new();
        let legacy = to_legacy_user_id(original);
        let roundtrip = from_legacy_user_id(legacy);
        assert_eq!(original, roundtrip);
    }

    #[test]
    fn ctx_preserves_request_id() {
        let request_id = klynt_base::ctx::RequestId::new();
        let ctx =
            ExecutionContext::new(klynt_base::ctx::RequestContext::with_request_id(request_id));
        let legacy = to_legacy_ctx(&ctx);
        assert_eq!(legacy.request_id, request_id.0);
        assert!(legacy.user_id.is_none());
    }

    #[test]
    fn ctx_maps_actor_to_user_id() {
        let user_id = UserId::new();
        let ctx = ExecutionContext::new(RequestContext::new())
            .with_actor(user_id.inner(), klynt_base::ctx::ActorType::User);
        let legacy = to_legacy_ctx(&ctx);
        assert_eq!(legacy.user_id, Some(to_legacy_user_id(user_id)));
    }

    #[test]
    fn maps_active_status() {
        assert_eq!(
            from_legacy_status(klynt_common::util::UserStatus::Active),
            UserStatus::Active
        );
    }

    #[test]
    fn maps_pending_verification_to_pending() {
        assert_eq!(
            from_legacy_status(klynt_common::util::UserStatus::PendingVerification),
            UserStatus::Pending
        );
    }

    #[test]
    fn maps_roles_to_shared_domain() {
        assert_eq!(
            from_legacy_role(klynt_common::util::Role::Student),
            UserRole::Student
        );
        assert_eq!(
            from_legacy_role(klynt_common::util::Role::Teacher),
            UserRole::Instructor
        );
        assert_eq!(
            from_legacy_role(klynt_common::util::Role::Admin),
            UserRole::Admin
        );
        assert_eq!(
            from_legacy_role(klynt_common::util::Role::Parent),
            UserRole::Student
        );
    }

    #[test]
    fn converts_legacy_user() {
        let user = klynt_persistence::repositories::User {
            id: klynt_common::util::UserId::new(),
            name: "Ada".to_string(),
            email: klynt_common::util::Email::parse("ada@example.com").unwrap(),
            role: klynt_common::util::Role::Student,
            institution_id: None,
            status: klynt_common::util::UserStatus::Active,
            email_verified_at: None,
            global_role: None,
            password_hash: "hash".to_string(),
            terms_accepted_at: Utc::now(),
            terms_version: "1.0".to_string(),
            created_at: Utc::now(),
        };

        let converted = from_legacy_user(user.clone());
        assert_eq!(converted.id.inner(), user.id.0);
        assert_eq!(converted.email.inner(), "ada@example.com");
        assert_eq!(converted.full_name, Some("Ada".to_string()));
        assert_eq!(converted.status, UserStatus::Active);
        assert_eq!(converted.role, UserRole::Student);
    }
}
