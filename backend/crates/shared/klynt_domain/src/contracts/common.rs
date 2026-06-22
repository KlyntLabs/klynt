//! Common contract types.

use serde::{Deserialize, Serialize};

/// Standard success response
#[derive(Debug, Serialize, Deserialize)]
pub struct SuccessResponse {
    pub success: bool,
    pub message: Option<String>,
}

impl Default for SuccessResponse {
    fn default() -> Self {
        Self {
            success: true,
            message: None,
        }
    }
}

impl SuccessResponse {
    /// Create success response
    pub fn new() -> Self {
        Self::default()
    }

    /// With message
    pub fn with_message(message: String) -> Self {
        Self {
            success: true,
            message: Some(message),
        }
    }
}

/// Standard error response
#[derive(Debug, Serialize, Deserialize)]
pub struct ErrorResponse {
    pub error: String,
    pub code: Option<String>,
    pub details: Option<serde_json::Value>,
}

impl ErrorResponse {
    /// Create error response
    pub fn new(error: String) -> Self {
        Self {
            error,
            code: None,
            details: None,
        }
    }

    /// With code
    pub fn with_code(mut self, code: String) -> Self {
        self.code = Some(code);
        self
    }

    /// With details
    pub fn with_details(mut self, details: serde_json::Value) -> Self {
        self.details = Some(details);
        self
    }
}
