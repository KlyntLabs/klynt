use async_trait::async_trait;
use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use klynt_domain::ctx::Ctx;
use klynt_domain::errors::DomainError;
use klynt_domain::models::UserId;
use klynt_domain::session::{Session, SessionStore, SessionToken};

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
        _ctx: &Ctx,
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
        _ctx: &Ctx,
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

    async fn revoke(&self, _ctx: &Ctx, token: &SessionToken) -> Result<(), DomainError> {
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
