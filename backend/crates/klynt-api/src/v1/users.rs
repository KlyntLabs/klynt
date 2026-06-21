use std::sync::Arc;

use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Extension, Json,
};
use serde::Deserialize;
use uuid::Uuid;

use klynt_application::users::CreateUserRequest;
use klynt_domain::ctx::Ctx;
use klynt_domain::models::UserDto;

use crate::error::{AppError, AppErrorKind, WithRequestId};
use crate::middleware::auth::CtxW;
use crate::request_context::RequestId;
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
    Extension(request_id): Extension<RequestId>,
    headers: HeaderMap,
    Json(req): Json<CreateUserBody>,
) -> Result<impl IntoResponse, AppError> {
    let idempotency_key = parse_idempotency_key(&headers, request_id.0)?;
    let user_dto = state
        .auth()
        .users()
        .create_user(&Ctx::guest(request_id.0), idempotency_key, req.into())
        .await
        .with_request_id(request_id.0)?;

    Ok((StatusCode::CREATED, Json(user_dto)))
}

pub async fn get_me(
    State(state): State<Arc<AppState>>,
    Extension(request_id): Extension<RequestId>,
    CtxW(ctx): CtxW,
) -> Result<impl IntoResponse, AppError> {
    let user_id = ctx
        .user_id
        .ok_or_else(|| klynt_domain::errors::DomainError::AuthenticationRequired)?;

    let user = state
        .auth()
        .users()
        .find_by_id(&ctx, user_id)
        .await
        .with_request_id(request_id.0)?;

    Ok((StatusCode::OK, Json(UserDto::from(&user))))
}

fn parse_idempotency_key(headers: &HeaderMap, request_id: Uuid) -> Result<Uuid, AppError> {
    let header = headers.get("Idempotency-Key").ok_or_else(|| {
        AppError::new(
            AppErrorKind::BadRequest("Idempotency-Key header is required".to_string()),
            request_id,
        )
    })?;

    let text = header.to_str().map_err(|_| {
        AppError::new(
            AppErrorKind::BadRequest("Idempotency-Key is not valid UTF-8".to_string()),
            request_id,
        )
    })?;

    Uuid::parse_str(text).map_err(|_| {
        AppError::new(
            AppErrorKind::BadRequest("Idempotency-Key must be a UUID".to_string()),
            request_id,
        )
    })
}
