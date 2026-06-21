//! Security headers middleware.

use axum::{extract::Request, http::HeaderValue, middleware::Next, response::Response};

/// Standard security headers applied to every response.
///
/// When `hsts_enabled` is `true`, the `Strict-Transport-Security` header is
/// added. This should only be enabled when the app is served behind a TLS
/// terminator.
pub async fn security_headers(hsts_enabled: bool, req: Request, next: Next) -> Response {
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

    async fn handler() -> impl IntoResponse {
        (StatusCode::OK, "ok")
    }

    #[tokio::test]
    async fn security_headers_are_present() {
        let app = Router::new()
            .route("/", get(handler))
            .layer(middleware::from_fn(move |req, next| {
                security_headers(false, req, next)
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
                security_headers(true, req, next)
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
}
