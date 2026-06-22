use serde::Deserialize;

use super::{ConfigError, Validated};

#[derive(Debug, Clone, Deserialize)]
pub struct SessionConfig {
    /// Standard access-session lifetime in seconds.
    pub session_duration_secs: u64,

    /// Extended access-session lifetime in seconds when "remember me" is set.
    pub long_session_duration_secs: u64,

    /// Refresh-token lifetime in seconds.
    pub refresh_duration_secs: u64,
}

impl SessionConfig {
    /// Minimum allowed session lifetime in seconds.
    const MIN_DURATION_SECS: u64 = 1;

    /// Maximum allowed session lifetime in seconds (~100 years).
    const MAX_DURATION_SECS: u64 = 100 * 365 * 24 * 60 * 60;
}

impl Default for SessionConfig {
    fn default() -> Self {
        Self {
            session_duration_secs: 24 * 3600,           // 24 hours
            long_session_duration_secs: 30 * 24 * 3600, // 30 days
            refresh_duration_secs: 30 * 24 * 3600,      // 30 days
        }
    }
}

impl Validated for SessionConfig {
    fn validated(&self) -> Result<(), ConfigError> {
        for (name, value) in [
            ("session_duration_secs", self.session_duration_secs),
            (
                "long_session_duration_secs",
                self.long_session_duration_secs,
            ),
            ("refresh_duration_secs", self.refresh_duration_secs),
        ] {
            if value < Self::MIN_DURATION_SECS {
                return Err(ConfigError::InvalidSessionDuration(format!(
                    "{name} must be at least {} second",
                    Self::MIN_DURATION_SECS
                )));
            }

            if value > Self::MAX_DURATION_SECS {
                return Err(ConfigError::InvalidSessionDuration(format!(
                    "{name} exceeds maximum of {} seconds",
                    Self::MAX_DURATION_SECS
                )));
            }
        }

        if self.long_session_duration_secs < self.session_duration_secs {
            return Err(ConfigError::InvalidSessionDuration(
                "long_session_duration_secs must be >= session_duration_secs".to_string(),
            ));
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_config_is_valid() {
        let config = SessionConfig::default();
        assert!(config.validated().is_ok());
    }

    #[test]
    fn zero_duration_is_invalid() {
        let config = SessionConfig {
            session_duration_secs: 0,
            ..Default::default()
        };
        assert!(config.validated().is_err());
    }

    #[test]
    fn long_session_shorter_than_session_is_invalid() {
        let config = SessionConfig {
            session_duration_secs: 3600,
            long_session_duration_secs: 60,
            refresh_duration_secs: 3600,
        };
        assert!(config.validated().is_err());
    }

    #[test]
    fn duration_over_100_years_is_invalid() {
        let config = SessionConfig {
            session_duration_secs: 101 * 365 * 24 * 60 * 60,
            ..Default::default()
        };
        assert!(config.validated().is_err());
    }
}
