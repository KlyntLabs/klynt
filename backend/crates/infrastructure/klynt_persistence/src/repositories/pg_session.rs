use async_trait::async_trait;
use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::session::{Session, SessionStore, SessionToken};
use klynt_base::ctx::ExecutionContext;
use klynt_common::domain::DomainError;
use klynt_common::util::UserId;

/// PostgreSQL implementation of the session store.
pub struct PgSessionStore {
    pool: PgPool,
}

impl PgSessionStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub fn pool(&self) -> &PgPool {
        &self.pool
    }
}

#[async_trait]
impl SessionStore for PgSessionStore {
    async fn create(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
        expires_at: DateTime<Utc>,
    ) -> Result<SessionToken, DomainError> {
        let token = SessionToken::new();

        sqlx::query(
            r#"
            INSERT INTO sessions (token, user_id, expires_at)
            VALUES ($1, $2, $3)
            "#,
        )
        .bind(token.0)
        .bind(user_id.0)
        .bind(expires_at)
        .execute(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        Ok(token)
    }

    async fn find_valid(
        &self,
        _ctx: &ExecutionContext,
        token: &SessionToken,
    ) -> Result<Option<Session>, DomainError> {
        let row: Option<(Uuid, DateTime<Utc>)> = sqlx::query_as(
            r#"
            SELECT user_id, expires_at
            FROM sessions
            WHERE token = $1
              AND expires_at > NOW()
            "#,
        )
        .bind(token.0)
        .fetch_optional(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        Ok(row.map(|(user_id, expires_at)| Session {
            token: *token,
            user_id: UserId(user_id),
            expires_at,
        }))
    }

    async fn revoke(
        &self,
        _ctx: &ExecutionContext,
        token: &SessionToken,
    ) -> Result<(), DomainError> {
        sqlx::query(
            r#"
            DELETE FROM sessions
            WHERE token = $1
            "#,
        )
        .bind(token.0)
        .execute(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        Ok(())
    }
}
