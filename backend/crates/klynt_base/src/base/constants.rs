//! Application-wide constants.

/// API version prefix
pub const API_VERSION: &str = "/v1";

/// Default page size for pagination
pub const DEFAULT_PAGE_SIZE: usize = 20;

/// Maximum page size for pagination
pub const MAX_PAGE_SIZE: usize = 100;

/// Session duration in seconds (default: 24 hours)
pub const DEFAULT_SESSION_DURATION_SECS: u64 = 86_400;

/// Refresh token duration in seconds (default: 30 days)
pub const DEFAULT_REFRESH_TOKEN_DURATION_SECS: u64 = 2_592_000;
