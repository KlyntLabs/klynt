use std::sync::Arc;

use axum::{extract::State, http::StatusCode, response::IntoResponse, Extension, Json};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use klynt_domain::models::{Email, UserDto};

use crate::error::{AppError, WithRequestId};
use crate::request_context::RequestId;
use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub struct LoginBody {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub token: Uuid,
    pub user: UserDto,
}

pub async fn login(
    State(state): State<Arc<AppState>>,
    Extension(request_id): Extension<RequestId>,
    Json(body): Json<LoginBody>,
) -> Result<impl IntoResponse, AppError> {
    let email = Email::parse(&body.email).map_err(|e| {
        AppError::from(klynt_domain::errors::DomainError::InvalidEmail(e))
            .with_request_id(request_id.0)
    })?;

    let ctx = klynt_domain::ctx::Ctx::guest(request_id.0);
    let (token, user) = state
        .auth_service()
        .login(&ctx, &email, &body.password)
        .await
        .with_request_id(request_id.0)?;

    Ok((
        StatusCode::OK,
        Json(LoginResponse {
            token: token.0,
            user,
        }),
    ))
}
