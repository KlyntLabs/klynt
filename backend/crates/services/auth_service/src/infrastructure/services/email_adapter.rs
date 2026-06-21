//! Adapter from auth_service `EmailSender` port to the persistence email service.

use async_trait::async_trait;

use klynt_base::ctx::ExecutionContext;

use crate::application::ports::EmailSender;
use crate::error::AuthError;

/// Adapter wrapping a [`klynt_persistence::ports::SharedEmailService`].
pub struct EmailSenderAdapter {
    inner: klynt_persistence::ports::SharedEmailService,
}

impl EmailSenderAdapter {
    pub fn new(inner: klynt_persistence::ports::SharedEmailService) -> Self {
        Self { inner }
    }
}

#[async_trait]
impl EmailSender for EmailSenderAdapter {
    async fn send_verification(
        &self,
        _ctx: &ExecutionContext,
        email: &str,
        token: &str,
        base_url: &str,
    ) -> Result<(), AuthError> {
        let parsed_email = klynt_common::util::Email::parse(email).map_err(|e| {
            AuthError::Domain(klynt_common::domain::DomainError::InvalidInput(
                e.to_string(),
            ))
        })?;

        let content = klynt_persistence::email_content::VerificationEmail::new(
            parsed_email,
            token.to_string(),
            base_url.to_string(),
        );

        self.inner.send(Box::new(content)).await.map_err(|e| {
            AuthError::Domain(klynt_common::domain::DomainError::Internal(e.to_string()))
        })
    }

    async fn send_password_reset(
        &self,
        _ctx: &ExecutionContext,
        email: &str,
        token: &str,
        base_url: &str,
    ) -> Result<(), AuthError> {
        let parsed_email = klynt_common::util::Email::parse(email).map_err(|e| {
            AuthError::Domain(klynt_common::domain::DomainError::InvalidInput(
                e.to_string(),
            ))
        })?;

        let content = klynt_persistence::email_content::PasswordResetEmail::new(
            parsed_email,
            token.to_string(),
            base_url.to_string(),
        );

        self.inner.send(Box::new(content)).await.map_err(|e| {
            AuthError::Domain(klynt_common::domain::DomainError::Internal(e.to_string()))
        })
    }
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use super::*;
    use klynt_base::ctx::RequestContext;

    #[tokio::test]
    async fn send_verification_records_email() {
        let mock = Arc::new(klynt_persistence::email::MockEmailService::new());
        let adapter = EmailSenderAdapter::new(mock.clone());
        let ctx = ExecutionContext::new(RequestContext::new());

        adapter
            .send_verification(&ctx, "ada@example.com", "token123", "https://klynt.edu")
            .await
            .unwrap();

        let emails = mock.sent_emails();
        assert_eq!(emails.len(), 1);
        assert_eq!(emails[0].recipient, "ada@example.com");
        assert!(emails[0].body_text.contains("token123"));
    }

    #[tokio::test]
    async fn send_password_reset_records_email() {
        let mock = Arc::new(klynt_persistence::email::MockEmailService::new());
        let adapter = EmailSenderAdapter::new(mock.clone());
        let ctx = ExecutionContext::new(RequestContext::new());

        adapter
            .send_password_reset(&ctx, "ada@example.com", "reset456", "https://klynt.edu")
            .await
            .unwrap();

        let emails = mock.sent_emails();
        assert_eq!(emails.len(), 1);
        assert!(emails[0].subject.contains("Reset"));
    }
}
