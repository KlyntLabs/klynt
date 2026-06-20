use async_trait::async_trait;
use chrono::{DateTime, Utc};
use sqlx::PgPool;

use klynt_domain::ctx::Ctx;
use klynt_domain::errors::{DomainError, TokenError};
use klynt_domain::models::UserId;
use klynt_domain::repositories::TokenStore;
use klynt_domain::tokens::TokenKind;

/// PostgreSQL implementation of [`TokenStore`].
///
/// Uses an explicit, exhaustive whitelist of table names.
/// The `consume` method does find + mark-used atomically via
/// a single `UPDATE ... RETURNING` statement.
pub struct PgTokenStore {
    pool: PgPool,
}

impl PgTokenStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

/// Allowed token tables.
///
/// `TokenKind::table()` is the single source of truth for table names.
/// This whitelist is an exhaustive safeguard: only the two known variants
/// are accepted, so the value can never come from user input.
fn table_name(kind: TokenKind) -> &'static str {
    match kind {
        TokenKind::EmailVerification => TokenKind::EmailVerification.table(),
        TokenKind::PasswordReset => TokenKind::PasswordReset.table(),
    }
}

#[async_trait]
impl TokenStore for PgTokenStore {
    async fn save(
        &self,
        _ctx: &Ctx,
        kind: TokenKind,
        user_id: UserId,
        token_hash: &str,
        expires_at: DateTime<Utc>,
    ) -> Result<(), DomainError> {
        let table = table_name(kind);
        let sql = format!(
            r#"
            INSERT INTO {table} (user_id, token_hash, expires_at)
            VALUES ($1, $2, $3)
            "#
        );

        sqlx::query(&sql)
            .bind(user_id.0)
            .bind(token_hash)
            .bind(expires_at)
            .execute(&self.pool)
            .await
            .map_err(DomainError::internal)?;

        Ok(())
    }

    async fn consume(
        &self,
        _ctx: &Ctx,
        kind: TokenKind,
        token_hash: &str,
    ) -> Result<UserId, DomainError> {
        let table = table_name(kind);

        // Atomic: mark an unused, unexpired token as used and return its user_id.
        // If no row matches, the token was invalid, expired, or already used.
        let sql = format!(
            r#"
            UPDATE {table}
            SET used_at = NOW()
            WHERE token_hash = $1
              AND used_at IS NULL
              AND expires_at > NOW()
            RETURNING user_id
            "#
        );

        let result = sqlx::query_scalar::<_, uuid::Uuid>(&sql)
            .bind(token_hash)
            .fetch_optional(&self.pool)
            .await
            .map_err(DomainError::internal)?;

        result
            .map(UserId)
            .ok_or(DomainError::InvalidToken(TokenError::Invalid))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;

    async fn test_pool() -> PgPool {
        let url = std::env::var("DATABASE_URL")
            .unwrap_or_else(|_| "postgresql://klynt:klynt@localhost:5432/test".to_string());
        let pool = PgPool::connect(&url).await.unwrap();
        sqlx::migrate!("../../migrations").run(&pool).await.unwrap();
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
        let ctx = Ctx::guest(Uuid::new_v4());

        let user_id = seed_user(&pool).await;
        let token_hash = format!("hash-{}", Uuid::new_v4());
        let expires_at = Utc::now() + chrono::Duration::hours(24);

        store
            .save(
                &ctx,
                TokenKind::EmailVerification,
                user_id,
                &token_hash,
                expires_at,
            )
            .await
            .unwrap();

        let result = store
            .consume(&ctx, TokenKind::EmailVerification, &token_hash)
            .await
            .unwrap();
        assert_eq!(result, user_id);
    }

    #[tokio::test]
    async fn saves_and_consumes_password_reset_token() {
        let pool = test_pool().await;
        let store = PgTokenStore::new(pool.clone());
        let ctx = Ctx::guest(Uuid::new_v4());

        let user_id = seed_user(&pool).await;
        let token_hash = format!("hash-reset-{}", Uuid::new_v4());
        let expires_at = Utc::now() + chrono::Duration::minutes(30);

        store
            .save(
                &ctx,
                TokenKind::PasswordReset,
                user_id,
                &token_hash,
                expires_at,
            )
            .await
            .unwrap();

        let result = store
            .consume(&ctx, TokenKind::PasswordReset, &token_hash)
            .await
            .unwrap();
        assert_eq!(result, user_id);
    }

    #[tokio::test]
    async fn double_consume_fails() {
        let pool = test_pool().await;
        let store = PgTokenStore::new(pool.clone());
        let ctx = Ctx::guest(Uuid::new_v4());

        let user_id = seed_user(&pool).await;
        let token_hash = format!("hash-used-{}", Uuid::new_v4());
        let expires_at = Utc::now() + chrono::Duration::hours(24);

        store
            .save(
                &ctx,
                TokenKind::EmailVerification,
                user_id,
                &token_hash,
                expires_at,
            )
            .await
            .unwrap();

        let first = store
            .consume(&ctx, TokenKind::EmailVerification, &token_hash)
            .await;
        assert!(first.is_ok());

        let second = store
            .consume(&ctx, TokenKind::EmailVerification, &token_hash)
            .await;
        assert!(matches!(
            second,
            Err(DomainError::InvalidToken(TokenError::Invalid))
        ));
    }

    #[tokio::test]
    async fn expired_token_cannot_be_consumed() {
        let pool = test_pool().await;
        let store = PgTokenStore::new(pool.clone());
        let ctx = Ctx::guest(Uuid::new_v4());

        let user_id = seed_user(&pool).await;
        let token_hash = format!("hash-expired-{}", Uuid::new_v4());
        let expires_at = Utc::now() - chrono::Duration::seconds(1);

        store
            .save(
                &ctx,
                TokenKind::PasswordReset,
                user_id,
                &token_hash,
                expires_at,
            )
            .await
            .unwrap();

        let result = store
            .consume(&ctx, TokenKind::PasswordReset, &token_hash)
            .await;
        assert!(matches!(
            result,
            Err(DomainError::InvalidToken(TokenError::Invalid))
        ));
    }
}
