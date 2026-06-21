use std::sync::Arc;

use async_trait::async_trait;

use crate::email_content::EmailContent;
use crate::errors::DomainError;

/// Outbound port for sending transactional emails.
///
/// Implementations are provided by infrastructure adapters (e.g. SMTP,
/// SendGrid, AWS SES). The domain layer depends only on this trait.
#[async_trait]
pub trait EmailService: Send + Sync {
    /// Send an email with the given content.
    ///
    /// The content defines recipient, subject, and body. The adapter
    /// handles delivery through whatever provider it's configured for.
    async fn send(&self, content: Box<dyn EmailContent>) -> Result<(), DomainError>;
}

/// Shared email service handle.
pub type SharedEmailService = Arc<dyn EmailService>;
