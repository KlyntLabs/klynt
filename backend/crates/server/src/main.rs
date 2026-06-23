use cleanup_job::CleanupJob;
use gateways::{run, Config, GatewayError, Services};

#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    dotenvy::dotenv().ok();

    let config = Config::from_env().map_err(|e| GatewayError::configuration(e.to_string()))?;
    let services = Services::from_config(&config).await?;

    let cleanup_job = CleanupJob::new(services.pool.clone());
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(3600));
        loop {
            interval.tick().await;
            if let Err(e) = cleanup_job.run_once().await {
                tracing::error!(error = %e, "cleanup job failed");
            }
        }
    });

    run(config, services).await?;

    Ok(())
}
