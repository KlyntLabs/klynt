//! Adapter from persistence token store to auth_service `TokenStore` port.

use async_trait::async_trait;
use chrono::{DateTime, Utc};

use klynt_base::ctx::{ExecutionContext, RequestContext};
use klynt_common::util::UserId;

use crate::domain::{TokenKind, TokenStore as AuthTokenStore};
use crate::error::AuthError;

/// Adapter wrapping a [`klynt_persistence::repositories::TokenStore`].
pub struct TokenRepositoryAdapter<T> {
    inner: T,
}

impl<T> TokenRepositoryAdapter<T> {
    pub fn new(inner: T) -> Self {
        Self { inner }
    }
}

#[async_trait]
impl<T> AuthTokenStore for TokenRepositoryAdapter<T>
where
    T: klynt_persistence::repositories::TokenStore,
{
    async fn save(
        &self,
        kind: TokenKind,
        user_id: UserId,
        token_hash: &str,
        expires_at: DateTime<Utc>,
    ) -> Result<(), AuthError> {
        let ctx = ExecutionContext::new(RequestContext::new());
        let kind = to_persistence_kind(kind);

        self.inner
            .save(&ctx, kind, user_id, token_hash, expires_at)
            .await
            .map_err(map_persistence_error)
    }

    async fn consume(&self, kind: TokenKind, token_hash: &str) -> Result<UserId, AuthError> {
        let ctx = ExecutionContext::new(RequestContext::new());
        let kind = to_persistence_kind(kind);

        self.inner
            .consume(&ctx, kind, token_hash)
            .await
            .map_err(map_persistence_error)
    }
}

fn to_persistence_kind(kind: TokenKind) -> klynt_persistence::tokens::TokenKind {
    match kind {
        TokenKind::EmailVerification => klynt_persistence::tokens::TokenKind::EmailVerification,
        TokenKind::PasswordReset => klynt_persistence::tokens::TokenKind::PasswordReset,
    }
}

fn map_persistence_error(err: klynt_common::domain::DomainError) -> AuthError {
    AuthError::Domain(klynt_common::domain::DomainError::Internal(err.to_string()))
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;
    use std::sync::Mutex;

    use super::*;

    type PersistenceTokenKey = (klynt_persistence::tokens::TokenKind, String);
    type PersistenceTokenEntry = (klynt_common::util::UserId, DateTime<Utc>, bool);

    struct FakePersistenceTokenStore {
        tokens: Mutex<HashMap<PersistenceTokenKey, PersistenceTokenEntry>>,
    }

    impl Default for FakePersistenceTokenStore {
        fn default() -> Self {
            Self {
                tokens: Mutex::new(HashMap::new()),
            }
        }
    }

    #[async_trait]
    impl klynt_persistence::repositories::TokenStore for FakePersistenceTokenStore {
        async fn save(
            &self,
            _ctx: &ExecutionContext,
            kind: klynt_persistence::tokens::TokenKind,
            user_id: klynt_common::util::UserId,
            token_hash: &str,
            expires_at: DateTime<Utc>,
        ) -> Result<(), klynt_common::domain::DomainError> {
            self.tokens
                .lock()
                .unwrap()
                .insert((kind, token_hash.to_string()), (user_id, expires_at, false));
            Ok(())
        }

        async fn consume(
            &self,
            _ctx: &ExecutionContext,
            kind: klynt_persistence::tokens::TokenKind,
            token_hash: &str,
        ) -> Result<klynt_common::util::UserId, klynt_common::domain::DomainError> {
            let mut tokens = self.tokens.lock().unwrap();
            match tokens.get_mut(&(kind, token_hash.to_string())) {
                Some((user_id, expires_at, used)) => {
                    if *used || *expires_at <= Utc::now() {
                        return Err(klynt_common::domain::DomainError::InvalidToken(
                            klynt_common::domain::TokenError::Invalid,
                        ));
                    }
                    *used = true;
                    Ok(*user_id)
                }
                None => Err(klynt_common::domain::DomainError::InvalidToken(
                    klynt_common::domain::TokenError::Invalid,
                )),
            }
        }
    }

    #[tokio::test]
    async fn save_and_consume_round_trip() {
        let adapter = TokenRepositoryAdapter::new(FakePersistenceTokenStore::default());
        let user_id = UserId::new();
        let hash = "token-hash".to_string();
        let expires_at = Utc::now() + chrono::Duration::hours(1);

        adapter
            .save(TokenKind::EmailVerification, user_id, &hash, expires_at)
            .await
            .unwrap();

        let consumed = adapter
            .consume(TokenKind::EmailVerification, &hash)
            .await
            .unwrap();
        assert_eq!(consumed, user_id);
    }

    #[tokio::test]
    async fn double_consume_fails() {
        let adapter = TokenRepositoryAdapter::new(FakePersistenceTokenStore::default());
        let user_id = UserId::new();
        let hash = "token-hash".to_string();
        let expires_at = Utc::now() + chrono::Duration::hours(1);

        adapter
            .save(TokenKind::PasswordReset, user_id, &hash, expires_at)
            .await
            .unwrap();

        adapter
            .consume(TokenKind::PasswordReset, &hash)
            .await
            .unwrap();
        let second = adapter.consume(TokenKind::PasswordReset, &hash).await;
        assert!(second.is_err());
    }
}
