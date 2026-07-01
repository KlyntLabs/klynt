//! HTTP status-code mapping for service errors.

use axum::http::StatusCode;

pub(super) fn auth_error_status_code(error: &auth_service::AuthError) -> StatusCode {
    use auth_service::AuthError;
    use domain::DomainError;

    match error {
        AuthError::InvalidCredentials
        | AuthError::AccountInactive
        | AuthError::AccountLocked
        | AuthError::PasswordResetRequired => StatusCode::UNAUTHORIZED,
        AuthError::InvalidToken | AuthError::PasswordPolicy(_) => StatusCode::BAD_REQUEST,
        AuthError::UserNotFound => StatusCode::NOT_FOUND,
        AuthError::RateLimited => StatusCode::TOO_MANY_REQUESTS,
        AuthError::Forbidden => StatusCode::FORBIDDEN,
        AuthError::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        AuthError::Domain(DomainError::InvalidInput(_))
        | AuthError::Domain(DomainError::Validation(_))
        | AuthError::Domain(DomainError::InvalidEmail(_))
        | AuthError::Domain(DomainError::InvalidRole(_))
        | AuthError::Domain(DomainError::InvalidToken(_))
        | AuthError::Domain(DomainError::InvalidName(_))
        | AuthError::Domain(DomainError::InstitutionRequired(_))
        | AuthError::Domain(DomainError::TermsNotAccepted)
        | AuthError::Domain(DomainError::InvalidSessionToken)
        | AuthError::Domain(DomainError::InvalidTenantSlug) => StatusCode::BAD_REQUEST,
        AuthError::Domain(DomainError::NotFound(_)) => StatusCode::NOT_FOUND,
        AuthError::Domain(DomainError::Conflict(_)) => StatusCode::CONFLICT,
        AuthError::Domain(DomainError::NotPermitted(_))
        | AuthError::Domain(DomainError::AuthenticationRequired)
        | AuthError::Domain(DomainError::TenantLimitReached)
        | AuthError::Domain(DomainError::NotTenantMember) => StatusCode::FORBIDDEN,
        AuthError::Domain(DomainError::RateLimited) => StatusCode::TOO_MANY_REQUESTS,
        AuthError::Domain(DomainError::Internal(_)) => StatusCode::INTERNAL_SERVER_ERROR,
    }
}

pub(super) fn user_error_status_code(error: &user_service::UserError) -> StatusCode {
    use domain::DomainError;
    use user_service::UserError;

    match error {
        UserError::NotFound => StatusCode::NOT_FOUND,
        UserError::UserDeleted | UserError::CannotDeleteAdmin | UserError::SelfDeleteNotAllowed => {
            StatusCode::FORBIDDEN
        }
        UserError::InvalidPassword => StatusCode::UNAUTHORIZED,
        UserError::Validation(_) => StatusCode::BAD_REQUEST,
        UserError::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        UserError::Domain(DomainError::InvalidInput(_))
        | UserError::Domain(DomainError::Validation(_))
        | UserError::Domain(DomainError::InvalidEmail(_))
        | UserError::Domain(DomainError::InvalidRole(_))
        | UserError::Domain(DomainError::InvalidToken(_))
        | UserError::Domain(DomainError::InvalidName(_))
        | UserError::Domain(DomainError::InstitutionRequired(_))
        | UserError::Domain(DomainError::TermsNotAccepted)
        | UserError::Domain(DomainError::InvalidSessionToken)
        | UserError::Domain(DomainError::InvalidTenantSlug) => StatusCode::BAD_REQUEST,
        UserError::Domain(DomainError::NotFound(_)) => StatusCode::NOT_FOUND,
        UserError::Domain(DomainError::Conflict(_)) => StatusCode::CONFLICT,
        UserError::Domain(DomainError::NotPermitted(_))
        | UserError::Domain(DomainError::AuthenticationRequired)
        | UserError::Domain(DomainError::TenantLimitReached)
        | UserError::Domain(DomainError::NotTenantMember) => StatusCode::FORBIDDEN,
        UserError::Domain(DomainError::RateLimited) => StatusCode::TOO_MANY_REQUESTS,
        UserError::Domain(DomainError::Internal(_)) => StatusCode::INTERNAL_SERVER_ERROR,
    }
}

pub(super) fn tenant_error_status_code(error: &tenant_service::TenantError) -> StatusCode {
    use domain::DomainError;
    use tenant_service::TenantError;

    match error {
        TenantError::AuthenticationRequired => StatusCode::UNAUTHORIZED,
        TenantError::NotFound => StatusCode::NOT_FOUND,
        TenantError::NotMember | TenantError::NotAdmin | TenantError::NotOwner => {
            StatusCode::FORBIDDEN
        }
        TenantError::SessionCoordinator(_) => StatusCode::INTERNAL_SERVER_ERROR,
        TenantError::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        TenantError::Domain(DomainError::Validation(_)) => StatusCode::UNPROCESSABLE_ENTITY,
        TenantError::Domain(DomainError::InvalidInput(_))
        | TenantError::Domain(DomainError::InvalidEmail(_))
        | TenantError::Domain(DomainError::InvalidRole(_))
        | TenantError::Domain(DomainError::InvalidToken(_))
        | TenantError::Domain(DomainError::InvalidName(_))
        | TenantError::Domain(DomainError::InstitutionRequired(_))
        | TenantError::Domain(DomainError::TermsNotAccepted)
        | TenantError::Domain(DomainError::InvalidSessionToken)
        | TenantError::Domain(DomainError::InvalidTenantSlug) => StatusCode::BAD_REQUEST,
        TenantError::Domain(DomainError::NotFound(_)) => StatusCode::NOT_FOUND,
        TenantError::Domain(DomainError::Conflict(_)) => StatusCode::CONFLICT,
        TenantError::Domain(DomainError::NotPermitted(_))
        | TenantError::Domain(DomainError::AuthenticationRequired)
        | TenantError::Domain(DomainError::TenantLimitReached)
        | TenantError::Domain(DomainError::NotTenantMember) => StatusCode::FORBIDDEN,
        TenantError::Domain(DomainError::RateLimited) => StatusCode::TOO_MANY_REQUESTS,
        TenantError::Domain(DomainError::Internal(_)) => StatusCode::INTERNAL_SERVER_ERROR,
    }
}
