//! Security headers middleware.

use axum::{extract::Request, http::HeaderValue, middleware::Next, response::Response};

/// Standard security headers applied to every response.
///
/// When `hsts_enabled` is `true`, the `Strict-Transport-Security` header is
/// added. This should only be enabled when the app is served behind a TLS
/// terminator.
///
/// `csp_report_only` controls whether the CSP is enforced or delivered as
/// `Content-Security-Policy-Report-Only`, which is useful for safely rolling
/// out a new policy without breaking the frontend.
///
/// The `csp_directive` value is expected to have been validated at config load
/// time, so no per-request parsing is performed here.
pub async fn security_headers(
    hsts_enabled: bool,
    csp_report_only: bool,
    csp_directive: HeaderValue,
    req: Request,
    next: Next,
) -> Response {
    let mut response = next.run(req).await;
    let headers = response.headers_mut();

    headers.insert(
        "X-Content-Type-Options",
        HeaderValue::from_static("nosniff"),
    );
    headers.insert("X-Frame-Options", HeaderValue::from_static("DENY"));
    headers.insert(
        "Referrer-Policy",
        HeaderValue::from_static("strict-origin-when-cross-origin"),
    );
    headers.insert(
        "Permissions-Policy",
        HeaderValue::from_static("geolocation=(), microphone=(), camera=()"),
    );

    let csp_header_name = if csp_report_only {
        "Content-Security-Policy-Report-Only"
    } else {
        "Content-Security-Policy"
    };
    headers.insert(csp_header_name, csp_directive);

    if hsts_enabled {
        headers.insert(
            "Strict-Transport-Security",
            HeaderValue::from_static("max-age=31536000; includeSubDomains"),
        );
    }

    response
}

#[cfg(test)]
mod tests {
    use axum::{
        body::Body, http::StatusCode, middleware, response::IntoResponse, routing::get, Router,
    };
    use tower::ServiceExt;

    use super::*;

    fn default_csp() -> HeaderValue {
        HeaderValue::from_static(config::DEFAULT_CONTENT_SECURITY_POLICY)
    }

    async fn handler() -> impl IntoResponse {
        (StatusCode::OK, "ok")
    }

    #[tokio::test]
    async fn security_headers_are_present() {
        let app = Router::new()
            .route("/", get(handler))
            .layer(middleware::from_fn(move |req, next| {
                security_headers(false, false, default_csp(), req, next)
            }));

        let response = app
            .oneshot(Request::builder().uri("/").body(Body::empty()).unwrap())
            .await
            .unwrap();

        assert_eq!(
            response.headers().get("X-Content-Type-Options").unwrap(),
            "nosniff"
        );
        assert_eq!(response.headers().get("X-Frame-Options").unwrap(), "DENY");
        assert_eq!(
            response.headers().get("Referrer-Policy").unwrap(),
            "strict-origin-when-cross-origin"
        );
        assert!(response
            .headers()
            .get("Permissions-Policy")
            .unwrap()
            .to_str()
            .unwrap()
            .contains("geolocation=()"));
        assert_eq!(
            response
                .headers()
                .get("Content-Security-Policy")
                .unwrap()
                .to_str()
                .unwrap(),
            config::DEFAULT_CONTENT_SECURITY_POLICY
        );
        assert!(response
            .headers()
            .get("Strict-Transport-Security")
            .is_none());
    }

    #[tokio::test]
    async fn hsts_header_added_when_enabled() {
        let app = Router::new()
            .route("/", get(handler))
            .layer(middleware::from_fn(move |req, next| {
                security_headers(true, false, default_csp(), req, next)
            }));

        let response = app
            .oneshot(Request::builder().uri("/").body(Body::empty()).unwrap())
            .await
            .unwrap();

        assert_eq!(
            response.headers().get("Strict-Transport-Security").unwrap(),
            "max-age=31536000; includeSubDomains"
        );
    }

    #[tokio::test]
    async fn csp_report_only_header_is_set_when_enabled() {
        let app = Router::new()
            .route("/", get(handler))
            .layer(middleware::from_fn(move |req, next| {
                security_headers(false, true, default_csp(), req, next)
            }));

        let response = app
            .oneshot(Request::builder().uri("/").body(Body::empty()).unwrap())
            .await
            .unwrap();

        assert_eq!(
            response
                .headers()
                .get("Content-Security-Policy-Report-Only")
                .unwrap()
                .to_str()
                .unwrap(),
            config::DEFAULT_CONTENT_SECURITY_POLICY
        );
        assert!(response.headers().get("Content-Security-Policy").is_none());
    }
}
