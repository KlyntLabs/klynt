//! Tenant HTTP handlers.

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use domain::UserId;

use crate::middleware::auth::AuthContext;
use crate::middleware::tenant_context::require_tenant_membership;
use crate::response::SuccessResponse;
use crate::state::Services;

/// Tenant router — handles tenant management endpoints.
pub fn routes(services: Services) -> axum::Router<Services> {
    let member_required_routes = axum::Router::new()
        .route("/{tenant_slug}", axum::routing::get(get_tenant))
        .route("/{tenant_slug}", axum::routing::patch(update_tenant))
        .route("/{tenant_slug}", axum::routing::delete(delete_tenant))
        .route("/{tenant_slug}/members", axum::routing::get(list_members))
        .route("/{tenant_slug}/members", axum::routing::post(add_member))
        .route(
            "/{tenant_slug}/members",
            axum::routing::patch(update_member_role),
        )
        .route(
            "/{tenant_slug}/members",
            axum::routing::delete(remove_member),
        )
        .layer(axum::middleware::from_fn_with_state(
            services,
            require_tenant_membership,
        ));

    axum::Router::new()
        .route("/", axum::routing::post(create_tenant))
        .route("/", axum::routing::get(list_my_tenants))
        .merge(member_required_routes)
}

fn user_id_from_ctx(auth: &AuthContext) -> Result<UserId, crate::GatewayError> {
    auth.0
        .actor_id
        .map(UserId::from_uuid)
        .ok_or_else(|| crate::GatewayError::Unauthorized("Authenticated user required".to_string()))
}

async fn create_tenant(
    State(services): State<Services>,
    AuthContext(ctx): AuthContext,
    Json(request): Json<CreateTenantRequest>,
) -> Result<impl IntoResponse, crate::GatewayError> {
    let _user_id = user_id_from_ctx(&AuthContext(ctx.clone()))?;
    let tenant = services
        .tenant
        .create_tenant(
            &ctx,
            tenant_service::CreateTenantRequest {
                slug: request.slug,
                name: request.name,
            },
        )
        .await?;

    Ok(Json(SuccessResponse::ok(tenant)))
}

async fn list_my_tenants(
    State(services): State<Services>,
    AuthContext(ctx): AuthContext,
) -> Result<impl IntoResponse, crate::GatewayError> {
    let tenants = services.tenant.list_my_tenants(&ctx).await?;
    Ok(Json(SuccessResponse::ok(tenants)))
}

async fn get_tenant(
    State(services): State<Services>,
    AuthContext(ctx): AuthContext,
    Path(tenant_slug): Path<String>,
) -> Result<impl IntoResponse, crate::GatewayError> {
    let tenant = services.tenant.get_tenant(&ctx, &tenant_slug).await?;
    Ok(Json(SuccessResponse::ok(tenant)))
}

async fn update_tenant(
    State(services): State<Services>,
    AuthContext(ctx): AuthContext,
    Path(tenant_slug): Path<String>,
    Json(request): Json<UpdateTenantRequest>,
) -> Result<impl IntoResponse, crate::GatewayError> {
    let tenant = services
        .tenant
        .update_tenant(&ctx, &tenant_slug, request.name)
        .await?;
    Ok(Json(SuccessResponse::ok(tenant)))
}

async fn delete_tenant(
    State(services): State<Services>,
    AuthContext(ctx): AuthContext,
    Path(tenant_slug): Path<String>,
) -> Result<impl IntoResponse, crate::GatewayError> {
    services.tenant.delete_tenant(&ctx, &tenant_slug).await?;
    Ok(Json(SuccessResponse::message(
        "Tenant deleted successfully",
    )))
}

async fn list_members(
    State(services): State<Services>,
    AuthContext(ctx): AuthContext,
    Path(tenant_slug): Path<String>,
) -> Result<impl IntoResponse, crate::GatewayError> {
    let members = services.tenant.list_members(&ctx, &tenant_slug).await?;
    Ok(Json(SuccessResponse::ok(members)))
}

async fn add_member(
    State(services): State<Services>,
    AuthContext(ctx): AuthContext,
    Path(tenant_slug): Path<String>,
    Json(request): Json<AddMemberRequest>,
) -> Result<impl IntoResponse, crate::GatewayError> {
    let membership = services
        .tenant
        .add_member(
            &ctx,
            &tenant_slug,
            tenant_service::AddMemberRequest {
                email: request.email,
                role: request.role,
            },
        )
        .await?;
    Ok((StatusCode::CREATED, Json(SuccessResponse::ok(membership))))
}

async fn update_member_role(
    State(services): State<Services>,
    AuthContext(ctx): AuthContext,
    Path(tenant_slug): Path<String>,
    Json(request): Json<UpdateMemberRoleRequest>,
) -> Result<impl IntoResponse, crate::GatewayError> {
    services
        .tenant
        .update_member_role(
            &ctx,
            &tenant_slug,
            tenant_service::UpdateMemberRoleRequest {
                email: request.email,
                role: request.role,
            },
        )
        .await?;
    Ok(Json(SuccessResponse::message(
        "Member role updated successfully",
    )))
}

async fn remove_member(
    State(services): State<Services>,
    AuthContext(ctx): AuthContext,
    Path(tenant_slug): Path<String>,
    Json(request): Json<RemoveMemberRequest>,
) -> Result<impl IntoResponse, crate::GatewayError> {
    services
        .tenant
        .remove_member(
            &ctx,
            &tenant_slug,
            tenant_service::RemoveMemberRequest {
                email: request.email,
            },
        )
        .await?;
    Ok(Json(SuccessResponse::message(
        "Member removed successfully",
    )))
}

#[derive(serde::Deserialize)]
struct CreateTenantRequest {
    slug: String,
    name: String,
}

#[derive(serde::Deserialize)]
struct UpdateTenantRequest {
    name: String,
}

#[derive(serde::Deserialize)]
struct AddMemberRequest {
    email: String,
    role: domain::membership::TenantRole,
}

#[derive(serde::Deserialize)]
struct UpdateMemberRoleRequest {
    email: String,
    role: domain::membership::TenantRole,
}

#[derive(serde::Deserialize)]
struct RemoveMemberRequest {
    email: String,
}
