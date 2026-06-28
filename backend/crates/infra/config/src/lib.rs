//! Configuration types and loading.

pub mod api;
pub mod app;
pub mod rate_limiter;
pub mod session;

pub use api::ApiConfig;
pub use app::{AppConfig, DEFAULT_CONTENT_SECURITY_POLICY};
pub use rate_limiter::RateLimiterConfig;
pub use session::SessionConfig;

use config_crate::{Config, ConfigError as LoaderConfigError, Environment, File};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ConfigError {
    #[error("invalid host: {0}")]
    InvalidHost(String),

    #[error("invalid port: {0}")]
    InvalidPort(String),

    #[error("invalid origin URL: {0}")]
    InvalidOrigin(String),

    #[error("invalid trusted proxy: {0}")]
    InvalidTrustedProxy(String),

    #[error("rate limiter max_requests must be at least 1")]
    InvalidMaxRequests,

    #[error("rate limiter window must be at least 1 second")]
    InvalidWindow,

    #[error("invalid session duration: {0}")]
    InvalidSessionDuration(String),

    #[error("invalid CSP directive: {0}")]
    InvalidCspDirective(String),
}

/// Trait for validated configuration.
pub trait Validated {
    fn validated(&self) -> Result<(), ConfigError>;
}

/// Parse a list of trusted proxy strings into `IpNet` values.
///
/// Accepts bare IP addresses (treated as host routes) and CIDR notation for
/// both IPv4 and IPv6.
pub fn parse_trusted_proxies(proxies: &[String]) -> Result<Vec<ipnet::IpNet>, ConfigError> {
    proxies
        .iter()
        .map(|entry| {
            if let Ok(net) = entry.parse::<ipnet::IpNet>() {
                Ok(net)
            } else if let Ok(ip) = entry.parse::<std::net::IpAddr>() {
                Ok(ipnet::IpNet::from(ip))
            } else {
                Err(ConfigError::InvalidTrustedProxy(format!(
                    "'{}' is not a valid IP or CIDR",
                    entry
                )))
            }
        })
        .collect()
}

/// Load application configuration from files and environment.
pub fn load_config() -> Result<AppConfig, LoaderConfigError> {
    let base_path = std::env::current_dir().expect("failed to determine current directory");
    let config_dir = base_path.join("config");

    let api_default = ApiConfig::default();
    let rl_default = RateLimiterConfig::default();
    let session_default = SessionConfig::default();

    let config = Config::builder()
        .add_source(File::from(config_dir.join("default.toml")).required(false))
        .add_source(File::from(config_dir.join("local.toml")).required(false))
        .add_source(
            Environment::with_prefix("KLYNT")
                .prefix_separator("_")
                .separator("__")
                .try_parsing(true),
        )
        .set_default("api.host", api_default.host)?
        .set_default("api.port", api_default.port)?
        .set_default("api.allowed_origins", api_default.allowed_origins)?
        .set_default("api.trusted_proxies", Vec::<String>::new())?
        .set_default("rate_limiter.enabled", rl_default.enabled)?
        .set_default("rate_limiter.max_requests", rl_default.max_requests as u64)?
        .set_default("rate_limiter.window_seconds", rl_default.window_seconds)?
        .set_default(
            "session.session_duration_secs",
            session_default.session_duration_secs,
        )?
        .set_default(
            "session.long_session_duration_secs",
            session_default.long_session_duration_secs,
        )?
        .set_default(
            "session.refresh_duration_secs",
            session_default.refresh_duration_secs,
        )?
        .set_default("log_level", "info")?
        .set_default("hsts_enabled", false)?
        .set_default("database_url", None::<String>)?
        .set_default("redis_url", None::<String>)?
        .set_default("cookie_domain", "")?
        .set_default("cookie_secure", false)?
        .set_default("csp_report_only", false)?
        .set_default("csp_directive", DEFAULT_CONTENT_SECURITY_POLICY)?
        .set_default("base_url", "")?
        .set_default("session_sync_enabled", true)?
        .build()?;

    let app_config: AppConfig = config.try_deserialize()?;
    app_config
        .validated()
        .map_err(|e| LoaderConfigError::Message(e.to_string()))?;

    Ok(app_config)
}
