//! Gateway error types.

use axum::{
    http::StatusCode,
    response::{IntoResponse, Json, Response},
};

/// Gateway error type.
#[derive(thiserror::Error, Debug)]
pub enum GatewayError {
    #[error("Bad request: {0}")]
    BadRequest(String),

    #[error("Unauthorized: {0}")]
    Unauthorized(String),

    #[error("Forbidden: {0}")]
    Forbidden(String),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Conflict: {0}")]
    Conflict(String),

    #[error("Configuration error: {0}")]
    Configuration(String),

    #[error("Internal error: {0}")]
    Internal(String),

    #[error("Service unavailable: {0}")]
    ServiceUnavailable(String),

    #[error("Rate limit exceeded")]
    RateLimited(u32),

    /// Auth service errors.
    #[error("Auth error: {0}")]
    Auth(#[from] auth_service::AuthError),

    /// User service errors.
    #[error("User error: {0}")]
    User(#[from] user_service::UserError),

    /// Tenant service errors.
    #[error("Tenant error: {0}")]
    Tenant(#[from] tenant_service::TenantError),
}

fn auth_error_status_code(error: &auth_service::AuthError) -> StatusCode {
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

fn user_error_status_code(error: &user_service::UserError) -> StatusCode {
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

fn tenant_error_status_code(error: &tenant_service::TenantError) -> StatusCode {
    use domain::DomainError;
    use tenant_service::TenantError;

    match error {
        TenantError::AuthenticationRequired => StatusCode::UNAUTHORIZED,
        TenantError::NotFound => StatusCode::NOT_FOUND,
        TenantError::NotMember | TenantError::NotAdmin | TenantError::NotOwner => {
            StatusCode::FORBIDDEN
        }
        TenantError::Internal(_) | TenantError::Session(_) => StatusCode::INTERNAL_SERVER_ERROR,
        TenantError::Domain(DomainError::InvalidInput(_))
        | TenantError::Domain(DomainError::Validation(_))
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

impl GatewayError {
    /// Construct a bad request error.
    pub fn bad_request(msg: impl Into<String>) -> Self {
        Self::BadRequest(msg.into())
    }

    /// Construct an internal error.
    pub fn internal(msg: impl Into<String>) -> Self {
        Self::Internal(msg.into())
    }

    /// Construct a configuration error.
    pub fn configuration(msg: impl Into<String>) -> Self {
        Self::Configuration(msg.into())
    }

    fn status_code(&self) -> StatusCode {
        match self {
            Self::BadRequest(_) => StatusCode::BAD_REQUEST,
            Self::Unauthorized(_) => StatusCode::UNAUTHORIZED,
            Self::Forbidden(_) => StatusCode::FORBIDDEN,
            Self::NotFound(_) => StatusCode::NOT_FOUND,
            Self::Conflict(_) => StatusCode::CONFLICT,
            Self::Configuration(_) => StatusCode::INTERNAL_SERVER_ERROR,
            Self::ServiceUnavailable(_) => StatusCode::SERVICE_UNAVAILABLE,
            Self::RateLimited(_) => StatusCode::TOO_MANY_REQUESTS,
            Self::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
            Self::Auth(auth_error) => auth_error_status_code(auth_error),
            Self::User(user_error) => user_error_status_code(user_error),
            Self::Tenant(tenant_error) => tenant_error_status_code(tenant_error),
        }
    }

    fn error_code(&self) -> &'static str {
        match self {
            Self::BadRequest(_) => "BAD_REQUEST",
            Self::Unauthorized(_) => "UNAUTHORIZED",
            Self::Forbidden(_) => "FORBIDDEN",
            Self::NotFound(_) => "NOT_FOUND",
            Self::Conflict(_) => "CONFLICT",
            Self::Configuration(_) => "CONFIGURATION_ERROR",
            Self::ServiceUnavailable(_) => "SERVICE_UNAVAILABLE",
            Self::RateLimited(_) => "RATE_LIMITED",
            Self::Internal(_) => "INTERNAL_SERVER_ERROR",
            Self::Auth(auth_error) => auth_error.error_code(),
            Self::User(user_error) => user_error.error_code(),
            Self::Tenant(tenant_error) => tenant_error.error_code(),
        }
    }
}

impl IntoResponse for GatewayError {
    fn into_response(self) -> Response {
        if let Self::RateLimited(retry_after) = self {
            let body = serde_json::json!({
                "success": false,
                "error": self.to_string(),
                "code": self.error_code(),
                "retry_after": retry_after,
            });
            return (
                StatusCode::TOO_MANY_REQUESTS,
                [(axum::http::header::RETRY_AFTER, retry_after.to_string())],
                Json(body),
            )
                .into_response();
        }

        let status = self.status_code();
        let body = serde_json::json!({
            "success": false,
            "error": self.to_string(),
            "code": self.error_code(),
        });

        (status, Json(body)).into_response()
    }
}

impl From<anyhow::Error> for GatewayError {
    fn from(e: anyhow::Error) -> Self {
        Self::Internal(e.to_string())
    }
}

/// Result type for gateway operations.
pub type GatewayResult<T> = Result<T, GatewayError>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn gateway_error_status_codes() {
        let cases: Vec<(GatewayError, StatusCode)> = vec![
            (GatewayError::bad_request("bad"), StatusCode::BAD_REQUEST),
            (
                GatewayError::Unauthorized("unauthorized".to_string()),
                StatusCode::UNAUTHORIZED,
            ),
            (
                GatewayError::Forbidden("forbidden".to_string()),
                StatusCode::FORBIDDEN,
            ),
            (
                GatewayError::NotFound("not found".to_string()),
                StatusCode::NOT_FOUND,
            ),
            (
                GatewayError::Conflict("conflict".to_string()),
                StatusCode::CONFLICT,
            ),
            (
                GatewayError::configuration("config"),
                StatusCode::INTERNAL_SERVER_ERROR,
            ),
            (
                GatewayError::ServiceUnavailable("unavailable".to_string()),
                StatusCode::SERVICE_UNAVAILABLE,
            ),
            (GatewayError::RateLimited(60), StatusCode::TOO_MANY_REQUESTS),
            (
                GatewayError::internal("internal"),
                StatusCode::INTERNAL_SERVER_ERROR,
            ),
            (
                GatewayError::from(auth_service::AuthError::InvalidCredentials),
                StatusCode::UNAUTHORIZED,
            ),
            (
                GatewayError::from(auth_service::AuthError::AccountInactive),
                StatusCode::UNAUTHORIZED,
            ),
            (
                GatewayError::from(auth_service::AuthError::AccountLocked),
                StatusCode::UNAUTHORIZED,
            ),
            (
                GatewayError::from(auth_service::AuthError::PasswordResetRequired),
                StatusCode::UNAUTHORIZED,
            ),
            (
                GatewayError::from(auth_service::AuthError::InvalidToken),
                StatusCode::BAD_REQUEST,
            ),
            (
                GatewayError::from(auth_service::AuthError::PasswordPolicy(
                    "too short".to_string(),
                )),
                StatusCode::BAD_REQUEST,
            ),
            (
                GatewayError::from(auth_service::AuthError::UserNotFound),
                StatusCode::NOT_FOUND,
            ),
            (
                GatewayError::from(auth_service::AuthError::RateLimited),
                StatusCode::TOO_MANY_REQUESTS,
            ),
            (
                GatewayError::from(auth_service::AuthError::Internal("oops".to_string())),
                StatusCode::INTERNAL_SERVER_ERROR,
            ),
            (
                GatewayError::from(auth_service::AuthError::Domain(
                    domain::DomainError::InvalidInput("input".to_string()),
                )),
                StatusCode::BAD_REQUEST,
            ),
            (
                GatewayError::from(auth_service::AuthError::Domain(
                    domain::DomainError::Validation("invalid".to_string()),
                )),
                StatusCode::BAD_REQUEST,
            ),
            (
                GatewayError::from(auth_service::AuthError::Domain(
                    domain::DomainError::NotFound("missing".to_string()),
                )),
                StatusCode::NOT_FOUND,
            ),
            (
                GatewayError::from(auth_service::AuthError::Domain(
                    domain::DomainError::Conflict("duplicate".to_string()),
                )),
                StatusCode::CONFLICT,
            ),
            (
                GatewayError::from(auth_service::AuthError::Domain(
                    domain::DomainError::NotPermitted("no".to_string()),
                )),
                StatusCode::FORBIDDEN,
            ),
            (
                GatewayError::from(auth_service::AuthError::Domain(
                    domain::DomainError::Internal("domain".to_string()),
                )),
                StatusCode::INTERNAL_SERVER_ERROR,
            ),
        ];

        for (error, expected) in cases {
            let response = error.into_response();
            assert_eq!(response.status(), expected);
        }
    }

    #[test]
    fn rate_limited_error_includes_retry_after_header_and_body() {
        let response = GatewayError::RateLimited(90).into_response();

        assert_eq!(response.status(), StatusCode::TOO_MANY_REQUESTS);
        assert_eq!(
            response
                .headers()
                .get(axum::http::header::RETRY_AFTER)
                .unwrap()
                .to_str()
                .unwrap(),
            "90"
        );
    }

    #[test]
    fn anyhow_error_maps_to_internal() {
        let error = anyhow::anyhow!("something went wrong");
        let gateway_error: GatewayError = error.into();
        assert!(matches!(gateway_error, GatewayError::Internal(_)));
    }
}
