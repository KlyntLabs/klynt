mod tests {
    use std::collections::HashMap;
    use std::sync::Mutex;

    use async_trait::async_trait;
    use chrono::{DateTime, Duration, Utc};
    use klynt_domain::UserId;

    use super::super::*;
    use crate::ctx::{ExecutionContext, RequestContext};

    #[test]
    fn token_kind_ttl_values() {
        assert_eq!(TokenKind::EmailVerification.ttl(), Duration::hours(24));
        assert_eq!(TokenKind::PasswordReset.ttl(), Duration::minutes(30));
    }

    #[test]
    fn token_error_display_messages() {
        assert_eq!(
            TokenError::Invalid.to_string(),
            "Token not found or expired"
        );
        assert_eq!(TokenError::AlreadyUsed.to_string(), "Token already used");
        assert_eq!(
            TokenError::Database("connection lost".to_string()).to_string(),
            "Database error: connection lost"
        );
        assert_eq!(
            TokenError::Internal("oops".to_string()).to_string(),
            "Internal error: oops"
        );
    }

    #[test]
    fn sqlx_row_not_found_maps_to_invalid() {
        let err: TokenError = sqlx::Error::RowNotFound.into();
        assert!(matches!(err, TokenError::Invalid));
    }

    #[test]
    fn token_store_is_object_safe() {
        let _store: Box<dyn TokenStore> = Box::new(FakeTokenStore::default());
    }

    #[tokio::test]
    async fn fake_token_store_save_and_consume_round_trip() {
        let ctx = ExecutionContext::new(RequestContext::new());
        let store = FakeTokenStore::default();
        let user_id = UserId::new();
        let hash = "token-hash".to_string();
        let expires_at = Utc::now() + Duration::hours(1);

        store
            .save(
                &ctx,
                TokenKind::EmailVerification,
                user_id,
                hash.clone(),
                expires_at,
            )
            .await
            .unwrap();

        let consumed = store
            .consume(&ctx, TokenKind::EmailVerification, hash)
            .await
            .unwrap();
        assert_eq!(consumed, user_id);
    }

    #[tokio::test]
    async fn fake_token_store_double_consume_fails() {
        let ctx = ExecutionContext::new(RequestContext::new());
        let store = FakeTokenStore::default();
        let user_id = UserId::new();
        let hash = "token-hash".to_string();
        let expires_at = Utc::now() + Duration::hours(1);

        store
            .save(
                &ctx,
                TokenKind::PasswordReset,
                user_id,
                hash.clone(),
                expires_at,
            )
            .await
            .unwrap();

        store
            .consume(&ctx, TokenKind::PasswordReset, hash.clone())
            .await
            .unwrap();
        let second = store.consume(&ctx, TokenKind::PasswordReset, hash).await;

        assert!(matches!(second, Err(TokenError::Invalid)));
    }

    #[tokio::test]
    async fn fake_token_store_expired_token_cannot_be_consumed() {
        let ctx = ExecutionContext::new(RequestContext::new());
        let store = FakeTokenStore::default();
        let user_id = UserId::new();
        let hash = "token-hash".to_string();
        let expires_at = Utc::now() - Duration::hours(1);

        store
            .save(
                &ctx,
                TokenKind::EmailVerification,
                user_id,
                hash.clone(),
                expires_at,
            )
            .await
            .unwrap();

        let result = store
            .consume(&ctx, TokenKind::EmailVerification, hash)
            .await;

        assert!(matches!(result, Err(TokenError::Invalid)));
    }

    type TokenKey = (TokenKind, String);
    type TokenEntry = (UserId, DateTime<Utc>, bool);

    /// In-memory fake for exercising the canonical trait.
    #[derive(Default)]
    struct FakeTokenStore {
        tokens: Mutex<HashMap<TokenKey, TokenEntry>>,
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
}
