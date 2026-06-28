//! Data retention cleanup job.
//!
//! Periodically purges stale sessions, expired email verification tokens, and
//! old audit events. Designed to be spawned as a background task by the server
//! binary.

use chrono::{Duration, Utc};
use sqlx::PgPool;

/// Default number of rows to delete per batch.
///
/// Smaller batches keep individual transactions short, reduce lock contention,
/// and prevent the cleanup job from monopolizing the WAL on busy systems.
const DEFAULT_BATCH_SIZE: i64 = 1000;

/// Background job that removes data older than configured retention windows.
#[derive(Clone)]
pub struct CleanupJob {
    pool: PgPool,
    token_retention_days: i64,
    audit_retention_days: i64,
    batch_size: i64,
}

impl CleanupJob {
    /// Create a cleanup job using the default retention windows.
    pub fn new(pool: PgPool) -> Self {
        Self {
            pool,
            token_retention_days: 7,
            audit_retention_days: 365,
            batch_size: DEFAULT_BATCH_SIZE,
        }
    }

    /// Run the cleanup once, logging the number of rows removed per table.
    pub async fn run_once(&self) -> Result<(), sqlx::Error> {
        let now = Utc::now();

        let sessions_deleted = self
            .delete_in_batches("sessions", "expires_at", now)
            .await?;

        let tokens_deleted = self
            .delete_in_batches(
                "email_verification_tokens",
                "expires_at",
                now - Duration::days(self.token_retention_days),
            )
            .await?;

        let audit_deleted = self
            .delete_in_batches(
                "audit_events",
                "created_at",
                now - Duration::days(self.audit_retention_days),
            )
            .await?;

        tracing::info!(
            sessions_deleted,
            tokens_deleted,
            audit_deleted,
            "cleanup job completed"
        );

        Ok(())
    }

    /// Delete rows older than `before` from `table` in bounded batches.
    async fn delete_in_batches(
        &self,
        table: &str,
        column: &str,
        before: chrono::DateTime<Utc>,
    ) -> Result<u64, sqlx::Error> {
        let mut total_deleted = 0u64;

        loop {
            let deleted = sqlx::query(&format!(
                r#"
                DELETE FROM {table}
                WHERE id IN (
                    SELECT id FROM {table}
                    WHERE {column} < $1
                    LIMIT $2
                )
                "#,
            ))
            .bind(before)
            .bind(self.batch_size)
            .execute(&self.pool)
            .await?
            .rows_affected();

            total_deleted += deleted;

            if deleted < self.batch_size as u64 {
                break;
            }
        }

        Ok(total_deleted)
    }
}
