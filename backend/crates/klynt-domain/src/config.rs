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
            port: 3001,
            allowed_origins: vec!["http://localhost:5174".to_string()],
        }
    }
}

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

#[derive(Debug, Clone, Deserialize)]
pub struct AppConfig {
    pub api: ApiConfig,
    pub rate_limiter: RateLimiterConfig,
    pub log_level: String,
}
