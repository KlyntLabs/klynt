use serde::{Deserialize, Deserializer};

use super::{ConfigError, Validated};

const MIN_PORT: u16 = 1;

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
