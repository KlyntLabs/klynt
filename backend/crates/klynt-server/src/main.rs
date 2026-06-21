use std::net::SocketAddr;

use axum::serve;
use axum::{middleware, routing::get};
use klynt_infrastructure::config::load_config;
use klynt_server::composition::build_app;
use klynt_server::metrics::{init_metrics, metrics_handler, metrics_middleware};
use tokio::net::TcpListener;
use tracing::info;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    let config = load_config()?;
    klynt_server::telemetry::init_telemetry(&config.log_level);
    init_metrics();

    let app = build_app(config.clone()).await;

    // Apply metrics middleware to the application router first, then expose
    // /metrics outside the middleware so scrape traffic doesn't measure itself.
    let app = app
        .layer(middleware::from_fn(metrics_middleware))
        .route("/metrics", get(metrics_handler));

    let addr = format!("{}:{}", config.api.host, config.api.port);
    let listener = TcpListener::bind(&addr).await?;

    info!("server listening on http://{}", addr);
    info!("metrics available at http://{}/metrics", addr);

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
