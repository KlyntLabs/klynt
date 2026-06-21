//! OpenAPI specification endpoint.

use axum::{
    http::{header, StatusCode},
    response::{IntoResponse, Response},
};

/// OpenAPI specification document.
pub const OPENAPI_SPEC: &str = include_str!("../openapi.yaml");

/// GET /openapi.json
///
/// Returns the OpenAPI specification as JSON.
pub async fn openapi_spec() -> Response {
    // The YAML source is valid JSON-compatible YAML, so we can serve it as
    // JSON for broad tooling compatibility.
    (
        StatusCode::OK,
        [(header::CONTENT_TYPE, "application/json")],
        OPENAPI_SPEC,
    )
        .into_response()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn openapi_spec_is_non_empty() {
        assert!(!OPENAPI_SPEC.is_empty(), "OPENAPI_SPEC should not be empty");
    }

    #[test]
    fn openapi_spec_contains_expected_auth_endpoints() {
        for path in [
            "/auth/register",
            "/auth/verify-email",
            "/auth/request-password-reset",
            "/auth/reset-password",
            "/auth/login",
            "/auth/logout",
        ] {
            assert!(
                OPENAPI_SPEC.contains(path),
                "OPENAPI_SPEC should contain endpoint {}",
                path
            );
        }
    }
}
