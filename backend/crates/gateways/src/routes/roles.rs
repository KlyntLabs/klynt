//! Tenant role management HTTP handlers.

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use domain::{PermissionId, RoleId};

use crate::middleware::auth::AuthContext;
use crate::response::SuccessResponse;
use crate::state::Services;

/// Role management router nested under `/{tenant_slug}/roles`.
pub fn routes() -> axum::Router<Services> {
    axum::Router::new()
        .route("/", axum::routing::get(list_roles).post(create_role))
        .route(
            "/{role_id}",
            axum::routing::get(get_role)
                .patch(update_role)
                .delete(delete_role),
        )
}

async fn list_roles(
    State(services): State<Services>,
    AuthContext(ctx): AuthContext,
    Path(tenant_slug): Path<String>,
) -> Result<impl IntoResponse, crate::GatewayError> {
    let roles = services.tenant.list_roles(&ctx, &tenant_slug).await?;
    Ok(Json(SuccessResponse::ok(roles)))
}

async fn create_role(
    State(services): State<Services>,
    AuthContext(ctx): AuthContext,
    Path(tenant_slug): Path<String>,
    Json(request): Json<CreateRoleRequest>,
) -> Result<impl IntoResponse, crate::GatewayError> {
    let role = services
        .tenant
        .create_role(
            &ctx,
            &tenant_slug,
            tenant_service::CreateRoleRequest {
                name: request.name,
                description: request.description.unwrap_or_default(),
                permission_ids: request.permission_ids,
            },
        )
        .await?;

    Ok((StatusCode::CREATED, Json(SuccessResponse::ok(role))))
}

async fn get_role(
    State(services): State<Services>,
    AuthContext(ctx): AuthContext,
    Path((tenant_slug, role_id)): Path<(String, RoleId)>,
) -> Result<impl IntoResponse, crate::GatewayError> {
    let role = services
        .tenant
        .get_role(&ctx, &tenant_slug, role_id)
        .await?;
    Ok(Json(SuccessResponse::ok(role)))
}

async fn update_role(
    State(services): State<Services>,
    AuthContext(ctx): AuthContext,
    Path((tenant_slug, role_id)): Path<(String, RoleId)>,
    Json(request): Json<UpdateRoleRequest>,
) -> Result<impl IntoResponse, crate::GatewayError> {
    let role = services
        .tenant
        .update_role(
            &ctx,
            &tenant_slug,
            role_id,
            tenant_service::UpdateRoleRequest {
                permission_ids: request.permission_ids,
            },
        )
        .await?;

    Ok(Json(SuccessResponse::ok(role)))
}

async fn delete_role(
    State(services): State<Services>,
    AuthContext(ctx): AuthContext,
    Path((tenant_slug, role_id)): Path<(String, RoleId)>,
) -> Result<impl IntoResponse, crate::GatewayError> {
    services
        .tenant
        .delete_role(&ctx, &tenant_slug, role_id)
        .await?;

    Ok(Json(SuccessResponse::message("Role deleted successfully")))
}

#[derive(serde::Deserialize)]
struct CreateRoleRequest {
    name: String,
    description: Option<String>,
    permission_ids: Vec<PermissionId>,
}

#[derive(serde::Deserialize)]
struct UpdateRoleRequest {
    permission_ids: Vec<PermissionId>,
}
