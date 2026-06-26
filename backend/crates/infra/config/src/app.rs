use http::HeaderValue;
use serde::Deserialize;

use super::{ApiConfig, ConfigError, RateLimiterConfig, SessionConfig, Validated};

/// Default Content-Security-Policy directive.
///
/// This is the canonical default used by the config loader and the gateway
/// security headers middleware. Keep it in sync with `.env.example`.
pub const DEFAULT_CONTENT_SECURITY_POLICY: &str = "default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'";

#[derive(Debug, Clone, Deserialize)]
pub struct AppConfig {
    pub api: ApiConfig,
    pub rate_limiter: RateLimiterConfig,
    pub session: SessionConfig,
    pub log_level: String,
    #[serde(default)]
    pub hsts_enabled: bool,
    pub database_url: Option<String>,
    pub redis_url: Option<String>,
    #[serde(default = "default_cookie_domain")]
    pub cookie_domain: String,
    #[serde(default)]
    pub cookie_secure: bool,
    #[serde(default)]
    pub csp_report_only: bool,
    #[serde(default = "default_csp_directive")]
    pub csp_directive: String,
    /// Public base URL used for links in emails (e.g. verification/reset links).
    /// When empty the gateway falls back to deriving it from the API host.
    #[serde(default)]
    pub base_url: String,
}

fn default_cookie_domain() -> String {
    String::new()
}

fn default_csp_directive() -> String {
    DEFAULT_CONTENT_SECURITY_POLICY.to_string()
}

impl Validated for AppConfig {
    fn validated(&self) -> Result<(), ConfigError> {
        self.api.validated()?;
        self.rate_limiter.validated()?;
        self.session.validated()?;

        HeaderValue::from_str(&self.csp_directive).map_err(|e| {
            ConfigError::InvalidCspDirective(format!(
                "csp_directive is not a valid HTTP header value: {e}"
            ))
        })?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn full_config_validates_all_parts() {
        let api = ApiConfig::default();
        let rate_limiter = RateLimiterConfig::default();
        let session = SessionConfig::default();
        let config = AppConfig {
            api,
            rate_limiter,
            session,
            log_level: "info".to_string(),
            hsts_enabled: false,
            database_url: Some("postgresql://localhost/db".to_string()),
            redis_url: Some("redis://localhost".to_string()),
            cookie_domain: String::new(),
            cookie_secure: false,
            csp_report_only: false,
            csp_directive: default_csp_directive(),
            base_url: String::new(),
        };
        assert!(config.validated().is_ok());
    }

    #[test]
    fn invalid_api_causes_full_validation_failure() {
        let api = ApiConfig {
            host: String::new(),
            ..Default::default()
        };
        let rate_limiter = RateLimiterConfig::default();
        let session = SessionConfig::default();
        let config = AppConfig {
            api,
            rate_limiter,
            session,
            log_level: "info".to_string(),
            hsts_enabled: false,
            database_url: None,
            redis_url: None,
            cookie_domain: String::new(),
            cookie_secure: false,
            csp_report_only: false,
            csp_directive: default_csp_directive(),
            base_url: String::new(),
        };
        assert!(config.validated().is_err());
    }

    #[test]
    fn invalid_csp_directive_is_rejected() {
        let mut config = AppConfig {
            api: ApiConfig::default(),
            rate_limiter: RateLimiterConfig::default(),
            session: SessionConfig::default(),
            log_level: "info".to_string(),
            hsts_enabled: false,
            database_url: Some("postgresql://localhost/db".to_string()),
            redis_url: Some("redis://localhost".to_string()),
            cookie_domain: String::new(),
            cookie_secure: false,
            csp_report_only: false,
            csp_directive: "\n".to_string(),
            base_url: String::new(),
        };
        assert!(matches!(
            config.validated(),
            Err(ConfigError::InvalidCspDirective(_))
        ));

        // Should validate after fixing the directive.
        config.csp_directive = default_csp_directive();
        assert!(config.validated().is_ok());
    }
}
