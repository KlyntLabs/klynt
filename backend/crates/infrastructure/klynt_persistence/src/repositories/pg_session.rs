use async_trait::async_trait;
use chrono::{DateTime, Utc};
use klynt_base::ctx::ExecutionContext;
use klynt_base::ports::session::{Session, SessionError, SessionStore, SessionToken};
use klynt_domain::UserId;
use sqlx::PgPool;
use uuid::Uuid;

/// PostgreSQL implementation of the session store.
pub struct PgSessionStore {
    pool: PgPool,
}

impl PgSessionStore {
    /// Create a new store backed by `pool`.
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Return the underlying connection pool.
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
    ) -> Result<SessionToken, SessionError> {
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
        .await?;

        Ok(token)
    }

    async fn find_valid(
        &self,
        _ctx: &ExecutionContext,
        token: &SessionToken,
    ) -> Result<Option<Session>, SessionError> {
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
        .await?;

        Ok(row.map(|(user_id, expires_at)| Session {
            user_id: UserId(user_id),
            expires_at,
        }))
    }

    async fn revoke(
        &self,
        _ctx: &ExecutionContext,
        token: &SessionToken,
    ) -> Result<(), SessionError> {
        sqlx::query(
            r#"
            DELETE FROM sessions
            WHERE token = $1
            "#,
        )
        .bind(token.0)
        .execute(&self.pool)
        .await?;

        Ok(())
    }
}
