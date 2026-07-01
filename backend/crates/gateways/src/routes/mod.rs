//! HTTP route definitions.

pub mod auth;
pub mod desktop_apps;
pub mod health;
pub mod metrics;
pub mod openapi;
pub mod permissions;
pub mod roles;
pub mod tenant_desktop_layout;
pub mod tenants;
pub mod users;

use axum::{http::HeaderValue, middleware, Router};
use tower_cookies::CookieManagerLayer;

use crate::state::{Config, Services};

/// Create the complete router with all routes and middleware.
pub fn create_router(config: Config, services: Services) -> Router {
    let hsts_enabled = config.hsts_enabled;
    let csp_report_only = config.csp_report_only;
    let csp_directive = HeaderValue::from_str(&config.csp_directive)
        .expect("CSP directive should have been validated at config load time");
    let allowed_origins = config.allowed_origins.clone();

    Router::new()
        // Health checks (no auth required)
        .route("/health", axum::routing::get(health::health_check))
        .route("/health/live", axum::routing::get(health::live_check))
        .route("/health/ready", axum::routing::get(health::ready_check))
        // Prometheus metrics (no auth required)
        .route("/metrics", axum::routing::get(metrics::metrics))
        // OpenAPI spec
        .route("/openapi.json", axum::routing::get(openapi::openapi_spec))
        // API v1 routes
        .nest("/api/v1", api_v1_routes(services.clone()))
        // CORS (applies to all routes)
        .layer(crate::middleware::cors::cors_layer(&allowed_origins))
        // Security headers
        .layer(axum::middleware::from_fn(move |req, next| {
            crate::middleware::security_headers::security_headers(
                hsts_enabled,
                csp_report_only,
                csp_directive.clone(),
                req,
                next,
            )
        }))
        // Request ID (applies to all routes)
        .layer(axum::middleware::from_fn(
            crate::middleware::request_id::request_id_middleware,
        ))
        // Error handler
        .layer(axum::middleware::from_fn(
            crate::middleware::error_handler::error_handler_middleware,
        ))
        // Request metrics (outermost layer so it observes final status)
        .layer(axum::middleware::from_fn(crate::middleware::metrics::track))
        .with_state(services)
}

/// API v1 routes.
fn api_v1_routes(services: Services) -> Router<Services> {
    let auth_routes = auth_routes(services.clone());

    let protected_user_routes = users::routes().layer(middleware::from_fn_with_state(
        services.clone(),
        crate::middleware::auth::require_auth,
    ));

    let tenant_routes = tenants::routes(services.clone()).layer(middleware::from_fn_with_state(
        services.clone(),
        crate::middleware::auth::require_auth,
    ));

    let permissions_routes = Router::new()
        .route(
            "/permissions",
            axum::routing::get(permissions::list_permissions),
        )
        .layer(middleware::from_fn_with_state(
            services,
            crate::middleware::auth::require_auth,
        ));

    Router::new()
        // Auth routes (no authentication required)
        .nest("/auth", auth_routes)
        // Protected routes (require authentication)
        .nest("/users", protected_user_routes)
        .nest("/tenants", tenant_routes)
        .merge(permissions_routes)
        .layer(CookieManagerLayer::new())
}

/// Auth routes with per-route rate limiting.
fn auth_routes(services: Services) -> Router<Services> {
    let unprotected = Router::new()
        .route(
            "/login",
            axum::routing::post(auth::login).layer(middleware::from_fn_with_state(
                services.clone(),
                crate::middleware::rate_limit::rate_limit_login,
            )),
        )
        .route(
            "/register",
            axum::routing::post(auth::register).layer(middleware::from_fn_with_state(
                services.clone(),
                crate::middleware::rate_limit::rate_limit_register,
            )),
        )
        .route("/verify-email", axum::routing::post(auth::verify_email))
        .route(
            "/request-password-reset",
            axum::routing::post(auth::request_password_reset),
        )
        .route("/reset-password", axum::routing::post(auth::reset_password))
        .route("/logout", axum::routing::post(auth::logout));

    let protected = Router::new()
        .route("/sessions", axum::routing::get(auth::list_sessions))
        .route(
            "/sessions/{session_id}",
            axum::routing::delete(auth::revoke_session),
        )
        .layer(middleware::from_fn_with_state(
            services.clone(),
            crate::middleware::auth::require_auth,
        ));

    Router::new().merge(unprotected).merge(protected)
}
