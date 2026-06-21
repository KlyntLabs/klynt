//! Database client and connection management.

use crate::StorageError;
use sqlx::{postgres::PgPoolOptions, Pool, Postgres};
use tracing::info;

/// Database connection pool
pub type DbPool = Pool<Postgres>;

/// Create database connection pool
pub async fn create_pool(database_url: &str) -> Result<DbPool, StorageError> {
    info!("Creating database connection pool");

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(database_url)
        .await
        .map_err(|e| StorageError::Connection(e.to_string()))?;

    info!("Database connection pool created");

    Ok(pool)
}

/// Health check for database
pub async fn health_check(pool: &DbPool) -> bool {
    sqlx::query("SELECT 1").fetch_one(pool).await.is_ok()
}
