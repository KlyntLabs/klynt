use serde::{Deserialize, Deserializer};

use super::{ConfigError, Validated};

const MIN_PORT: u16 = 1;

/// Accept either a real list or a comma-separated scalar.
///
/// Every value from the `config` crate's `Environment` source arrives as a `String`: it is built
/// with `try_parsing(true)` but no `list_separator`, so it coerces bool/int/float and nothing
/// else. A `Vec<String>` field therefore cannot be set from an env var at all — it fails with
/// `invalid type: string, expected a sequence`. This makes the scalar form work, which is the
/// only way these lists can be configured per-environment.
fn deserialize_comma_separated_list<'de, D>(deserializer: D) -> Result<Vec<String>, D::Error>
where
    D: Deserializer<'de>,
{
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum Value {
        List(Vec<String>),
        Single(String),
    }

    match Value::deserialize(deserializer)? {
        Value::List(list) => Ok(list),
        Value::Single(value) => Ok(value
            .split(',')
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(String::from)
            .collect()),
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct ApiConfig {
    pub host: String,
    pub port: u16,
    #[serde(deserialize_with = "deserialize_comma_separated_list")]
    pub allowed_origins: Vec<String>,
    #[serde(default, deserialize_with = "deserialize_comma_separated_list")]
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

        crate::parse_trusted_proxies(&self.trusted_proxies)?;

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

    #[test]
    fn wildcard_origin_is_accepted() {
        let config = ApiConfig {
            allowed_origins: vec!["http://*.lvh.me:5174".to_string()],
            ..Default::default()
        };
        assert!(config.validated().is_ok());
    }

    #[test]
    fn schemeless_wildcard_origin_is_rejected() {
        let config = ApiConfig {
            allowed_origins: vec!["*.klynt.dev".to_string()],
            ..Default::default()
        };
        assert!(matches!(
            config.validated(),
            Err(ConfigError::InvalidOrigin(_))
        ));
    }

    #[test]
    fn schemeless_origin_is_rejected() {
        let config = ApiConfig {
            allowed_origins: vec!["lvh.me".to_string()],
            ..Default::default()
        };
        assert!(matches!(
            config.validated(),
            Err(ConfigError::InvalidOrigin(_))
        ));
    }

    #[test]
    fn valid_trusted_proxies_are_accepted() {
        let config = ApiConfig {
            trusted_proxies: vec![
                "127.0.0.1".to_string(),
                "10.0.0.0/8".to_string(),
                "::1".to_string(),
                "2001:db8::/32".to_string(),
            ],
            ..Default::default()
        };
        assert!(config.validated().is_ok());
    }

    /// A list cannot be supplied through an environment variable unless the field accepts a
    /// scalar: the `config` crate's `Environment` source is built with `try_parsing(true)` but
    /// no `list_separator`, so it can coerce bool/int/float and nothing else — every env value
    /// arrives as a `String`. `trusted_proxies` already handles that; `allowed_origins` did not,
    /// so `KLYNT_API__ALLOWED_ORIGINS` hard-failed the boot with
    /// `invalid type: string, expected a sequence`, and the deploy workflow's indexed
    /// `KLYNT_API__ALLOWED_ORIGINS_0` / `_1` were silently parsed as unrelated keys and dropped —
    /// leaving production with `default.toml`'s localhost allow-list.
    #[test]
    fn comma_separated_allowed_origins_deserialize_to_vec() {
        let input = r#"{"host":"0.0.0.0","port":3001,"allowed_origins":"https://app.klynt.dev, https://*.klynt.dev"}"#;
        let config: ApiConfig = serde_json::from_str(input).unwrap();
        assert_eq!(
            config.allowed_origins,
            vec![
                "https://app.klynt.dev".to_string(),
                "https://*.klynt.dev".to_string()
            ]
        );
        assert!(config.validated().is_ok());
    }

    #[test]
    fn allowed_origins_still_accept_a_real_list() {
        let input = r#"{"host":"0.0.0.0","port":3001,"allowed_origins":["https://app.klynt.dev"]}"#;
        let config: ApiConfig = serde_json::from_str(input).unwrap();
        assert_eq!(
            config.allowed_origins,
            vec!["https://app.klynt.dev".to_string()]
        );
    }

    #[test]
    fn comma_separated_trusted_proxies_deserialize_to_vec() {
        let input = r#"{"host":"0.0.0.0","port":3001,"allowed_origins":[],"trusted_proxies":"127.0.0.1,10.0.0.0/8,::1"}"#;
        let config: ApiConfig = serde_json::from_str(input).unwrap();
        assert_eq!(
            config.trusted_proxies,
            vec![
                "127.0.0.1".to_string(),
                "10.0.0.0/8".to_string(),
                "::1".to_string()
            ]
        );
        assert!(config.validated().is_ok());
    }

    #[test]
    fn invalid_trusted_proxy_is_rejected() {
        let config = ApiConfig {
            trusted_proxies: vec!["not-an-ip".to_string()],
            ..Default::default()
        };
        assert!(matches!(
            config.validated(),
            Err(ConfigError::InvalidTrustedProxy(_))
        ));
    }

    #[test]
    fn invalid_trusted_proxy_cidr_prefix_is_rejected() {
        let config = ApiConfig {
            trusted_proxies: vec!["10.0.0.0/33".to_string()],
            ..Default::default()
        };
        assert!(matches!(
            config.validated(),
            Err(ConfigError::InvalidTrustedProxy(_))
        ));
    }
}
