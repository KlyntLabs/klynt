use std::sync::Arc;

use axum::{
    middleware,
    routing::{get, post},
    Router,
};

use crate::middleware::ctx_require;
use crate::state::AppState;

pub mod health;
pub mod sessions;
pub mod users;

pub fn router() -> Router<Arc<AppState>> {
    let public = Router::new()
        .route("/health/live", get(health::liveness))
        .route("/health/ready", get(health::readiness))
        .route("/sessions", post(sessions::login))
        .route("/users", post(users::create_user));

    let protected = Router::new()
        .route("/users/me", get(users::get_me))
        .route_layer(middleware::from_fn(ctx_require));

    public.merge(protected)
}
