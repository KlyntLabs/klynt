//! Integration test for loading gateway configuration from the environment.
//!
//! This test mutates process environment variables and therefore serializes
//! itself to avoid interfering with concurrent tests.

use std::sync::Mutex;

use gateways::Config;

static ENV_LOCK: Mutex<()> = Mutex::new(());

fn database_url() -> String {
    std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://klynt:klynt@localhost:5432/test".to_string())
}

fn redis_url() -> String {
    std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379/0".to_string())
}

#[test]
fn config_can_be_loaded_from_env() {
    let _guard = ENV_LOCK.lock().unwrap();

    // Set the environment variables the loader expects.
    unsafe {
        std::env::set_var("KLYNT_DATABASE_URL", database_url());
        std::env::set_var("KLYNT_REDIS_URL", redis_url());
        std::env::set_var("KLYNT_API__HOST", "127.0.0.1");
        std::env::set_var("KLYNT_API__PORT", "3001");
        std::env::set_var("KLYNT_LOG_LEVEL", "warn");
    }

    let config = Config::from_env().expect("config should load from env");

    assert_eq!(config.bind_address, "127.0.0.1:3001");
    assert_eq!(config.database_url, database_url());
    assert_eq!(config.redis_url, Some(redis_url()));
    assert_eq!(config.log_level, "warn");

    unsafe {
        std::env::remove_var("KLYNT_DATABASE_URL");
        std::env::remove_var("KLYNT_REDIS_URL");
        std::env::remove_var("KLYNT_API__HOST");
        std::env::remove_var("KLYNT_API__PORT");
        std::env::remove_var("KLYNT_LOG_LEVEL");
    }
}
