//! Tenant desktop layout HTTP handlers.

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use base::ctx::ExecutionContext;
use domain::{DesktopIcon, DesktopWindow, LayoutScope, TenantDesktopLayout};
use tenant_service::admin::ensure_admin;
use uuid::Uuid;

use crate::middleware::auth::AuthContext;
use crate::middleware::tenant_context::TenantContext;
use crate::response::SuccessResponse;
use crate::state::Services;

/// Desktop layout router — nested under `/{tenant_slug}/desktop-layout`.
pub fn routes() -> axum::Router<Services> {
    axum::Router::new()
        .route("/", axum::routing::get(get_shared).put(update_shared))
        .route(
            "/me",
            axum::routing::get(get_user_override).put(update_user_override),
        )
}

pub(crate) async fn get_shared(
    State(services): State<Services>,
    TenantContext(ctx): TenantContext,
) -> Result<impl IntoResponse, crate::GatewayError> {
    let tenant_id = require_tenant_id(&ctx)?;
    let layout = services.desktop_layout.get_shared(&ctx, tenant_id).await?;
    match layout {
        Some(layout) => Ok(Json(SuccessResponse::ok(LayoutResponse::from(layout)))),
        None => Err(crate::GatewayError::NotFound(
            "Shared desktop layout not found".to_string(),
        )),
    }
}

pub(crate) async fn update_shared(
    State(services): State<Services>,
    TenantContext(ctx): TenantContext,
    Path(tenant_slug): Path<String>,
    Json(payload): Json<LayoutPayload>,
) -> Result<impl IntoResponse, crate::GatewayError> {
    ensure_admin(&services.tenant, &ctx, &tenant_slug).await?;
    let tenant_id = require_tenant_id(&ctx)?;
    let layout = build_layout(tenant_id, LayoutScope::Shared, None, payload);
    let updated = services
        .desktop_layout
        .update_shared(&ctx, tenant_id, layout.layout, layout.expected_etag)
        .await?;
    Ok((
        StatusCode::OK,
        Json(SuccessResponse::ok(LayoutResponse::from(updated))),
    ))
}

pub(crate) async fn get_user_override(
    State(services): State<Services>,
    TenantContext(ctx): TenantContext,
    AuthContext(auth_ctx): AuthContext,
) -> Result<impl IntoResponse, crate::GatewayError> {
    let tenant_id = require_tenant_id(&ctx)?;
    let user_id = require_actor_id(&auth_ctx)?;
    let layout = services
        .desktop_layout
        .get_user_override(&ctx, tenant_id, user_id)
        .await?;
    match layout {
        Some(layout) => Ok(Json(SuccessResponse::ok(LayoutResponse::from(layout)))),
        None => Err(crate::GatewayError::NotFound(
            "User desktop layout override not found".to_string(),
        )),
    }
}

pub(crate) async fn update_user_override(
    State(services): State<Services>,
    TenantContext(ctx): TenantContext,
    AuthContext(auth_ctx): AuthContext,
    Json(payload): Json<LayoutPayload>,
) -> Result<impl IntoResponse, crate::GatewayError> {
    let tenant_id = require_tenant_id(&ctx)?;
    let user_id = require_actor_id(&auth_ctx)?;
    let layout = build_layout(tenant_id, LayoutScope::User, Some(user_id), payload);
    let updated = services
        .desktop_layout
        .update_user_override(&ctx, layout.layout)
        .await?;
    Ok((
        StatusCode::OK,
        Json(SuccessResponse::ok(LayoutResponse::from(updated))),
    ))
}

fn require_tenant_id(ctx: &ExecutionContext) -> Result<Uuid, crate::GatewayError> {
    ctx.tenant_id()
        .map(|id| id.inner())
        .ok_or_else(|| crate::GatewayError::BadRequest("Tenant context missing".to_string()))
}

fn require_actor_id(ctx: &ExecutionContext) -> Result<Uuid, crate::GatewayError> {
    ctx.actor_id
        .ok_or_else(|| crate::GatewayError::Unauthorized("Authenticated user required".to_string()))
}

struct BuiltLayout {
    layout: TenantDesktopLayout,
    expected_etag: String,
}

fn build_layout(
    tenant_id: Uuid,
    scope: LayoutScope,
    user_id: Option<Uuid>,
    payload: LayoutPayload,
) -> BuiltLayout {
    let expected_etag = payload.etag.clone();
    BuiltLayout {
        layout: TenantDesktopLayout {
            id: Uuid::new_v4(),
            tenant_id,
            scope,
            user_id,
            version: payload.version,
            background_preset_id: payload.background_preset_id,
            icons: payload.icons,
            windows: payload.windows,
            etag: Uuid::new_v4().to_string(),
        },
        expected_etag,
    }
}

#[derive(serde::Deserialize)]
pub(crate) struct LayoutPayload {
    version: i32,
    background_preset_id: String,
    icons: Vec<DesktopIcon>,
    windows: Vec<DesktopWindow>,
    etag: String,
}

#[derive(serde::Serialize)]
struct LayoutResponse {
    id: Uuid,
    tenant_id: Uuid,
    scope: String,
    user_id: Option<Uuid>,
    version: i32,
    background_preset_id: String,
    icons: Vec<DesktopIcon>,
    windows: Vec<DesktopWindow>,
    etag: String,
}

impl From<TenantDesktopLayout> for LayoutResponse {
    fn from(layout: TenantDesktopLayout) -> Self {
        Self {
            id: layout.id,
            tenant_id: layout.tenant_id,
            scope: layout.scope.to_string(),
            user_id: layout.user_id,
            version: layout.version,
            background_preset_id: layout.background_preset_id,
            icons: layout.icons,
            windows: layout.windows,
            etag: layout.etag,
        }
    }
}
