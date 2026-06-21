//! Response helpers.

use serde::{Deserialize, Serialize};

/// Standard success response.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SuccessResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub message: Option<String>,
}

impl<T> SuccessResponse<T> {
    /// Create a success response wrapping data.
    pub fn ok(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            message: None,
        }
    }
}

impl SuccessResponse<serde_json::Value> {
    /// Create a success response with a message.
    pub fn message(message: &'static str) -> Self {
        Self {
            success: true,
            data: None,
            message: Some(message.to_string()),
        }
    }
}
