use std::sync::Arc;

use axum::{
    extract::{ConnectInfo, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use chrono::{DateTime, Utc};
use serde::Serialize;
use uuid::Uuid;

use crate::application::users::CreateUserRequest;
use crate::domain::models::{Role, UserDto, UserStatus};
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
    headers: HeaderMap,
    Json(req): Json<CreateUserRequest>,
) -> Result<impl IntoResponse, AppError> {
    let idempotency_key = parse_idempotency_key(&headers)?;
    let user_dto = state
        .request_gate
        .create_user(addr.ip(), idempotency_key, req)
        .await?;

    Ok((StatusCode::CREATED, Json(UserResponse::from(&user_dto))))
}

fn parse_idempotency_key(headers: &HeaderMap) -> Result<Uuid, AppError> {
    let header = headers
        .get("Idempotency-Key")
        .ok_or_else(|| AppError::BadRequest("Idempotency-Key header is required".to_string()))?;

    let text = header
        .to_str()
        .map_err(|_| AppError::BadRequest("Idempotency-Key is not valid UTF-8".to_string()))?;

    Uuid::parse_str(text)
        .map_err(|_| AppError::BadRequest("Idempotency-Key must be a UUID".to_string()))
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
