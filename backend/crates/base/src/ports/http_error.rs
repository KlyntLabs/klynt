//! HTTP error mapping port.
//!
//! This trait lets domain and service errors declare their HTTP
//! representation without depending on the gateway layer.

use axum::http::StatusCode;

/// Maps an error to an HTTP response classification.
///
/// Implementations are provided for `domain::DomainError`
/// and expected to be provided by service crates for their own error types.
/// The gateway uses these classifications when building responses.
pub trait HttpError {
    /// HTTP status code that best represents this error.
    fn status_code(&self) -> StatusCode {
        StatusCode::INTERNAL_SERVER_ERROR
    }

    /// Stable machine-readable error code used in JSON responses.
    fn error_code(&self) -> &'static str {
        "INTERNAL_SERVER_ERROR"
    }
}

impl HttpError for domain::DomainError {
    fn status_code(&self) -> StatusCode {
        match self {
            Self::InvalidInput(_)
            | Self::Validation(_)
            | Self::InvalidEmail(_)
            | Self::InvalidRole(_)
            | Self::InvalidToken(_)
            | Self::InvalidName(_)
            | Self::InstitutionRequired(_)
            | Self::TermsNotAccepted
            | Self::InvalidSessionToken => StatusCode::BAD_REQUEST,
            Self::NotFound(_) => StatusCode::NOT_FOUND,
            Self::Conflict(_) => StatusCode::CONFLICT,
            Self::NotPermitted(_) | Self::AuthenticationRequired => StatusCode::FORBIDDEN,
            Self::TenantLimitReached | Self::NotTenantMember => StatusCode::FORBIDDEN,
            Self::InvalidTenantSlug => StatusCode::BAD_REQUEST,
            Self::RateLimited => StatusCode::TOO_MANY_REQUESTS,
            Self::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    fn error_code(&self) -> &'static str {
        match self {
            Self::InvalidInput(_) => "INVALID_INPUT",
            Self::Validation(_) => "VALIDATION_ERROR",
            Self::InvalidEmail(_) => "INVALID_EMAIL",
            Self::InvalidRole(_) => "INVALID_ROLE",
            Self::InvalidToken(_) => "INVALID_TOKEN",
            Self::InvalidName(_) => "INVALID_NAME",
            Self::InstitutionRequired(_) => "INSTITUTION_REQUIRED",
            Self::TermsNotAccepted => "TERMS_NOT_ACCEPTED",
            Self::InvalidSessionToken => "INVALID_SESSION_TOKEN",
            Self::NotFound(_) => "NOT_FOUND",
            Self::Conflict(_) => "CONFLICT",
            Self::NotPermitted(_) => "FORBIDDEN",
            Self::AuthenticationRequired => "AUTHENTICATION_REQUIRED",
            Self::TenantLimitReached => "TENANT_LIMIT_REACHED",
            Self::NotTenantMember => "NOT_TENANT_MEMBER",
            Self::InvalidTenantSlug => "INVALID_TENANT_SLUG",
            Self::RateLimited => "RATE_LIMITED",
            Self::Internal(_) => "INTERNAL_SERVER_ERROR",
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use domain::DomainError;

    #[test]
    fn domain_error_status_codes() {
        let cases: Vec<(DomainError, StatusCode)> = vec![
            (
                DomainError::InvalidInput("bad".into()),
                StatusCode::BAD_REQUEST,
            ),
            (
                DomainError::NotFound("missing".into()),
                StatusCode::NOT_FOUND,
            ),
            (DomainError::Conflict("dup".into()), StatusCode::CONFLICT),
            (
                DomainError::NotPermitted("no".into()),
                StatusCode::FORBIDDEN,
            ),
            (DomainError::RateLimited, StatusCode::TOO_MANY_REQUESTS),
            (
                DomainError::internal_msg("oops"),
                StatusCode::INTERNAL_SERVER_ERROR,
            ),
            (DomainError::TenantLimitReached, StatusCode::FORBIDDEN),
            (DomainError::NotTenantMember, StatusCode::FORBIDDEN),
            (DomainError::InvalidTenantSlug, StatusCode::BAD_REQUEST),
        ];

        for (err, expected) in cases {
            assert_eq!(err.status_code(), expected);
        }
    }

    #[test]
    fn default_http_error_is_internal() {
        struct Opaque;
        impl HttpError for Opaque {}

        assert_eq!(Opaque.status_code(), StatusCode::INTERNAL_SERVER_ERROR);
        assert_eq!(Opaque.error_code(), "INTERNAL_SERVER_ERROR");
    }
}
