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

    /// Whether to emit the HSTS security header.
    #[serde(default)]
    pub hsts_enabled: bool,

    /// Allowed CORS origins.
    #[serde(default)]
    pub allowed_origins: Vec<String>,

    /// Log level for tracing.
    #[serde(default = "default_log_level")]
    pub log_level: String,
}

fn default_log_level() -> String {
    "info".to_string()
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
            hsts_enabled: false,
            allowed_origins: Vec::new(),
            log_level: default_log_level(),
        }
    }
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
            hsts_enabled: config.hsts_enabled,
            allowed_origins: config.api.allowed_origins,
            log_level: config.log_level,
        }
    }
}
