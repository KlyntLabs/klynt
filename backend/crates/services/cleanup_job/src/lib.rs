//! Data retention cleanup job.
//!
//! Periodically purges stale sessions, expired email verification tokens, and
//! old audit events. Designed to be spawned as a background task by the server
//! binary.

use chrono::{Duration, Utc};
use sqlx::PgPool;

/// Background job that removes data older than configured retention windows.
#[derive(Clone)]
pub struct CleanupJob {
    pool: PgPool,
    token_retention_days: i64,
    audit_retention_days: i64,
}

impl CleanupJob {
    /// Create a cleanup job using the default retention windows.
    pub fn new(pool: PgPool) -> Self {
        Self {
            pool,
            token_retention_days: 7,
            audit_retention_days: 365,
        }
    }

    /// Run the cleanup once, logging the number of rows removed per table.
    pub async fn run_once(&self) -> Result<(), sqlx::Error> {
        let now = Utc::now();

        let sessions_deleted = sqlx::query("DELETE FROM sessions WHERE expires_at < $1")
            .bind(now)
            .execute(&self.pool)
            .await?
            .rows_affected();

        let tokens_deleted =
            sqlx::query("DELETE FROM email_verification_tokens WHERE expires_at < $1")
                .bind(now - Duration::days(self.token_retention_days))
                .execute(&self.pool)
                .await?
                .rows_affected();

        let audit_deleted = sqlx::query("DELETE FROM audit_events WHERE created_at < $1")
            .bind(now - Duration::days(self.audit_retention_days))
            .execute(&self.pool)
            .await?
            .rows_affected();

        tracing::info!(
            sessions_deleted,
            tokens_deleted,
            audit_deleted,
            "cleanup job completed"
        );

        Ok(())
    }
}
