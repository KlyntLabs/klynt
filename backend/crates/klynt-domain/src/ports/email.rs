use std::sync::Arc;

use async_trait::async_trait;

use crate::errors::DomainError;
use crate::models::Email;

/// Outbound port for sending transactional emails.
///
/// Implementations are provided by infrastructure adapters (e.g. SMTP,
/// SendGrid, AWS SES). The domain layer depends only on this trait.
#[async_trait]
pub trait EmailService: Send + Sync {
    /// Send an email verification email.
    async fn send_verification(&self, email: &Email, token: &str) -> Result<(), DomainError>;

    /// Send a password reset email.
    async fn send_password_reset(&self, email: &Email, token: &str) -> Result<(), DomainError>;
}

/// Shared email service handle.
pub type SharedEmailService = Arc<dyn EmailService>;
