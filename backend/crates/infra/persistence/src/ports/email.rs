//! Email service port.

use async_trait::async_trait;

use crate::email_content::EmailContent;
use crate::Error;

/// Outbound port for sending transactional emails.
#[async_trait]
pub trait EmailService: Send + Sync {
    async fn send(&self, content: Box<dyn EmailContent>) -> Result<(), Error>;
}

/// Shared email service handle.
pub type SharedEmailService = std::sync::Arc<dyn EmailService>;
