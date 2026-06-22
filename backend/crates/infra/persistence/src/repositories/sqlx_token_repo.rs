use async_trait::async_trait;
use base::ctx::ExecutionContext;
use base::ports::token::{TokenError, TokenKind, TokenStore};
use chrono::{DateTime, Utc};
use domain::UserId;
use sqlx::PgPool;

/// PostgreSQL implementation of [`TokenStore`].
///
/// Uses static SQL queries selected by [`TokenKind`] so all SQL is
/// checked by sqlx at compile time. The `consume` method does
/// find + mark-used atomically via a single `UPDATE ... RETURNING`
/// statement.
pub struct PgTokenStore {
    pool: PgPool,
}

impl PgTokenStore {
    /// Create a new store backed by `pool`.
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl TokenStore for PgTokenStore {
    async fn save(
        &self,
        _ctx: &ExecutionContext,
        kind: TokenKind,
        user_id: UserId,
        token_hash: String,
        expires_at: DateTime<Utc>,
    ) -> Result<(), TokenError> {
        let result = match kind {
            TokenKind::EmailVerification => {
                sqlx::query(
                    r#"
                    INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
                    VALUES ($1, $2, $3)
                    "#,
                )
                .bind(user_id.0)
                .bind(&token_hash)
                .bind(expires_at)
                .execute(&self.pool)
                .await
            }
            TokenKind::PasswordReset => {
                sqlx::query(
                    r#"
                    INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
                    VALUES ($1, $2, $3)
                    "#,
                )
                .bind(user_id.0)
                .bind(&token_hash)
                .bind(expires_at)
                .execute(&self.pool)
                .await
            }
        };

        result?;
        Ok(())
    }

    async fn consume(
        &self,
        _ctx: &ExecutionContext,
        kind: TokenKind,
        token_hash: String,
    ) -> Result<UserId, TokenError> {
        let result = match kind {
            TokenKind::EmailVerification => {
                sqlx::query_scalar::<_, uuid::Uuid>(
                    r#"
                    UPDATE email_verification_tokens
                    SET used_at = NOW()
                    WHERE token_hash = $1
                      AND used_at IS NULL
                      AND expires_at > NOW()
                    RETURNING user_id
                    "#,
                )
                .bind(&token_hash)
                .fetch_optional(&self.pool)
                .await
            }
            TokenKind::PasswordReset => {
                sqlx::query_scalar::<_, uuid::Uuid>(
                    r#"
                    UPDATE password_reset_tokens
                    SET used_at = NOW()
                    WHERE token_hash = $1
                      AND used_at IS NULL
                      AND expires_at > NOW()
                    RETURNING user_id
                    "#,
                )
                .bind(&token_hash)
                .fetch_optional(&self.pool)
                .await
            }
        };

        result?.map(UserId).ok_or(TokenError::Invalid)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use base::ctx::RequestContext;
    use uuid::Uuid;

    async fn test_pool() -> PgPool {
        let url = std::env::var("DATABASE_URL")
            .unwrap_or_else(|_| "postgresql://klynt:klynt@localhost:5432/test".to_string());
        let pool = PgPool::connect(&url).await.unwrap();
        sqlx::migrate!("../../../migrations")
            .run(&pool)
            .await
            .unwrap();
        pool
    }

    async fn seed_user(pool: &PgPool) -> UserId {
        let user_id = UserId::new();
        sqlx::query(
            r#"
            INSERT INTO users (id, email, name, password_hash, status, terms_accepted_at, terms_version, role)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            "#,
        )
        .bind(user_id.0)
        .bind(format!("test-{}@example.com", user_id.0))
        .bind("Test User")
        .bind("hash")
        .bind("active")
        .bind(Utc::now())
        .bind("1.0")
        .bind("student")
        .execute(pool)
        .await
        .unwrap();
        user_id
    }

    #[tokio::test]
    async fn saves_and_consumes_email_verification_token() {
        let pool = test_pool().await;
        let store = PgTokenStore::new(pool.clone());
        let ctx = ExecutionContext::new(RequestContext::new());

        let user_id = seed_user(&pool).await;
        let token_hash = format!("hash-{}", Uuid::new_v4());
        let expires_at = Utc::now() + chrono::Duration::hours(24);

        store
            .save(
                &ctx,
                TokenKind::EmailVerification,
                user_id,
                token_hash.clone(),
                expires_at,
            )
            .await
            .unwrap();

        let result = store
            .consume(&ctx, TokenKind::EmailVerification, token_hash)
            .await
            .unwrap();
        assert_eq!(result, user_id);
    }

    #[tokio::test]
    async fn saves_and_consumes_password_reset_token() {
        let pool = test_pool().await;
        let store = PgTokenStore::new(pool.clone());
        let ctx = ExecutionContext::new(RequestContext::new());

        let user_id = seed_user(&pool).await;
        let token_hash = format!("hash-reset-{}", Uuid::new_v4());
        let expires_at = Utc::now() + chrono::Duration::minutes(30);

        store
            .save(
                &ctx,
                TokenKind::PasswordReset,
                user_id,
                token_hash.clone(),
                expires_at,
            )
            .await
            .unwrap();

        let result = store
            .consume(&ctx, TokenKind::PasswordReset, token_hash)
            .await
            .unwrap();
        assert_eq!(result, user_id);
    }

    #[tokio::test]
    async fn double_consume_fails() {
        let pool = test_pool().await;
        let store = PgTokenStore::new(pool.clone());
        let ctx = ExecutionContext::new(RequestContext::new());

        let user_id = seed_user(&pool).await;
        let token_hash = format!("hash-used-{}", Uuid::new_v4());
        let expires_at = Utc::now() + chrono::Duration::hours(24);

        store
            .save(
                &ctx,
                TokenKind::EmailVerification,
                user_id,
                token_hash.clone(),
                expires_at,
            )
            .await
            .unwrap();

        let first = store
            .consume(&ctx, TokenKind::EmailVerification, token_hash.clone())
            .await;
        assert!(first.is_ok());

        let second = store
            .consume(&ctx, TokenKind::EmailVerification, token_hash)
            .await;
        assert!(matches!(second, Err(TokenError::Invalid)));
    }

    #[tokio::test]
    async fn expired_token_cannot_be_consumed() {
        let pool = test_pool().await;
        let store = PgTokenStore::new(pool.clone());
        let ctx = ExecutionContext::new(RequestContext::new());

        let user_id = seed_user(&pool).await;
        let token_hash = format!("hash-expired-{}", Uuid::new_v4());
        let expires_at = Utc::now() - chrono::Duration::seconds(1);

        store
            .save(
                &ctx,
                TokenKind::PasswordReset,
                user_id,
                token_hash.clone(),
                expires_at,
            )
            .await
            .unwrap();

        let result = store
            .consume(&ctx, TokenKind::PasswordReset, token_hash)
            .await;
        assert!(matches!(result, Err(TokenError::Invalid)));
    }
}
