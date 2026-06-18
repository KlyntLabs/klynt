use std::net::SocketAddr;
use std::sync::Arc;

use axum::serve;
use klynt_api::startup::build_router;
use klynt_api::state::AppState;
use klynt_application::request_gate::RequestGate;
use klynt_application::users::UserService;
use klynt_domain::ports::IdempotencyStore;
use klynt_domain::ports::RateLimiter;
use klynt_domain::unit_of_work::UnitOfWork;
use klynt_infrastructure::config::load_config;
use klynt_infrastructure::rate_limiter::RateLimiter as InMemoryRateLimiter;
use klynt_infrastructure::repositories::idempotency::InMemoryIdempotencyStore;
use klynt_infrastructure::repositories::in_memory_user::InMemoryUserRepository;
use klynt_infrastructure::unit_of_work::InMemoryUnitOfWork;
use tokio::net::TcpListener;
use tracing::info;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    let config = load_config()?;
    klynt_server::telemetry::init_telemetry(&config.log_level);

    let request_gate = build_request_gate(config.clone());
    let state = Arc::new(AppState::new(config.clone(), request_gate));
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

fn build_request_gate(config: klynt_domain::config::AppConfig) -> Arc<RequestGate> {
    let user_repo = InMemoryUserRepository::new();
    let uow: Arc<dyn UnitOfWork> = Arc::new(InMemoryUnitOfWork::new(user_repo));
    let user_service = Arc::new(UserService::new(uow));
    let rate_limiter: Arc<dyn RateLimiter> =
        Arc::new(InMemoryRateLimiter::new(config.rate_limiter));
    let idempotency_store: Arc<dyn IdempotencyStore> = Arc::new(InMemoryIdempotencyStore::new());

    Arc::new(RequestGate::new(
        rate_limiter,
        idempotency_store,
        user_service,
    ))
}
