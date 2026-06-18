use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;
use tracing::error;

#[derive(Debug, Serialize)]
pub struct ApiErrorBody {
    pub code: String,
    pub message: String,
}

impl ApiErrorBody {
    pub fn new(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
        }
    }
}

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("resource not found")]
    NotFound,
    #[error("bad request: {0}")]
    BadRequest(String),
    #[error("unprocessable entity: {0}")]
    Validation(String),
    #[error("internal server error")]
    Internal(#[from] anyhow::Error),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let request_id = ""; // populated via extension in production

        let (status, body) = match &self {
            AppError::NotFound => (
                StatusCode::NOT_FOUND,
                ApiErrorBody::new("not_found", self.to_string()),
            ),
            AppError::BadRequest(msg) => (
                StatusCode::BAD_REQUEST,
                ApiErrorBody::new("bad_request", msg.clone()),
            ),
            AppError::Validation(msg) => (
                StatusCode::UNPROCESSABLE_ENTITY,
                ApiErrorBody::new("validation_error", msg.clone()),
            ),
            AppError::Internal(err) => {
                error!(error = ?err, request_id, "internal server error");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    ApiErrorBody::new("internal_error", "something went wrong"),
                )
            }
        };

        (status, Json(body)).into_response()
    }
}
