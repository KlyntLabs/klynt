use serde::Deserialize;

use super::{ApiConfig, ConfigError, RateLimiterConfig, Validated};

#[derive(Debug, Clone, Deserialize)]
pub struct AppConfig {
    pub api: ApiConfig,
    pub rate_limiter: RateLimiterConfig,
    pub log_level: String,
    #[serde(default)]
    pub hsts_enabled: bool,
    pub database_url: Option<String>,
    pub redis_url: Option<String>,
}

impl Validated for AppConfig {
    fn validated(&self) -> Result<(), ConfigError> {
        self.api.validated()?;
        self.rate_limiter.validated()?;
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
        let config = AppConfig {
            api,
            rate_limiter,
            log_level: "info".to_string(),
            hsts_enabled: false,
            database_url: Some("postgresql://localhost/db".to_string()),
            redis_url: Some("redis://localhost".to_string()),
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
        let config = AppConfig {
            api,
            rate_limiter,
            log_level: "info".to_string(),
            hsts_enabled: false,
            database_url: None,
            redis_url: None,
        };
        assert!(config.validated().is_err());
    }
}
