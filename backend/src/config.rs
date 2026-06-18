use config::{Config, ConfigError, Environment, File};
use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
pub struct ApiConfig {
    pub host: String,
    pub port: u16,
    pub allowed_origins: Vec<String>,
}

impl Default for ApiConfig {
    fn default() -> Self {
        Self {
            host: "127.0.0.1".to_string(),
            port: 3000,
            allowed_origins: vec!["http://localhost:5173".to_string()],
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct AppConfig {
    pub api: ApiConfig,
    pub log_level: String,
}

impl AppConfig {
    pub fn load() -> Result<Self, ConfigError> {
        let base_path = std::env::current_dir().expect("failed to determine current directory");
        let config_dir = base_path.join("config");

        let config = Config::builder()
            .add_source(File::from(config_dir.join("default.toml")).required(false))
            .add_source(File::from(config_dir.join("local.toml")).required(false))
            .add_source(
                Environment::with_prefix("KLYNT")
                    .prefix_separator("_")
                    .separator("__"),
            )
            .set_default("api.host", "127.0.0.1")?
            .set_default("api.port", 3000)?
            .set_default(
                "api.allowed_origins",
                vec!["http://localhost:5173".to_string()],
            )?
            .set_default("log_level", "info")?
            .build()?;

        config.try_deserialize()
    }
}
