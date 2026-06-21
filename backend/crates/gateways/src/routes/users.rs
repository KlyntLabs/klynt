//! User HTTP handlers.

use axum::{
    extract::{Path, Query, State},
    response::IntoResponse,
    Json,
};

use klynt_shared_domain::PaginationRequest;
use klynt_utils::UserId;

use crate::middleware::auth::AuthContext;
use crate::response::SuccessResponse;
use crate::state::Services;

/// User router — handles current user profile and admin user management.
pub fn routes() -> axum::Router<Services> {
    axum::Router::new()
        // Current user routes
        .route("/me", axum::routing::get(get_current_user))
        .route("/me", axum::routing::patch(update_profile))
        .route("/me/password", axum::routing::post(change_password))
        // Admin routes
        .route("/{id}", axum::routing::get(get_user))
        .route("/", axum::routing::get(list_users))
        .route("/{id}", axum::routing::delete(delete_user))
}

fn user_id_from_ctx(auth: &AuthContext) -> Result<UserId, crate::GatewayError> {
    auth.0
        .actor_id
        .map(UserId::from_uuid)
        .ok_or_else(|| crate::GatewayError::Unauthorized("Authenticated user required".to_string()))
}

async fn get_current_user(
    State(services): State<Services>,
    AuthContext(ctx): AuthContext,
) -> Result<impl IntoResponse, crate::GatewayError> {
    let user_id = user_id_from_ctx(&AuthContext(ctx.clone()))?;
    let profile = services
        .user
        .get_user(&ctx, user_id)
        .await
        .map_err(crate::GatewayError::from)?;

    Ok(Json(SuccessResponse::ok(profile)))
}

async fn update_profile(
    State(services): State<Services>,
    AuthContext(ctx): AuthContext,
    Json(request): Json<user_service::models::ProfileUpdate>,
) -> Result<impl IntoResponse, crate::GatewayError> {
    let user_id = user_id_from_ctx(&AuthContext(ctx.clone()))?;
    let profile = services
        .user
        .update_profile(&ctx, user_id, request)
        .await
        .map_err(crate::GatewayError::from)?;

    Ok(Json(SuccessResponse::ok(profile)))
}

async fn change_password(
    State(services): State<Services>,
    AuthContext(ctx): AuthContext,
    Json(request): Json<ChangePasswordRequest>,
) -> Result<impl IntoResponse, crate::GatewayError> {
    let user_id = user_id_from_ctx(&AuthContext(ctx.clone()))?;
    services
        .user
        .change_password(
            &ctx,
            user_id,
            &request.current_password,
            &request.new_password,
        )
        .await
        .map_err(crate::GatewayError::from)?;

    Ok(Json(SuccessResponse::message(
        "Password changed successfully",
    )))
}

#[derive(serde::Deserialize)]
struct ChangePasswordRequest {
    current_password: String,
    new_password: String,
}

async fn get_user(
    State(services): State<Services>,
    AuthContext(ctx): AuthContext,
    Path(user_id): Path<uuid::Uuid>,
) -> Result<impl IntoResponse, crate::GatewayError> {
    let profile = services
        .user
        .get_user(&ctx, UserId::from_uuid(user_id))
        .await
        .map_err(crate::GatewayError::from)?;

    Ok(Json(SuccessResponse::ok(profile)))
}

async fn delete_user(
    State(services): State<Services>,
    AuthContext(ctx): AuthContext,
    Path(user_id): Path<uuid::Uuid>,
) -> Result<impl IntoResponse, crate::GatewayError> {
    services
        .user
        .delete_user(&ctx, UserId::from_uuid(user_id))
        .await
        .map_err(crate::GatewayError::from)?;

    Ok(Json(SuccessResponse::message("User deleted successfully")))
}

#[derive(serde::Deserialize)]
struct ListUsersQuery {
    #[serde(default = "default_page")]
    page: u32,
    #[serde(default = "default_page_size")]
    page_size: u32,
}

fn default_page() -> u32 {
    1
}

fn default_page_size() -> u32 {
    20
}

async fn list_users(
    State(services): State<Services>,
    AuthContext(ctx): AuthContext,
    Query(query): Query<ListUsersQuery>,
) -> Result<impl IntoResponse, crate::GatewayError> {
    let response = services
        .user
        .list_users(&ctx, PaginationRequest::new(query.page, query.page_size))
        .await
        .map_err(crate::GatewayError::from)?;

    Ok(Json(SuccessResponse::ok(response)))
}
