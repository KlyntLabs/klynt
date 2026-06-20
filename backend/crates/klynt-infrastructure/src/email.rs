use std::sync::Mutex;

use async_trait::async_trait;
use klynt_domain::errors::DomainError;
use klynt_domain::models::Email;
use klynt_domain::ports::EmailService;

/// Mock email service for development/testing.
///
/// In production, replace with real email provider (SendGrid, AWS SES, etc.).
/// This implementation records the emails and plaintext tokens it "sends" so
/// integration tests can retrieve verification/reset tokens without needing a
/// real mailbox.
#[derive(Debug, Default)]
pub struct MockEmailService {
    verifications: Mutex<Vec<(String, String)>>,
    password_resets: Mutex<Vec<(String, String)>>,
}

impl MockEmailService {
    pub fn new() -> Self {
        Self::default()
    }

    /// Returns all recorded verification emails as `(email, token)` pairs.
    pub fn recorded_verifications(&self) -> Vec<(String, String)> {
        self.verifications.lock().unwrap().clone()
    }

    /// Returns all recorded password-reset emails as `(email, token)` pairs.
    pub fn recorded_password_resets(&self) -> Vec<(String, String)> {
        self.password_resets.lock().unwrap().clone()
    }
}

#[async_trait]
impl EmailService for MockEmailService {
    async fn send_verification(&self, email: &Email, token: &str) -> Result<(), DomainError> {
        // In production: Send actual email
        // For now: Log to stderr without exposing the secret token
        eprintln!(
            "📧 [MOCK EMAIL] Verification email sent to {}",
            email.as_str()
        );
        eprintln!("   Token: <redacted>");
        self.verifications
            .lock()
            .unwrap()
            .push((email.as_str().to_string(), token.to_string()));
        Ok(())
    }

    async fn send_password_reset(&self, email: &Email, token: &str) -> Result<(), DomainError> {
        eprintln!(
            "📧 [MOCK EMAIL] Password reset email sent to {}",
            email.as_str()
        );
        eprintln!("   Token: <redacted>");
        self.password_resets
            .lock()
            .unwrap()
            .push((email.as_str().to_string(), token.to_string()));
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use klynt_domain::models::Email;
    use klynt_domain::ports::EmailService;

    use super::MockEmailService;

    #[tokio::test]
    async fn mock_email_service_sends_verification() {
        let service = MockEmailService::new();
        let email = Email::parse("test@example.com").unwrap();
        let result = service.send_verification(&email, "test-token").await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn mock_email_service_sends_password_reset() {
        let service = MockEmailService::new();
        let email = Email::parse("test@example.com").unwrap();
        let result = service.send_password_reset(&email, "reset-token").await;
        assert!(result.is_ok());
    }
}
