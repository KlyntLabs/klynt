//! Gateway error types.

mod mapping;

use axum::{
    http::StatusCode,
    response::{IntoResponse, Json, Response},
};
use mapping::{auth_error_status_code, tenant_error_status_code, user_error_status_code};

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
    fn user_error_status_codes() {
        let cases: Vec<(GatewayError, StatusCode)> = vec![
            (
                GatewayError::from(user_service::UserError::NotFound),
                StatusCode::NOT_FOUND,
            ),
            (
                GatewayError::from(user_service::UserError::UserDeleted),
                StatusCode::FORBIDDEN,
            ),
            (
                GatewayError::from(user_service::UserError::InvalidPassword),
                StatusCode::UNAUTHORIZED,
            ),
            (
                GatewayError::from(user_service::UserError::Validation("bad".to_string())),
                StatusCode::BAD_REQUEST,
            ),
            (
                GatewayError::from(user_service::UserError::Internal("oops".to_string())),
                StatusCode::INTERNAL_SERVER_ERROR,
            ),
            (
                GatewayError::from(user_service::UserError::Domain(
                    domain::DomainError::Conflict("duplicate".to_string()),
                )),
                StatusCode::CONFLICT,
            ),
            (
                GatewayError::from(user_service::UserError::Domain(
                    domain::DomainError::NotFound("missing".to_string()),
                )),
                StatusCode::NOT_FOUND,
            ),
        ];

        for (error, expected) in cases {
            let response = error.into_response();
            assert_eq!(response.status(), expected);
        }
    }

    #[test]
    fn tenant_error_status_codes() {
        let cases: Vec<(GatewayError, StatusCode)> = vec![
            (
                GatewayError::from(tenant_service::TenantError::AuthenticationRequired),
                StatusCode::UNAUTHORIZED,
            ),
            (
                GatewayError::from(tenant_service::TenantError::NotFound),
                StatusCode::NOT_FOUND,
            ),
            (
                GatewayError::from(tenant_service::TenantError::NotMember),
                StatusCode::FORBIDDEN,
            ),
            (
                GatewayError::from(tenant_service::TenantError::Domain(
                    domain::DomainError::TenantLimitReached,
                )),
                StatusCode::FORBIDDEN,
            ),
            (
                GatewayError::from(tenant_service::TenantError::Domain(
                    domain::DomainError::NotFound("missing".to_string()),
                )),
                StatusCode::NOT_FOUND,
            ),
            (
                GatewayError::from(tenant_service::TenantError::Internal("oops".to_string())),
                StatusCode::INTERNAL_SERVER_ERROR,
            ),
            (
                GatewayError::from(tenant_service::TenantError::Session(
                    base::ports::session::SessionError::Forbidden,
                )),
                StatusCode::FORBIDDEN,
            ),
            (
                GatewayError::from(tenant_service::TenantError::Session(
                    base::ports::session::SessionError::NotFound,
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
