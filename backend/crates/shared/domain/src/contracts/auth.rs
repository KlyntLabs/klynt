//! Authentication-related contracts.

use crate::user::UserId;
use crate::user::UserRole;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use validator::Validate;

/// Login request
#[derive(Debug, Clone, Deserialize, Validate)]
pub struct LoginRequest {
    #[validate(email(message = "Must be a valid email"))]
    pub email: String,
    #[validate(length(min = 8, message = "Password must be at least 8 characters"))]
    pub password: String,
    pub remember_me: Option<bool>,
}

/// Login response
#[derive(Debug, Clone, Serialize)]
pub struct LoginResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_at: DateTime<Utc>,
    pub user: UserSessionInfo,
}

/// User session info
#[derive(Debug, Clone, Serialize)]
pub struct UserSessionInfo {
    pub id: UserId,
    pub email: String,
    pub full_name: Option<String>,
    pub role: UserRole,
}

impl From<crate::user::User> for UserSessionInfo {
    fn from(user: crate::user::User) -> Self {
        Self {
            id: user.id,
            email: user.email.inner().to_string(),
            full_name: user.full_name,
            role: user.role,
        }
    }
}

/// Registration request
#[derive(Debug, Clone, Deserialize, Validate)]
pub struct RegistrationRequest {
    #[validate(email(message = "Must be a valid email"))]
    pub email: String,
    #[validate(length(min = 8, message = "Password must be at least 8 characters"))]
    pub password: String,
    pub full_name: Option<String>,
}

/// Refresh token request
#[derive(Debug, Clone, Deserialize)]
pub struct RefreshTokenRequest {
    pub refresh_token: String,
}
