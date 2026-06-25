//! CORS middleware.

use axum::http::{
    header::{ACCEPT, AUTHORIZATION, CONTENT_TYPE, ORIGIN},
    Method,
};
use tower_http::cors::{AllowOrigin, CorsLayer};

fn matches_wildcard_origin(origin: &str, pattern: &str) -> bool {
    let origin_host = origin
        .strip_prefix("http://")
        .or_else(|| origin.strip_prefix("https://"))
        .unwrap_or(origin);
    let pattern_host = pattern
        .strip_prefix("http://")
        .or_else(|| pattern.strip_prefix("https://"))
        .unwrap_or(pattern);

    if let Some(suffix) = pattern_host.strip_prefix("*.") {
        origin_host == suffix || origin_host.ends_with(&format!(".{}", suffix))
    } else {
        origin_host == pattern_host
    }
}

/// Build a CORS layer from the gateway configuration.
///
/// If `allowed_origins` is empty, the layer allows any origin without
/// credentials. In production, origins should be explicitly configured and
/// credentials enabled.
pub fn cors_layer(allowed_origins: &[String]) -> CorsLayer {
    let methods = [
        Method::GET,
        Method::POST,
        Method::PUT,
        Method::PATCH,
        Method::DELETE,
        Method::OPTIONS,
    ];

    if allowed_origins.is_empty() {
        return CorsLayer::new()
            .allow_methods(methods)
            .allow_headers([AUTHORIZATION, CONTENT_TYPE, ACCEPT, ORIGIN])
            .allow_origin(AllowOrigin::any());
    }

    let patterns = allowed_origins.to_vec();
    CorsLayer::new()
        .allow_methods(methods)
        .allow_headers([AUTHORIZATION, CONTENT_TYPE, ACCEPT, ORIGIN])
        .allow_origin(AllowOrigin::predicate(move |origin, _request_head| {
            let origin_str = origin.to_str().unwrap_or("");
            patterns
                .iter()
                .any(|pattern| matches_wildcard_origin(origin_str, pattern))
        }))
        .allow_credentials(true)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn matches_exact_origin() {
        assert!(matches_wildcard_origin(
            "http://localhost:5174",
            "http://localhost:5174"
        ));
        assert!(!matches_wildcard_origin(
            "http://localhost:5173",
            "http://localhost:5174"
        ));
    }

    #[test]
    fn matches_wildcard_subdomain() {
        assert!(matches_wildcard_origin(
            "http://app.lvh.me:5174",
            "http://*.lvh.me:5174"
        ));
        assert!(matches_wildcard_origin(
            "http://deep.sub.lvh.me:5174",
            "http://*.lvh.me:5174"
        ));
        assert!(matches_wildcard_origin(
            "http://lvh.me:5174",
            "http://*.lvh.me:5174"
        ));
        assert!(!matches_wildcard_origin(
            "http://other.local:5174",
            "http://*.lvh.me:5174"
        ));
    }

    #[test]
    fn matches_wildcard_without_scheme_prefix() {
        assert!(matches_wildcard_origin("app.lvh.me:5174", "*.lvh.me:5174"));
    }
}
