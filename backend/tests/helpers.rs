use axum::Router;
use klynt_api::{
    config::{ApiConfig, AppConfig},
    startup::build_router,
    state::AppState,
};
use std::sync::Arc;

pub fn test_config() -> AppConfig {
    AppConfig {
        api: ApiConfig {
            host: "127.0.0.1".to_string(),
            port: 0,
            allowed_origins: vec!["http://localhost:5173".to_string()],
        },
        log_level: "error".to_string(),
    }
}

pub fn test_app() -> Router {
    let config = test_config();
    let state = Arc::new(AppState::new(config));
    build_router(state)
}
