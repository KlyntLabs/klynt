//! User-related contracts.

use crate::util::id::UserId;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use validator::Validate;

/// User DTO
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserDto {
    pub id: UserId,
    pub email: String,
    pub full_name: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: Option<DateTime<Utc>>,
}

/// Create user request
#[derive(Debug, Clone, Deserialize, Validate)]
pub struct CreateUserRequest {
    #[validate(email(message = "Must be a valid email"))]
    pub email: String,
    pub full_name: Option<String>,
}

/// Update user request
#[derive(Debug, Clone, Deserialize, Validate)]
pub struct UpdateUserRequest {
    pub full_name: Option<String>,
}
