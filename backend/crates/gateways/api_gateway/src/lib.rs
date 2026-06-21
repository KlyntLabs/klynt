//! # API Gateway
//!
//! HTTP entry point for the Klynt platform.
//!
//! ## Design
//!
//! This is a **deep module**: single public function that starts the entire server.
//!
//! - **Interface**: `run(config, services)` — one function to rule them all
//! - **Implementation**: All HTTP complexity (routing, middleware, services) hidden inside
//! - **Composition Root**: Services are wired together in [`state::Services`]

pub mod error;
pub mod middleware;
pub mod response;
pub mod routes;
pub mod state;

use axum::Router;
use state::Services;

pub use error::{GatewayError, GatewayResult};
pub use state::Config;

/// Run the API gateway — the single public interface.
///
/// This function:
/// 1. Initializes tracing
/// 2. Builds the router with all routes and middleware
/// 3. Starts the HTTP server
///
/// ## Arguments
///
/// - `config` - Gateway configuration
/// - `services` - All business services
///
/// ## Returns
///
/// Returns `Ok(())` when server shuts down gracefully, or error on failure.
pub async fn run(config: Config, services: Services) -> Result<(), GatewayError> {
    klynt_tracing::subscriber::init_tracing(&config.service_name);

    let app = routes::create_router(config.clone(), services);

    let listener = tokio::net::TcpListener::bind(&config.bind_address)
        .await
        .map_err(|e| {
            GatewayError::configuration(format!("Failed to bind to {}: {}", config.bind_address, e))
        })?;

    tracing::info!("API Gateway listening on {}", config.bind_address);

    axum::serve(listener, app)
        .await
        .map_err(|e| GatewayError::internal(format!("Server error: {e}")))?;

    Ok(())
}

/// Create the router (for testing and composition).
pub fn create_router(config: Config, services: Services) -> Router {
    routes::create_router(config, services)
}
