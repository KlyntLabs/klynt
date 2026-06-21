//! Type conversions between user_service types and legacy klynt-domain types.

use klynt_base::ctx::ExecutionContext;

use crate::error::UserError;

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

/// Convert shared `UserRole` to legacy `Role`.
pub fn to_legacy_role(role: klynt_common::domain::UserRole) -> klynt_common::util::Role {
    match role {
        klynt_common::domain::UserRole::Student => klynt_common::util::Role::Student,
        klynt_common::domain::UserRole::Instructor => klynt_common::util::Role::Teacher,
        klynt_common::domain::UserRole::Admin => klynt_common::util::Role::Admin,
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

/// Convert shared `UserStatus` to legacy `UserStatus`.
pub fn to_legacy_status(
    status: klynt_common::domain::UserStatus,
) -> klynt_common::util::UserStatus {
    match status {
        klynt_common::domain::UserStatus::Active => klynt_common::util::UserStatus::Active,
        klynt_common::domain::UserStatus::Inactive => klynt_common::util::UserStatus::Suspended,
        klynt_common::domain::UserStatus::Suspended => klynt_common::util::UserStatus::Suspended,
        klynt_common::domain::UserStatus::Pending => {
            klynt_common::util::UserStatus::PendingVerification
        }
    }
}

/// Convert legacy `User` to user_service domain `User`.
pub fn from_legacy_user(user: klynt_persistence::repositories::User) -> crate::domain::User {
    crate::domain::User {
        id: from_legacy_user_id(user.id),
        email: klynt_common::domain::Email::new(user.email.as_str().to_string()),
        full_name: if user.name.is_empty() {
            None
        } else {
            Some(user.name)
        },
        password_hash: user.password_hash,
        status: from_legacy_status(user.status),
        role: from_legacy_role(user.role),
        created_at: user.created_at,
        updated_at: Some(user.created_at), // Legacy schema always maintains updated_at.
        deleted_at: None,
    }
}

/// Convert user_service domain `User` to legacy `User`.
pub fn to_legacy_user(
    user: crate::domain::User,
) -> Result<klynt_persistence::repositories::User, UserError> {
    Ok(klynt_persistence::repositories::User {
        id: to_legacy_user_id(user.id),
        name: user.full_name.unwrap_or_default(),
        email: klynt_common::util::Email::parse(user.email.inner()).map_err(|e| {
            UserError::Domain(klynt_common::domain::DomainError::InvalidInput(
                e.to_string(),
            ))
        })?,
        role: to_legacy_role(user.role),
        institution_id: None,
        status: to_legacy_status(user.status),
        email_verified_at: None,
        global_role: None,
        password_hash: user.password_hash,
        terms_accepted_at: user.created_at,
        terms_version: "1.0".to_string(),
        created_at: user.created_at,
    })
}

pub fn map_legacy_error(err: klynt_common::domain::DomainError) -> UserError {
    UserError::Domain(klynt_common::domain::DomainError::Internal(err.to_string()))
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
    fn maps_suspended_to_suspended() {
        assert_eq!(
            from_legacy_status(klynt_common::util::UserStatus::Suspended),
            UserStatus::Suspended
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
    fn to_legacy_role_round_trips() {
        for role in [UserRole::Student, UserRole::Instructor, UserRole::Admin] {
            let legacy = to_legacy_role(role);
            assert_eq!(from_legacy_role(legacy), role);
        }
    }

    #[test]
    fn to_legacy_status_round_trips() {
        for status in [
            UserStatus::Active,
            UserStatus::Suspended,
            UserStatus::Pending,
        ] {
            let legacy = to_legacy_status(status);
            assert_eq!(from_legacy_status(legacy), status);
        }
    }

    #[test]
    fn inactive_maps_to_legacy_suspended() {
        let legacy = to_legacy_status(UserStatus::Inactive);
        assert_eq!(legacy, klynt_common::util::UserStatus::Suspended);
        assert_eq!(from_legacy_status(legacy), UserStatus::Suspended);
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
        assert!(converted.deleted_at.is_none());
    }

    #[test]
    fn to_legacy_user_round_trips() {
        let user = crate::domain::User {
            id: UserId::new(),
            email: klynt_common::domain::Email::new("ada@example.com".to_string()),
            full_name: Some("Ada".to_string()),
            password_hash: "hash".to_string(),
            status: UserStatus::Active,
            role: UserRole::Student,
            created_at: Utc::now(),
            updated_at: None,
            deleted_at: None,
        };

        let legacy = to_legacy_user(user.clone()).unwrap();
        let roundtrip = from_legacy_user(legacy);
        assert_eq!(roundtrip.id, user.id);
        assert_eq!(roundtrip.email.inner(), user.email.inner());
        assert_eq!(roundtrip.full_name, user.full_name);
        assert_eq!(roundtrip.status, user.status);
        assert_eq!(roundtrip.role, user.role);
    }

    #[test]
    fn empty_name_maps_to_none_full_name() {
        let user = klynt_persistence::repositories::User {
            id: klynt_common::util::UserId::new(),
            name: "".to_string(),
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

        let converted = from_legacy_user(user);
        assert_eq!(converted.full_name, None);
    }

    #[test]
    fn map_legacy_error_wraps_domain_error() {
        let legacy = klynt_common::domain::DomainError::NotFound("not found".to_string());
        let err = map_legacy_error(legacy);
        assert!(matches!(
            err,
            UserError::Domain(klynt_common::domain::DomainError::Internal(_))
        ));
    }
}
