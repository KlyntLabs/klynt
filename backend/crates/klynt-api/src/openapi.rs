pub const OPENAPI_SPEC: &str = include_str!("openapi.yaml");

#[cfg(test)]
mod tests {
    use super::OPENAPI_SPEC;

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
            "/sessions",
        ] {
            assert!(
                OPENAPI_SPEC.contains(path),
                "OPENAPI_SPEC should contain endpoint {}",
                path
            );
        }
    }
}
