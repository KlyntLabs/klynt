//! Adapter from legacy token store to auth_service `TokenStore` port.

use async_trait::async_trait;
use chrono::{DateTime, Utc};

use klynt_core::ctx::{ExecutionContext, RequestContext};
use klynt_utils::UserId;

use crate::domain::{TokenKind, TokenStore as AuthTokenStore};
use crate::error::AuthError;
use crate::infrastructure::conversion::{from_legacy_user_id, to_legacy_ctx, to_legacy_user_id};

/// Adapter wrapping a legacy [`klynt_infrastructure::repositories::TokenStore`].
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
    T: klynt_infrastructure::repositories::TokenStore,
{
    async fn save(
        &self,
        kind: TokenKind,
        user_id: UserId,
        token_hash: &str,
        expires_at: DateTime<Utc>,
    ) -> Result<(), AuthError> {
        let legacy_ctx = to_legacy_ctx(&ExecutionContext::new(RequestContext::new()));
        let legacy_kind = to_legacy_kind(kind);
        let legacy_user_id = to_legacy_user_id(user_id);

        self.inner
            .save(
                &legacy_ctx,
                legacy_kind,
                legacy_user_id,
                token_hash,
                expires_at,
            )
            .await
            .map_err(map_legacy_error)
    }

    async fn consume(&self, kind: TokenKind, token_hash: &str) -> Result<UserId, AuthError> {
        let legacy_ctx = to_legacy_ctx(&ExecutionContext::new(RequestContext::new()));
        let legacy_kind = to_legacy_kind(kind);

        self.inner
            .consume(&legacy_ctx, legacy_kind, token_hash)
            .await
            .map(from_legacy_user_id)
            .map_err(map_legacy_error)
    }
}

fn to_legacy_kind(kind: TokenKind) -> klynt_storage::tokens::TokenKind {
    match kind {
        TokenKind::EmailVerification => klynt_storage::tokens::TokenKind::EmailVerification,
        TokenKind::PasswordReset => klynt_storage::tokens::TokenKind::PasswordReset,
    }
}

fn map_legacy_error(err: klynt_shared_domain::DomainError) -> AuthError {
    AuthError::Domain(klynt_shared_domain::DomainError::Internal(err.to_string()))
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;
    use std::sync::Mutex;

    use super::*;

    type LegacyTokenKey = (klynt_storage::tokens::TokenKind, String);
    type LegacyTokenEntry = (klynt_utils::UserId, DateTime<Utc>, bool);

    struct FakeLegacyTokenStore {
        tokens: Mutex<HashMap<LegacyTokenKey, LegacyTokenEntry>>,
    }

    impl Default for FakeLegacyTokenStore {
        fn default() -> Self {
            Self {
                tokens: Mutex::new(HashMap::new()),
            }
        }
    }

    #[async_trait]
    impl klynt_infrastructure::repositories::TokenStore for FakeLegacyTokenStore {
        async fn save(
            &self,
            _ctx: &klynt_core::ctx::Ctx,
            kind: klynt_storage::tokens::TokenKind,
            user_id: klynt_utils::UserId,
            token_hash: &str,
            expires_at: DateTime<Utc>,
        ) -> Result<(), klynt_shared_domain::DomainError> {
            self.tokens
                .lock()
                .unwrap()
                .insert((kind, token_hash.to_string()), (user_id, expires_at, false));
            Ok(())
        }

        async fn consume(
            &self,
            _ctx: &klynt_core::ctx::Ctx,
            kind: klynt_storage::tokens::TokenKind,
            token_hash: &str,
        ) -> Result<klynt_utils::UserId, klynt_shared_domain::DomainError> {
            let mut tokens = self.tokens.lock().unwrap();
            match tokens.get_mut(&(kind, token_hash.to_string())) {
                Some((user_id, expires_at, used)) => {
                    if *used || *expires_at <= Utc::now() {
                        return Err(klynt_shared_domain::DomainError::InvalidToken(
                            klynt_shared_domain::TokenError::Invalid,
                        ));
                    }
                    *used = true;
                    Ok(*user_id)
                }
                None => Err(klynt_shared_domain::DomainError::InvalidToken(
                    klynt_shared_domain::TokenError::Invalid,
                )),
            }
        }
    }

    #[tokio::test]
    async fn save_and_consume_round_trip() {
        let adapter = TokenRepositoryAdapter::new(FakeLegacyTokenStore::default());
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
        let adapter = TokenRepositoryAdapter::new(FakeLegacyTokenStore::default());
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
