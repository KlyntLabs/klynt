//! Data retention cleanup job.
//!
//! Periodically purges stale sessions, expired email verification tokens, and
//! old audit events. Designed to be spawned as a background task by the server
//! binary.

use chrono::{Duration, Utc};
use sqlx::PgPool;
use std::future::Future;

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
            .purge_batched("sessions", || async {
                sqlx::query!(
                    r#"
                    DELETE FROM sessions
                    WHERE id IN (
                        SELECT id FROM sessions
                        WHERE expires_at < $1
                        ORDER BY id
                        LIMIT $2
                    )
                    "#,
                    now,
                    self.batch_size,
                )
                .execute(&self.pool)
                .await
                .map(|r| r.rows_affected())
            })
            .await?;

        let token_cutoff = now - Duration::days(self.token_retention_days);
        let tokens_deleted = self
            .purge_batched("email_verification_tokens", || async {
                sqlx::query!(
                    r#"
                    DELETE FROM email_verification_tokens
                    WHERE id IN (
                        SELECT id FROM email_verification_tokens
                        WHERE expires_at < $1
                        ORDER BY id
                        LIMIT $2
                    )
                    "#,
                    token_cutoff,
                    self.batch_size,
                )
                .execute(&self.pool)
                .await
                .map(|r| r.rows_affected())
            })
            .await?;

        let audit_cutoff = now - Duration::days(self.audit_retention_days);
        let audit_deleted = self
            .purge_batched("audit_events", || async {
                sqlx::query!(
                    r#"
                    DELETE FROM audit_events
                    WHERE id IN (
                        SELECT id FROM audit_events
                        WHERE created_at < $1
                        ORDER BY id
                        LIMIT $2
                    )
                    "#,
                    audit_cutoff,
                    self.batch_size,
                )
                .execute(&self.pool)
                .await
                .map(|r| r.rows_affected())
            })
            .await?;

        tracing::info!(
            sessions_deleted,
            tokens_deleted,
            audit_deleted,
            "cleanup job completed"
        );

        Ok(())
    }

    /// Run `run_one_batch` repeatedly until it deletes fewer than `batch_size`
    /// rows, accumulating the total. Each `run_one_batch` closure owns a static
    /// SQL literal so every statement is checked by sqlx at compile time.
    async fn purge_batched<F, Fut>(
        &self,
        table_name: &'static str,
        mut run_one_batch: F,
    ) -> Result<u64, sqlx::Error>
    where
        F: FnMut() -> Fut,
        Fut: Future<Output = Result<u64, sqlx::Error>>,
    {
        let mut total_deleted = 0u64;
        // Cap at 1M rows per table per run to prevent the cleanup job from
        // running indefinitely and monopolizing the database.
        let max_iterations = 1000usize;

        for _ in 0..max_iterations {
            let deleted = run_one_batch().await?;
            total_deleted += deleted;
            if deleted < self.batch_size as u64 {
                return Ok(total_deleted);
            }
        }

        tracing::warn!(
            total_deleted,
            table = table_name,
            "cleanup batch deletion reached iteration limit; remaining rows may still exist"
        );

        Ok(total_deleted)
    }
}
