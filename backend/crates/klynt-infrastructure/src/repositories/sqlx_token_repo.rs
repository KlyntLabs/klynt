use async_trait::async_trait;
use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use klynt_domain::ctx::Ctx;
use klynt_domain::errors::DomainError;
use klynt_domain::models::UserId;
use klynt_domain::repositories::{EmailVerificationTokenRepository, PasswordResetTokenRepository};

/// PostgreSQL implementation of email verification token repository.
pub struct PgEmailVerificationTokenRepository {
    pool: PgPool,
}

impl PgEmailVerificationTokenRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl EmailVerificationTokenRepository for PgEmailVerificationTokenRepository {
    async fn save(
        &self,
        _ctx: &Ctx,
        user_id: UserId,
        token_hash: &str,
        expires_at: DateTime<Utc>,
    ) -> Result<(), DomainError> {
        sqlx::query(
            r#"
            INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
            VALUES ($1, $2, $3)
            "#,
        )
        .bind(user_id.0)
        .bind(token_hash)
        .bind(expires_at)
        .execute(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        Ok(())
    }

    async fn find_valid(
        &self,
        _ctx: &Ctx,
        token_hash: &str,
    ) -> Result<Option<(UserId, DateTime<Utc>)>, DomainError> {
        let row = sqlx::query_as::<_, (Uuid, DateTime<Utc>)>(
            r#"
            SELECT user_id, expires_at
            FROM email_verification_tokens
            WHERE token_hash = $1
              AND used_at IS NULL
              AND expires_at > NOW()
            "#,
        )
        .bind(token_hash)
        .fetch_optional(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        Ok(row.map(|(user_id, expires_at)| (UserId(user_id), expires_at)))
    }

    async fn mark_used(&self, _ctx: &Ctx, token_hash: &str) -> Result<bool, DomainError> {
        let result = sqlx::query(
            r#"
            UPDATE email_verification_tokens
            SET used_at = NOW()
            WHERE token_hash = $1
              AND used_at IS NULL
            "#,
        )
        .bind(token_hash)
        .execute(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        Ok(result.rows_affected() > 0)
    }
}

/// PostgreSQL implementation of password reset token repository.
pub struct PgPasswordResetTokenRepository {
    pool: PgPool,
}

impl PgPasswordResetTokenRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl PasswordResetTokenRepository for PgPasswordResetTokenRepository {
    async fn save(
        &self,
        _ctx: &Ctx,
        user_id: UserId,
        token_hash: &str,
        expires_at: DateTime<Utc>,
    ) -> Result<(), DomainError> {
        sqlx::query(
            r#"
            INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
            VALUES ($1, $2, $3)
            "#,
        )
        .bind(user_id.0)
        .bind(token_hash)
        .bind(expires_at)
        .execute(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        Ok(())
    }

    async fn find_valid(
        &self,
        _ctx: &Ctx,
        token_hash: &str,
    ) -> Result<Option<(UserId, DateTime<Utc>)>, DomainError> {
        let row = sqlx::query_as::<_, (Uuid, DateTime<Utc>)>(
            r#"
            SELECT user_id, expires_at
            FROM password_reset_tokens
            WHERE token_hash = $1
              AND used_at IS NULL
              AND expires_at > NOW()
            "#,
        )
        .bind(token_hash)
        .fetch_optional(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        Ok(row.map(|(user_id, expires_at)| (UserId(user_id), expires_at)))
    }

    async fn mark_used(&self, _ctx: &Ctx, token_hash: &str) -> Result<bool, DomainError> {
        let result = sqlx::query(
            r#"
            UPDATE password_reset_tokens
            SET used_at = NOW()
            WHERE token_hash = $1
              AND used_at IS NULL
            "#,
        )
        .bind(token_hash)
        .execute(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        Ok(result.rows_affected() > 0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

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
    async fn saves_and_retrieves_email_verification_token() {
        let pool = test_pool().await;
        let repo = PgEmailVerificationTokenRepository::new(pool.clone());
        let ctx = Ctx::guest(Uuid::new_v4());

        let user_id = seed_user(&pool).await;
        let token_hash = format!("hash-{}", Uuid::new_v4());
        let expires_at = Utc::now() + chrono::Duration::hours(24);

        repo.save(&ctx, user_id, &token_hash, expires_at)
            .await
            .unwrap();

        let result = repo.find_valid(&ctx, &token_hash).await.unwrap();
        assert!(result.is_some());
        assert_eq!(result.unwrap().0, user_id);
    }

    #[tokio::test]
    async fn marks_token_as_used() {
        let pool = test_pool().await;
        let repo = PgEmailVerificationTokenRepository::new(pool.clone());
        let ctx = Ctx::guest(Uuid::new_v4());

        let user_id = seed_user(&pool).await;
        let token_hash = format!("hash-used-{}", Uuid::new_v4());
        let expires_at = Utc::now() + chrono::Duration::hours(24);

        repo.save(&ctx, user_id, &token_hash, expires_at)
            .await
            .unwrap();
        let marked = repo.mark_used(&ctx, &token_hash).await.unwrap();
        assert!(marked);

        // Token should no longer be valid
        let result = repo.find_valid(&ctx, &token_hash).await.unwrap();
        assert!(result.is_none());
    }
}
