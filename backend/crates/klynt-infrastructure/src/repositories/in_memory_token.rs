use std::collections::HashMap;
use std::sync::Mutex;

use async_trait::async_trait;
use chrono::{DateTime, Utc};

use klynt_domain::ctx::Ctx;
use klynt_domain::errors::DomainError;
use klynt_domain::models::UserId;
use klynt_domain::repositories::EmailVerificationTokenRepository;

#[derive(Debug, Clone)]
struct InMemoryToken {
    user_id: UserId,
    expires_at: DateTime<Utc>,
    used: bool,
}

/// In-memory implementation of [`EmailVerificationTokenRepository`].
///
/// This adapter is used for development and integration tests. A PostgreSQL
/// implementation is provided by [`PgEmailVerificationTokenRepository`].
#[derive(Debug, Default)]
pub struct InMemoryEmailVerificationTokenRepository {
    tokens: Mutex<HashMap<String, InMemoryToken>>,
}

impl InMemoryEmailVerificationTokenRepository {
    pub fn new() -> Self {
        Self::default()
    }
}

#[async_trait]
impl EmailVerificationTokenRepository for InMemoryEmailVerificationTokenRepository {
    async fn save(
        &self,
        _ctx: &Ctx,
        user_id: UserId,
        token_hash: &str,
        expires_at: DateTime<Utc>,
    ) -> Result<(), DomainError> {
        let mut tokens = self.tokens.lock().unwrap();
        tokens.insert(
            token_hash.to_string(),
            InMemoryToken {
                user_id,
                expires_at,
                used: false,
            },
        );
        Ok(())
    }

    async fn find_valid(
        &self,
        _ctx: &Ctx,
        token_hash: &str,
    ) -> Result<Option<(UserId, DateTime<Utc>)>, DomainError> {
        let tokens = self.tokens.lock().unwrap();
        match tokens.get(token_hash) {
            Some(token) if !token.used && token.expires_at > Utc::now() => {
                Ok(Some((token.user_id, token.expires_at)))
            }
            _ => Ok(None),
        }
    }

    async fn mark_used(&self, _ctx: &Ctx, token_hash: &str) -> Result<bool, DomainError> {
        let mut tokens = self.tokens.lock().unwrap();
        match tokens.get_mut(token_hash) {
            Some(token) if !token.used => {
                token.used = true;
                Ok(true)
            }
            _ => Ok(false),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use klynt_domain::ctx::Ctx;
    use uuid::Uuid;

    #[tokio::test]
    async fn saves_and_finds_valid_token() {
        let repo = InMemoryEmailVerificationTokenRepository::new();
        let ctx = Ctx::guest(Uuid::new_v4());
        let user_id = UserId::new();
        let hash = "hash1";
        let expires_at = Utc::now() + chrono::Duration::hours(24);

        repo.save(&ctx, user_id, hash, expires_at).await.unwrap();

        let result = repo.find_valid(&ctx, hash).await.unwrap();
        assert_eq!(result, Some((user_id, expires_at)));
    }

    #[tokio::test]
    async fn expired_token_is_not_valid() {
        let repo = InMemoryEmailVerificationTokenRepository::new();
        let ctx = Ctx::guest(Uuid::new_v4());
        let user_id = UserId::new();
        let hash = "hash2";
        let expires_at = Utc::now() - chrono::Duration::seconds(1);

        repo.save(&ctx, user_id, hash, expires_at).await.unwrap();

        let result = repo.find_valid(&ctx, hash).await.unwrap();
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn used_token_is_not_valid() {
        let repo = InMemoryEmailVerificationTokenRepository::new();
        let ctx = Ctx::guest(Uuid::new_v4());
        let user_id = UserId::new();
        let hash = "hash3";
        let expires_at = Utc::now() + chrono::Duration::hours(24);

        repo.save(&ctx, user_id, hash, expires_at).await.unwrap();
        assert!(repo.mark_used(&ctx, hash).await.unwrap());

        let result = repo.find_valid(&ctx, hash).await.unwrap();
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn mark_used_returns_false_for_unknown_token() {
        let repo = InMemoryEmailVerificationTokenRepository::new();
        let ctx = Ctx::guest(Uuid::new_v4());

        let marked = repo.mark_used(&ctx, "unknown").await.unwrap();
        assert!(!marked);
    }

    #[tokio::test]
    async fn mark_used_returns_false_when_already_used() {
        let repo = InMemoryEmailVerificationTokenRepository::new();
        let ctx = Ctx::guest(Uuid::new_v4());
        let user_id = UserId::new();
        let hash = "hash4";
        let expires_at = Utc::now() + chrono::Duration::hours(24);

        repo.save(&ctx, user_id, hash, expires_at).await.unwrap();
        assert!(repo.mark_used(&ctx, hash).await.unwrap());
        assert!(!repo.mark_used(&ctx, hash).await.unwrap());
    }
}
