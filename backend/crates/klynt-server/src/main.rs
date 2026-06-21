use api_gateway::{run, Config, GatewayError, Services};

#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    dotenvy::dotenv().ok();

    let config = Config::from_env().map_err(|e| GatewayError::configuration(e.to_string()))?;
    let services = Services::from_config(&config).await?;

    run(config, services).await?;

    Ok(())
}
