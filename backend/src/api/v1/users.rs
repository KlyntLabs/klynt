use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;

use axum::{
    extract::{ConnectInfo, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use uuid::Uuid;

use crate::application::users::UserDto;
use crate::contracts::users::{CreateUserRequest, UserResponse};
use crate::domain::ctx::Ctx;
use crate::domain::models::{Role, UserStatus};
use crate::error::AppError;
use crate::infrastructure::repositories::idempotency::IdempotencyStore;
use crate::state::AppState;

pub async fn create_user(
    State(state): State<Arc<AppState>>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
    Json(req): Json<CreateUserRequest>,
) -> Result<impl IntoResponse, AppError> {
    let ip = addr.ip();
    if !state
        .rate_limiter
        .is_allowed(ip, 5, Duration::from_secs(15 * 60))
    {
        return Err(AppError::RateLimited);
    }

    let idempotency_key = parse_idempotency_key(&headers)?;
    let ctx = Ctx::new(Uuid::new_v4());

    if let Some(cached) = state.idempotency_store.get(idempotency_key).await? {
        return Ok((StatusCode::CREATED, Json(UserResponse::from(&cached))));
    }

    let user_dto = state.user_service.create_user(&ctx, req).await?;
    state
        .idempotency_store
        .set(idempotency_key, user_dto.clone())
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
