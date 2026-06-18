use std::sync::Arc;

use axum::{
    extract::{ConnectInfo, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Extension, Json,
};
use serde::Deserialize;
use uuid::Uuid;

use klynt_application::users::CreateUserRequest;

use crate::error::AppError;
use crate::middleware::RequestId;
use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub struct CreateUserBody {
    pub name: String,
    pub email: String,
    pub password: String,
    pub role: String,
    pub institution_id: Option<Uuid>,
    pub terms_accepted: bool,
    pub terms_version: String,
}

impl From<CreateUserBody> for CreateUserRequest {
    fn from(body: CreateUserBody) -> Self {
        Self {
            name: body.name,
            email: body.email,
            password: body.password,
            role: body.role,
            institution_id: body.institution_id,
            terms_accepted: body.terms_accepted,
            terms_version: body.terms_version,
        }
    }
}

pub async fn create_user(
    State(state): State<Arc<AppState>>,
    ConnectInfo(addr): ConnectInfo<std::net::SocketAddr>,
    Extension(request_id): Extension<RequestId>,
    headers: HeaderMap,
    Json(req): Json<CreateUserBody>,
) -> Result<impl IntoResponse, AppError> {
    let idempotency_key = parse_idempotency_key(&headers)?;
    let user_dto = state
        .request_gate
        .create_user(addr.ip(), request_id.0, idempotency_key, req.into())
        .await?;

    Ok((StatusCode::CREATED, Json(user_dto)))
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
