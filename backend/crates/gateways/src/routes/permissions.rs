//! Global permission catalog HTTP handler.

use axum::{extract::State, response::IntoResponse, Json};

use crate::middleware::auth::AuthContext;
use crate::response::SuccessResponse;
use crate::state::Services;

pub(crate) async fn list_permissions(
    State(services): State<Services>,
    AuthContext(ctx): AuthContext,
) -> Result<impl IntoResponse, crate::GatewayError> {
    let permissions = services.tenant.list_permissions(&ctx).await?;
    Ok(Json(SuccessResponse::ok(permissions)))
}
