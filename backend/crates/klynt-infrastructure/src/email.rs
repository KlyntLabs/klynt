use async_trait::async_trait;
use klynt_domain::errors::DomainError;
use klynt_domain::models::Email;
use klynt_domain::ports::EmailService;

/// Mock email service for development/testing.
///
/// In production, replace with real email provider (SendGrid, AWS SES, etc.).
#[derive(Debug, Default)]
pub struct MockEmailService {
    // In a real implementation, this would hold SMTP credentials or API client
}

impl MockEmailService {
    pub fn new() -> Self {
        Self::default()
    }
}

#[async_trait]
impl EmailService for MockEmailService {
    async fn send_verification(&self, email: &Email, _token: &str) -> Result<(), DomainError> {
        // In production: Send actual email
        // For now: Log to stderr without exposing the secret token
        eprintln!(
            "📧 [MOCK EMAIL] Verification email sent to {}",
            email.as_str()
        );
        eprintln!("   Token: <redacted>");
        Ok(())
    }

    async fn send_password_reset(&self, email: &Email, _token: &str) -> Result<(), DomainError> {
        eprintln!(
            "📧 [MOCK EMAIL] Password reset email sent to {}",
            email.as_str()
        );
        eprintln!("   Token: <redacted>");
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
