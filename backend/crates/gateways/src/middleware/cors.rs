//! CORS middleware.

use axum::http::{
    header::{ACCEPT, AUTHORIZATION, CONTENT_TYPE, ORIGIN},
    Method,
};
use tower_http::cors::{AllowOrigin, CorsLayer};

fn split_scheme(value: &str) -> (Option<&str>, &str) {
    if let Some(rest) = value.strip_prefix("http://") {
        (Some("http"), rest)
    } else if let Some(rest) = value.strip_prefix("https://") {
        (Some("https"), rest)
    } else {
        (None, value)
    }
}

fn matches_wildcard_origin(origin: &str, pattern: &str) -> bool {
    let (origin_scheme, origin_host) = split_scheme(origin);
    let (pattern_scheme, pattern_host) = split_scheme(pattern);

    // If the pattern specifies a scheme, the origin must use the same scheme.
    if let Some(scheme) = pattern_scheme {
        if origin_scheme != Some(scheme) {
            return false;
        }
    }

    if let Some(suffix) = pattern_host.strip_prefix("*.") {
        origin_host
            .strip_suffix(suffix)
            .is_some_and(|prefix| prefix.ends_with('.'))
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
        assert!(!matches_wildcard_origin(
            "http://other.local:5174",
            "http://*.lvh.me:5174"
        ));
    }

    #[test]
    fn apex_domain_does_not_match_wildcard() {
        assert!(!matches_wildcard_origin(
            "http://lvh.me:5174",
            "http://*.lvh.me:5174"
        ));
        assert!(!matches_wildcard_origin(
            "https://klynt.dev",
            "https://*.klynt.dev"
        ));
    }

    #[test]
    fn scheme_mismatch_is_rejected() {
        assert!(!matches_wildcard_origin(
            "https://app.lvh.me:5174",
            "http://*.lvh.me:5174"
        ));
        assert!(!matches_wildcard_origin(
            "http://app.lvh.me:5174",
            "https://*.lvh.me:5174"
        ));
    }

    #[test]
    fn right_hand_boundary_attack_is_rejected() {
        assert!(!matches_wildcard_origin(
            "https://klynt.dev.evil.com",
            "https://*.klynt.dev"
        ));
    }

    #[test]
    fn left_hand_boundary_with_hyphen_is_rejected() {
        assert!(!matches_wildcard_origin(
            "https://evil-klynt.dev",
            "https://*.klynt.dev"
        ));
    }

    #[test]
    fn matches_wildcard_without_scheme_prefix() {
        assert!(matches_wildcard_origin("app.lvh.me:5174", "*.lvh.me:5174"));
    }
}
