use serde::Deserialize;

use super::{ConfigError, Validated};

const MIN_PORT: u16 = 1;

#[derive(Debug, Clone, Deserialize)]
pub struct ApiConfig {
    pub host: String,
    pub port: u16,
    pub allowed_origins: Vec<String>,
    #[serde(default)]
    pub trusted_proxies: Vec<String>,
}

impl Default for ApiConfig {
    fn default() -> Self {
        Self {
            host: "127.0.0.1".to_string(),
            port: 3001,
            allowed_origins: vec!["http://localhost:5174".to_string()],
            trusted_proxies: vec![],
        }
    }
}

impl Validated for ApiConfig {
    fn validated(&self) -> Result<(), ConfigError> {
        if self.host.is_empty() {
            return Err(ConfigError::InvalidHost("host cannot be empty".to_string()));
        }

        if self.port < MIN_PORT {
            return Err(ConfigError::InvalidPort(format!(
                "port {} is below minimum {}",
                self.port, MIN_PORT
            )));
        }

        for origin in &self.allowed_origins {
            if !origin.starts_with("http://") && !origin.starts_with("https://") {
                return Err(ConfigError::InvalidOrigin(format!(
                    "origin '{}' must start with http:// or https://",
                    origin
                )));
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_config_is_valid() {
        let config = ApiConfig::default();
        assert!(config.validated().is_ok());
    }

    #[test]
    fn empty_host_is_invalid() {
        let config = ApiConfig {
            host: String::new(),
            ..Default::default()
        };
        assert!(matches!(
            config.validated(),
            Err(ConfigError::InvalidHost(_))
        ));
    }

    #[test]
    fn port_zero_is_invalid() {
        let config = ApiConfig {
            port: 0,
            ..Default::default()
        };
        assert!(matches!(
            config.validated(),
            Err(ConfigError::InvalidPort(_))
        ));
    }

    #[test]
    fn invalid_origin_is_rejected() {
        let config = ApiConfig {
            allowed_origins: vec!["not-a-url".to_string()],
            ..Default::default()
        };
        assert!(matches!(
            config.validated(),
            Err(ConfigError::InvalidOrigin(_))
        ));
    }
}
