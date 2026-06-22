//! Gateway state and configuration.

pub mod services;

pub use services::Services;

use serde::Deserialize;

/// Gateway configuration.
#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    /// Service name for tracing.
    pub service_name: String,

    /// Bind address for HTTP server.
    pub bind_address: String,

    /// Base URL for email links.
    pub base_url: String,

    /// Database URL.
    pub database_url: String,

    /// Redis URL.
    pub redis_url: Option<String>,

    /// Rate limiter configuration.
    pub rate_limiter: config::RateLimiterConfig,

    /// Session lifetime configuration.
    pub session: config::SessionConfig,

    /// Whether to emit the HSTS security header.
    #[serde(default)]
    pub hsts_enabled: bool,

    /// Allowed CORS origins.
    #[serde(default)]
    pub allowed_origins: Vec<String>,

    /// Trusted proxy CIDRs or IPs used to resolve the real client IP from
    /// the `X-Forwarded-For` header.
    #[serde(default)]
    pub trusted_proxies: Vec<String>,

    /// Log level for tracing.
    #[serde(default = "default_log_level")]
    pub log_level: String,

    /// Domain attribute for session cookies. Leading dot enables cross-subdomain SSO.
    #[serde(default = "default_cookie_domain")]
    pub cookie_domain: String,

    /// Whether session cookies require HTTPS.
    #[serde(default)]
    pub cookie_secure: bool,

    /// When true, serve the CSP in `Content-Security-Policy-Report-Only`
    /// instead of enforcing it.
    #[serde(default)]
    pub csp_report_only: bool,

    /// Content Security Policy directive string.
    #[serde(default = "default_csp_directive")]
    pub csp_directive: String,
}

fn default_log_level() -> String {
    "info".to_string()
}

fn default_csp_directive() -> String {
    "default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'".to_string()
}

impl Default for Config {
    fn default() -> Self {
        Self {
            service_name: "api-gateway".to_string(),
            bind_address: "0.0.0.0:3000".to_string(),
            base_url: "https://klynt.edu".to_string(),
            database_url: String::new(),
            redis_url: None,
            rate_limiter: config::RateLimiterConfig::default(),
            session: config::SessionConfig::default(),
            hsts_enabled: false,
            allowed_origins: Vec::new(),
            trusted_proxies: Vec::new(),
            log_level: default_log_level(),
            cookie_domain: default_cookie_domain(),
            cookie_secure: false,
            csp_report_only: false,
            csp_directive: default_csp_directive(),
        }
    }
}

fn default_cookie_domain() -> String {
    ".klynt.edu".to_string()
}

impl Config {
    /// Load configuration from the environment using the existing Klynt config
    /// loader, then map it to the gateway-specific shape.
    pub fn from_env() -> Result<Self, config_crate::ConfigError> {
        let app_config = config::load_config()?;
        Ok(Self::from(app_config))
    }
}

impl From<config::AppConfig> for Config {
    fn from(config: config::AppConfig) -> Self {
        let bind_address = format!("{}:{}", config.api.host, config.api.port);
        let base_url = format!(
            "{}://{}",
            if config.api.host.contains("localhost") || config.api.host == "127.0.0.1" {
                "http"
            } else {
                "https"
            },
            config.api.host
        );

        Self {
            service_name: "api-gateway".to_string(),
            bind_address,
            base_url,
            database_url: config.database_url.unwrap_or_default(),
            redis_url: config.redis_url,
            rate_limiter: config.rate_limiter,
            session: config.session,
            hsts_enabled: config.hsts_enabled,
            allowed_origins: config.api.allowed_origins,
            trusted_proxies: config.api.trusted_proxies,
            log_level: config.log_level,
            cookie_domain: config.cookie_domain,
            cookie_secure: config.cookie_secure,
            csp_report_only: config.csp_report_only,
            csp_directive: config.csp_directive,
        }
    }
}
