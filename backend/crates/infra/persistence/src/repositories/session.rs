use async_trait::async_trait;
use base::ctx::ExecutionContext;
use base::ports::session::{Session, SessionError, SessionKind, SessionStore, SessionToken};
use chrono::{DateTime, Utc};
use domain::UserId;
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
        kind: SessionKind,
        pair_id: Option<Uuid>,
        expires_at: DateTime<Utc>,
    ) -> Result<SessionToken, SessionError> {
        let token = SessionToken::new();

        sqlx::query(
            r#"
            INSERT INTO sessions (token, user_id, kind, pair_id, expires_at)
            VALUES ($1, $2, $3, $4, $5)
            "#,
        )
        .bind(token.0)
        .bind(user_id.0)
        .bind(kind.as_str())
        .bind(pair_id)
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
        let row: Option<(Uuid, String, Option<Uuid>, DateTime<Utc>)> = sqlx::query_as(
            r#"
            SELECT user_id, kind, pair_id, expires_at
            FROM sessions
            WHERE token = $1
              AND expires_at > NOW()
            "#,
        )
        .bind(token.0)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|(user_id, kind, pair_id, expires_at)| Session {
            user_id: UserId(user_id),
            expires_at,
            kind: SessionKind::try_from(kind.as_str()).unwrap_or(SessionKind::Access),
            pair_id,
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

    async fn revoke_pair(
        &self,
        _ctx: &ExecutionContext,
        pair_id: Uuid,
        except_token: &SessionToken,
    ) -> Result<(), SessionError> {
        sqlx::query(
            r#"
            DELETE FROM sessions
            WHERE pair_id = $1
              AND token <> $2
            "#,
        )
        .bind(pair_id)
        .bind(except_token.0)
        .execute(&self.pool)
        .await?;

        Ok(())
    }
}
