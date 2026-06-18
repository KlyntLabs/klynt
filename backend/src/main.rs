use std::net::SocketAddr;
use std::sync::Arc;

use axum::serve;
use klynt_api::{config::AppConfig, startup::build_router, state::AppState, telemetry};
use tokio::net::TcpListener;
use tracing::info;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    let config = AppConfig::load()?;
    telemetry::init_telemetry(&config.log_level);

    let state = Arc::new(AppState::new(config.clone()));
    let app = build_router(state);

    let addr = format!("{}:{}", config.api.host, config.api.port);
    let listener = TcpListener::bind(&addr).await?;

    info!("server listening on http://{}", addr);

    serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await?;
    Ok(())
}
