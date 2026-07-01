//! Desktop app HTTP handlers.

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use base::ctx::ExecutionContext;
use domain::{AppType, DesktopApp};
use uuid::Uuid;

use crate::middleware::auth::AuthContext;
use crate::middleware::tenant_context::TenantContext;
use crate::response::SuccessResponse;
use crate::state::Services;
use crate::GatewayError;

/// Desktop app router — nested under `/{tenant_slug}`.
pub fn routes() -> axum::Router<Services> {
    axum::Router::new()
        .route("/desktop/apps", axum::routing::post(create_app))
        .route("/desktop", axum::routing::get(get_desktop_bundle))
        .route(
            "/apps/{app_id}",
            axum::routing::get(get_app)
                .patch(update_app)
                .delete(delete_app),
        )
}

pub(crate) async fn create_app(
    State(services): State<Services>,
    TenantContext(ctx): TenantContext,
    AuthContext(auth_ctx): AuthContext,
    Json(payload): Json<CreateAppPayload>,
) -> Result<impl IntoResponse, GatewayError> {
    let tenant_id = require_tenant_id(&ctx)?;
    let caller_id = require_actor_id(&auth_ctx)?;

    let app_type: AppType = payload
        .r#type
        .parse()
        .map_err(|_| GatewayError::BadRequest("Invalid app type".into()))?;

    let app = services
        .desktop_apps
        .create_app(
            &ctx,
            tenant_id,
            app_type,
            payload.title,
            payload.content.unwrap_or(serde_json::json!({})),
            payload.menu_config.unwrap_or(serde_json::json!({})),
            Some(caller_id),
            caller_id,
            false,
        )
        .await?;

    Ok((
        StatusCode::CREATED,
        Json(SuccessResponse::ok(AppResponse::from(app))),
    ))
}

pub(crate) async fn get_desktop_bundle(
    State(services): State<Services>,
    TenantContext(ctx): TenantContext,
    AuthContext(auth_ctx): AuthContext,
) -> Result<impl IntoResponse, GatewayError> {
    let tenant_id = require_tenant_id(&ctx)?;
    let caller_id = require_actor_id(&auth_ctx)?;

    let apps = services
        .desktop_apps
        .get_desktop_bundle(&ctx, tenant_id, caller_id)
        .await?;
    let app_summaries: Vec<AppSummary> = apps.into_iter().map(AppSummary::from).collect();

    Ok(Json(SuccessResponse::ok(DesktopBundleResponse {
        apps: app_summaries,
    })))
}

pub(crate) async fn get_app(
    State(services): State<Services>,
    TenantContext(ctx): TenantContext,
    AuthContext(auth_ctx): AuthContext,
    Path((_tenant_slug, app_id)): Path<(String, Uuid)>,
) -> Result<impl IntoResponse, GatewayError> {
    let tenant_id = require_tenant_id(&ctx)?;
    let caller_id = require_actor_id(&auth_ctx)?;

    let app = services
        .desktop_apps
        .get_app(&ctx, tenant_id, app_id, caller_id)
        .await?;
    Ok(Json(SuccessResponse::ok(AppResponse::from(app))))
}

pub(crate) async fn update_app(
    State(services): State<Services>,
    TenantContext(ctx): TenantContext,
    AuthContext(auth_ctx): AuthContext,
    Path((_tenant_slug, app_id)): Path<(String, Uuid)>,
    Json(payload): Json<UpdateAppPayload>,
) -> Result<impl IntoResponse, GatewayError> {
    let tenant_id = require_tenant_id(&ctx)?;
    let caller_id = require_actor_id(&auth_ctx)?;

    let app = services
        .desktop_apps
        .update_app(
            &ctx,
            tenant_id,
            app_id,
            caller_id,
            false,
            payload.etag,
            payload.title,
            payload.content,
            payload.menu_config,
        )
        .await?;

    Ok(Json(SuccessResponse::ok(AppResponse::from(app))))
}

pub(crate) async fn delete_app(
    State(services): State<Services>,
    TenantContext(ctx): TenantContext,
    AuthContext(auth_ctx): AuthContext,
    Path((_tenant_slug, app_id)): Path<(String, Uuid)>,
) -> Result<impl IntoResponse, GatewayError> {
    let tenant_id = require_tenant_id(&ctx)?;
    let caller_id = require_actor_id(&auth_ctx)?;

    services
        .desktop_apps
        .delete_app(&ctx, tenant_id, app_id, caller_id, false)
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

fn require_tenant_id(ctx: &ExecutionContext) -> Result<Uuid, GatewayError> {
    ctx.tenant_id()
        .map(|id| id.inner())
        .ok_or_else(|| GatewayError::BadRequest("Tenant context missing".into()))
}

fn require_actor_id(ctx: &ExecutionContext) -> Result<Uuid, GatewayError> {
    ctx.actor_id
        .ok_or_else(|| GatewayError::Unauthorized("Authenticated user required".into()))
}

#[derive(serde::Deserialize)]
pub(crate) struct CreateAppPayload {
    pub r#type: String,
    pub title: String,
    pub content: Option<serde_json::Value>,
    pub menu_config: Option<serde_json::Value>,
}

#[derive(serde::Deserialize)]
pub(crate) struct UpdateAppPayload {
    pub etag: String,
    pub title: Option<String>,
    pub content: Option<serde_json::Value>,
    pub menu_config: Option<serde_json::Value>,
}

#[derive(serde::Serialize)]
pub(crate) struct AppResponse {
    pub id: Uuid,
    pub r#type: String,
    pub title: String,
    pub content: serde_json::Value,
    pub menu_config: serde_json::Value,
    pub owner_id: Option<Uuid>,
    pub locked: bool,
    pub etag: String,
}

impl From<DesktopApp> for AppResponse {
    fn from(app: DesktopApp) -> Self {
        Self {
            id: app.id,
            r#type: app.app_type.as_str().to_string(),
            title: app.title,
            content: app.content,
            menu_config: app.menu_config,
            owner_id: app.owner_id,
            locked: app.locked,
            etag: app.etag,
        }
    }
}

#[derive(serde::Serialize)]
pub(crate) struct AppSummary {
    pub id: Uuid,
    pub r#type: String,
    pub title: String,
    pub owner_id: Option<Uuid>,
    pub locked: bool,
    pub etag: String,
}

impl From<DesktopApp> for AppSummary {
    fn from(app: DesktopApp) -> Self {
        Self {
            id: app.id,
            r#type: app.app_type.as_str().to_string(),
            title: app.title,
            owner_id: app.owner_id,
            locked: app.locked,
            etag: app.etag,
        }
    }
}

#[derive(serde::Serialize)]
pub(crate) struct DesktopBundleResponse {
    pub apps: Vec<AppSummary>,
}
