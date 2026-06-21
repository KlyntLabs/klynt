use serde::Deserialize;

use super::{ConfigError, Validated};

#[derive(Debug, Clone, Deserialize)]
pub struct RateLimiterConfig {
    pub enabled: bool,
    pub max_requests: usize,
    pub window_seconds: u64,
}

impl Default for RateLimiterConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            max_requests: 5,
            window_seconds: 15 * 60,
        }
    }
}

impl Validated for RateLimiterConfig {
    fn validated(&self) -> Result<(), ConfigError> {
        if self.enabled {
            if self.max_requests < 1 {
                return Err(ConfigError::InvalidMaxRequests);
            }
            if self.window_seconds < 1 {
                return Err(ConfigError::InvalidWindow);
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
        let config = RateLimiterConfig::default();
        assert!(config.validated().is_ok());
    }

    #[test]
    fn enabled_with_zero_requests_is_invalid() {
        let config = RateLimiterConfig {
            enabled: true,
            max_requests: 0,
            ..Default::default()
        };
        assert!(matches!(
            config.validated(),
            Err(ConfigError::InvalidMaxRequests)
        ));
    }

    #[test]
    fn enabled_with_zero_window_is_invalid() {
        let config = RateLimiterConfig {
            enabled: true,
            window_seconds: 0,
            ..Default::default()
        };
        assert!(matches!(
            config.validated(),
            Err(ConfigError::InvalidWindow)
        ));
    }
}
