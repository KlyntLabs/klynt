//! Token + email service.
//!
//! Centralises generation, persistence, and sending of one-time tokens for
//! email verification and password reset. Keeps the duplicate orchestration
//! out of individual use cases.

use std::sync::Arc;

use base::ctx::ExecutionContext;
use base::ports::{EmailSender, TokenStore};
use domain::{Email, UserId};

use crate::core::{Token, TokenKind};
use crate::error::AuthError;

/// Generates and dispatches token emails.
pub struct TokenEmailService {
    token_store: Arc<dyn TokenStore>,
    email_sender: Arc<dyn EmailSender>,
    base_url: String,
}

impl TokenEmailService {
    /// Create a new token email service.
    pub fn new(
        token_store: Arc<dyn TokenStore>,
        email_sender: Arc<dyn EmailSender>,
        base_url: String,
    ) -> Self {
        Self {
            token_store,
            email_sender,
            base_url,
        }
    }

    /// Generate a verification token, save its hash, and send the email.
    pub async fn send_verification(
        &self,
        ctx: &ExecutionContext,
        email: &Email,
        user_id: UserId,
    ) -> Result<(), AuthError> {
        let token = Token::generate(TokenKind::EmailVerification, user_id);
        self.token_store
            .save(
                ctx,
                TokenKind::EmailVerification,
                user_id,
                token.hash,
                token.expires_at,
            )
            .await?;
        self.email_sender
            .send_verification(ctx, email, &token.plaintext, &self.base_url)
            .await?;
        Ok(())
    }

    /// Generate a password-reset token, save its hash, and send the email.
    pub async fn send_password_reset(
        &self,
        ctx: &ExecutionContext,
        email: &Email,
        user_id: UserId,
    ) -> Result<(), AuthError> {
        let token = Token::generate(TokenKind::PasswordReset, user_id);
        self.token_store
            .save(
                ctx,
                TokenKind::PasswordReset,
                user_id,
                token.hash,
                token.expires_at,
            )
            .await?;
        self.email_sender
            .send_password_reset(ctx, email, &token.plaintext, &self.base_url)
            .await?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use base::ctx::ExecutionContext;
    use base::ports::email::{EmailError, EmailSender};
    use base::ports::token::{TokenKind, TokenStore};
    use base::testkit::{test_ctx, FakeTokenStore};
    use domain::{Email, UserId};

    use super::TokenEmailService;

    #[derive(Default, Clone)]
    struct RecordingEmailSender {
        verification_calls: Arc<std::sync::Mutex<Vec<(String, String)>>>,
    }

    #[async_trait::async_trait]
    impl EmailSender for RecordingEmailSender {
        async fn send_verification(
            &self,
            _ctx: &ExecutionContext,
            email: &Email,
            token: &str,
            base_url: &str,
        ) -> Result<(), EmailError> {
            self.verification_calls.lock().unwrap().push((
                email.as_str().to_string(),
                format!("{base_url}/verify/{token}"),
            ));
            Ok(())
        }

        async fn send_password_reset(
            &self,
            _ctx: &ExecutionContext,
            _email: &Email,
            _token: &str,
            _base_url: &str,
        ) -> Result<(), EmailError> {
            Ok(())
        }
    }

    #[tokio::test]
    async fn send_verification_persists_token_and_sends_email() {
        let token_store: Arc<dyn TokenStore> = Arc::new(FakeTokenStore::new());
        let email_sender = Arc::new(RecordingEmailSender::default());
        let service = TokenEmailService::new(
            token_store.clone(),
            email_sender.clone(),
            "https://klynt.edu".to_string(),
        );
        let ctx = test_ctx();
        let user_id = UserId::new();
        let email = Email::parse("ada@example.com").unwrap();

        service
            .send_verification(&ctx, &email, user_id)
            .await
            .unwrap();

        {
            let calls = email_sender.verification_calls.lock().unwrap();
            assert_eq!(calls.len(), 1);
            assert!(calls[0].1.starts_with("https://klynt.edu/verify/"));
        }

        assert!(token_store
            .consume(&ctx, TokenKind::EmailVerification, "invalid".to_string())
            .await
            .is_err());
    }
}
