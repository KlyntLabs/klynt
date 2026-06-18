use config::{Config, ConfigError, Environment, File};

use klynt_domain::config::AppConfig;

pub fn load_config() -> Result<AppConfig, ConfigError> {
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
        .set_default("api.port", 3001)?
        .set_default(
            "api.allowed_origins",
            vec!["http://localhost:5174".to_string()],
        )?
        .set_default("rate_limiter.enabled", false)?
        .set_default("rate_limiter.max_requests", 5)?
        .set_default("rate_limiter.window_seconds", 15 * 60)?
        .set_default("log_level", "info")?
        .build()?;

    config.try_deserialize()
}
