use std::net::SocketAddr;

use axum::serve;
use klynt_infrastructure::config::load_config;
use klynt_server::composition::build_app;
use tokio::net::TcpListener;
use tracing::info;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    let config = load_config()?;
    klynt_server::telemetry::init_telemetry(&config.log_level);

    let app = build_app(config.clone());

    let addr = format!("{}:{}", config.api.host, config.api.port);
    let listener = TcpListener::bind(&addr).await?;

    info!("server listening on http://{}", addr);

    let make_service = app.into_make_service_with_connect_info::<SocketAddr>();
    let server = serve(listener, make_service);

    tokio::select! {
        result = server => result?,
        _ = tokio::signal::ctrl_c() => {
            info!("received shutdown signal, stopping server");
        }
    }

    Ok(())
}
