use std::sync::Mutex;

use async_trait::async_trait;
use klynt_domain::email_content::EmailContent;
use klynt_domain::errors::DomainError;
use klynt_domain::ports::EmailService;

/// A recorded email captured by the mock adapter.
#[derive(Debug, Clone)]
pub struct MockSentEmail {
    pub recipient: String,
    pub subject: String,
    pub body_text: String,
    pub body_html: Option<String>,
}

/// Mock email service for development/testing.
///
/// In production, replace with real email provider (SendGrid, AWS SES, etc.).
/// This implementation records the emails it "sends" so integration tests can
/// retrieve verification/reset tokens without needing a real mailbox.
#[derive(Debug, Default)]
pub struct MockEmailService {
    sent_emails: Mutex<Vec<MockSentEmail>>,
}

impl MockEmailService {
    pub fn new() -> Self {
        Self::default()
    }

    /// Returns all recorded emails.
    pub fn sent_emails(&self) -> Vec<MockSentEmail> {
        self.sent_emails.lock().unwrap().clone()
    }

    /// Clears all recorded emails.
    pub fn clear(&self) {
        self.sent_emails.lock().unwrap().clear();
    }

    /// Find the most recent email sent to a recipient.
    pub fn find_email_for(&self, recipient: &str) -> Option<MockSentEmail> {
        self.sent_emails()
            .into_iter()
            .rev()
            .find(|e| e.recipient == recipient)
    }

    /// Returns all recorded verification emails as `(email, token)` pairs.
    pub fn recorded_verifications(&self) -> Vec<(String, String)> {
        self.sent_emails()
            .into_iter()
            .filter(|e| e.subject.contains("Verify"))
            .filter_map(|e| {
                extract_token(&e.body_text, "/verify/").map(|token| (e.recipient, token))
            })
            .collect()
    }

    /// Returns all recorded password-reset emails as `(email, token)` pairs.
    pub fn recorded_password_resets(&self) -> Vec<(String, String)> {
        self.sent_emails()
            .into_iter()
            .filter(|e| e.subject.contains("Reset"))
            .filter_map(|e| {
                extract_token(&e.body_text, "/reset-password/").map(|token| (e.recipient, token))
            })
            .collect()
    }
}

fn extract_token(body_text: &str, path: &str) -> Option<String> {
    body_text
        .lines()
        .find(|line| line.contains(path))
        .and_then(|line| line.trim().split('/').next_back().map(|s| s.to_string()))
}

#[async_trait]
impl EmailService for MockEmailService {
    async fn send(&self, content: Box<dyn EmailContent>) -> Result<(), DomainError> {
        let email = MockSentEmail {
            recipient: content.recipient().as_str().to_string(),
            subject: content.subject(),
            body_text: content.body_text(),
            body_html: content.body_html(),
        };

        // In production: Send actual email
        // For now: Log to stderr without exposing the secret token
        eprintln!(
            "📧 [MOCK EMAIL] {} sent to {}",
            email.subject, email.recipient
        );
        eprintln!("   Token: <redacted>");

        self.sent_emails.lock().unwrap().push(email);
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
        let content = klynt_domain::email_content::VerificationEmail::new(
            email,
            "test-token".to_string(),
            "https://klynt.edu".to_string(),
        );
        let result = service.send(Box::new(content)).await;
        assert!(result.is_ok());

        let sent = service.sent_emails();
        assert_eq!(sent.len(), 1);
        assert_eq!(sent[0].subject, "Verify your Klynt account");
        assert!(sent[0].body_text.contains("test-token"));
    }

    #[tokio::test]
    async fn mock_email_service_sends_password_reset() {
        let service = MockEmailService::new();
        let email = Email::parse("test@example.com").unwrap();
        let content = klynt_domain::email_content::PasswordResetEmail::new(
            email,
            "reset-token".to_string(),
            "https://klynt.edu".to_string(),
        );
        let result = service.send(Box::new(content)).await;
        assert!(result.is_ok());

        let sent = service.sent_emails();
        assert_eq!(sent.len(), 1);
        assert_eq!(sent[0].subject, "Reset your Klynt password");
        assert!(sent[0].body_text.contains("reset-token"));
    }
}
