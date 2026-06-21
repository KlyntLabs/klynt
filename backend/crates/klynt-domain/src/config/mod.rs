pub mod api;
pub mod app;
pub mod rate_limiter;

pub use api::ApiConfig;
pub use app::AppConfig;
pub use rate_limiter::RateLimiterConfig;

use thiserror::Error;

#[derive(Debug, Error)]
pub enum ConfigError {
    #[error("invalid host: {0}")]
    InvalidHost(String),

    #[error("invalid port: {0}")]
    InvalidPort(String),

    #[error("invalid origin URL: {0}")]
    InvalidOrigin(String),

    #[error("rate limiter max_requests must be at least 1")]
    InvalidMaxRequests,

    #[error("rate limiter window must be at least 1 second")]
    InvalidWindow,
}

/// Trait for validated configuration.
pub trait Validated {
    fn validated(&self) -> Result<(), ConfigError>;
}
