use std::sync::Arc;

use axum::{
    extract::{ConnectInfo, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use chrono::{DateTime, Utc};
use serde::Serialize;
use uuid::Uuid;

use crate::application::users::{CreateUserRequest, UserDto};
use crate::domain::models::{Role, UserStatus};
use crate::error::AppError;
use crate::state::AppState;

#[derive(Debug, Serialize)]
pub struct UserResponse {
    pub id: Uuid,
    pub name: String,
    pub email: String,
    pub role: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

pub async fn create_user(
    State(state): State<Arc<AppState>>,
    ConnectInfo(addr): ConnectInfo<std::net::SocketAddr>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateUserRequest>,
) -> Result<impl IntoResponse, AppError> {
    let user_dto = state
        .request_gate
        .create_user(addr.ip(), &headers, req)
        .await?;

    Ok((StatusCode::CREATED, Json(UserResponse::from(&user_dto))))
}

impl From<&UserDto> for UserResponse {
    fn from(dto: &UserDto) -> Self {
        Self {
            id: dto.id.0,
            name: dto.name.clone(),
            email: dto.email.clone(),
            role: match dto.role {
                Role::Student => "student".to_string(),
                Role::Teacher => "teacher".to_string(),
                Role::Admin => "admin".to_string(),
                Role::Parent => "parent".to_string(),
            },
            status: match dto.status {
                UserStatus::PendingVerification => "pending_verification".to_string(),
                UserStatus::Active => "active".to_string(),
                UserStatus::Suspended => "suspended".to_string(),
            },
            created_at: dto.created_at,
        }
    }
}
