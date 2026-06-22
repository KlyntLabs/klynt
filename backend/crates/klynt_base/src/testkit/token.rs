//! Canonical in-memory fake for [`TokenStore`].

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use async_trait::async_trait;
use chrono::{DateTime, Utc};

use crate::ctx::ExecutionContext;
use crate::ports::token::{TokenError, TokenKind, TokenStore};
use klynt_domain::UserId;

type TokenKey = (TokenKind, String);
type TokenEntry = (UserId, DateTime<Utc>, bool);

/// In-memory token store for tests.
#[derive(Clone, Debug, Default)]
pub struct FakeTokenStore {
    tokens: Arc<Mutex<HashMap<TokenKey, TokenEntry>>>,
}

impl FakeTokenStore {
    /// Create an empty fake token store.
    pub fn new() -> Self {
        Self::default()
    }
}

#[async_trait]
impl TokenStore for FakeTokenStore {
    async fn save(
        &self,
        _ctx: &ExecutionContext,
        kind: TokenKind,
        user_id: UserId,
        token_hash: String,
        expires_at: DateTime<Utc>,
    ) -> Result<(), TokenError> {
        self.tokens
            .lock()
            .unwrap()
            .insert((kind, token_hash), (user_id, expires_at, false));
        Ok(())
    }

    async fn consume(
        &self,
        _ctx: &ExecutionContext,
        kind: TokenKind,
        token_hash: String,
    ) -> Result<UserId, TokenError> {
        let mut tokens = self.tokens.lock().unwrap();
        match tokens.get_mut(&(kind, token_hash)) {
            Some((user_id, expires_at, used)) => {
                if *used || *expires_at <= Utc::now() {
                    return Err(TokenError::Invalid);
                }
                *used = true;
                Ok(*user_id)
            }
            None => Err(TokenError::Invalid),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ctx::{ExecutionContext, RequestContext};

    fn ctx() -> ExecutionContext {
        ExecutionContext::new(RequestContext::new())
    }

    #[tokio::test]
    async fn save_and_consume_round_trip() {
        let store = FakeTokenStore::new();
        let user_id = UserId::new();
        let hash = "token-hash".to_string();
        let expires_at = Utc::now() + chrono::Duration::hours(1);

        store
            .save(
                &ctx(),
                TokenKind::EmailVerification,
                user_id,
                hash.clone(),
                expires_at,
            )
            .await
            .unwrap();

        let consumed = store
            .consume(&ctx(), TokenKind::EmailVerification, hash)
            .await
            .unwrap();
        assert_eq!(consumed, user_id);
    }

    #[tokio::test]
    async fn double_consume_fails() {
        let store = FakeTokenStore::new();
        let user_id = UserId::new();
        let hash = "token-hash".to_string();
        let expires_at = Utc::now() + chrono::Duration::hours(1);

        store
            .save(
                &ctx(),
                TokenKind::PasswordReset,
                user_id,
                hash.clone(),
                expires_at,
            )
            .await
            .unwrap();

        store
            .consume(&ctx(), TokenKind::PasswordReset, hash.clone())
            .await
            .unwrap();
        let second = store.consume(&ctx(), TokenKind::PasswordReset, hash).await;

        assert!(matches!(second, Err(TokenError::Invalid)));
    }

    #[tokio::test]
    async fn expired_token_cannot_be_consumed() {
        let store = FakeTokenStore::new();
        let user_id = UserId::new();
        let hash = "token-hash".to_string();
        let expires_at = Utc::now() - chrono::Duration::hours(1);

        store
            .save(
                &ctx(),
                TokenKind::EmailVerification,
                user_id,
                hash.clone(),
                expires_at,
            )
            .await
            .unwrap();

        let result = store
            .consume(&ctx(), TokenKind::EmailVerification, hash)
            .await;

        assert!(matches!(result, Err(TokenError::Invalid)));
    }
}
