//! SMTP-backed email adapter.

use async_trait::async_trait;
use base::ctx::ExecutionContext;
use base::ports::email::{EmailError, EmailSender};
use config::SmtpConfig;
use domain::{DomainError, Email};
use lettre::message::header::ContentType;
use lettre::message::{Message, MultiPart, SinglePart};
use lettre::{AsyncSmtpTransport, AsyncTransport, Tokio1Executor};

use crate::email_content::{EmailContent, PasswordResetEmail, VerificationEmail};

/// Email sender that delivers via SMTP.
#[derive(Debug, Clone)]
pub struct SmtpEmailService {
    transport: AsyncSmtpTransport<Tokio1Executor>,
    from: String,
}

impl SmtpEmailService {
    /// Build an SMTP sender from configuration.
    pub fn from_config(config: &SmtpConfig) -> Result<Self, EmailError> {
        let mut builder =
            AsyncSmtpTransport::<Tokio1Executor>::builder_dangerous(&config.host).port(config.port);

        if config.tls {
            builder = builder.tls(lettre::transport::smtp::client::Tls::Required(
                lettre::transport::smtp::client::TlsParameters::new(config.host.clone())
                    .map_err(|e| EmailError::SendFailed(format!("TLS setup: {e}")))?,
            ));
        } else {
            builder = builder.tls(lettre::transport::smtp::client::Tls::None);
        }

        if let Some(username) = &config.username {
            builder =
                builder.credentials(lettre::transport::smtp::authentication::Credentials::new(
                    username.clone(),
                    config.password.clone().unwrap_or_default(),
                ));
        }

        Ok(Self {
            transport: builder.build(),
            from: config.from.clone(),
        })
    }

    async fn send_content(&self, content: Box<dyn EmailContent>) -> Result<(), DomainError> {
        let to = content.recipient().as_str();
        let message_builder = Message::builder()
            .from(self.from.parse().map_err(|e| {
                DomainError::internal_msg(format!("invalid from address '{}': {e}", self.from))
            })?)
            .to(to.parse().map_err(|e| {
                DomainError::validation(&format!("invalid recipient address '{}': {e}", to))
            })?)
            .subject(content.subject());

        let message = if let Some(html) = content.body_html() {
            message_builder.multipart(
                MultiPart::alternative()
                    .singlepart(
                        SinglePart::builder()
                            .header(ContentType::parse("text/plain; charset=utf-8").map_err(
                                |e| DomainError::internal_msg(format!("content type: {e}")),
                            )?)
                            .body(content.body_text()),
                    )
                    .singlepart(
                        SinglePart::builder()
                            .header(ContentType::parse("text/html; charset=utf-8").map_err(
                                |e| DomainError::internal_msg(format!("content type: {e}")),
                            )?)
                            .body(html),
                    ),
            )
        } else {
            message_builder.body(content.body_text())
        }
        .map_err(|e| DomainError::internal_msg(format!("email build failed: {e}")))?;

        self.transport
            .send(message)
            .await
            .map(|_| ())
            .map_err(|e| DomainError::internal_msg(format!("SMTP send failed: {e}")))
    }
}

#[async_trait]
impl EmailSender for SmtpEmailService {
    async fn send_verification(
        &self,
        _ctx: &ExecutionContext,
        email: &Email,
        token: &str,
        base_url: &str,
    ) -> Result<(), EmailError> {
        let content =
            VerificationEmail::new(email.clone(), token.to_string(), base_url.to_string());
        self.send_content(Box::new(content))
            .await
            .map_err(|e| EmailError::SendFailed(e.to_string()))
    }

    async fn send_password_reset(
        &self,
        _ctx: &ExecutionContext,
        email: &Email,
        token: &str,
        base_url: &str,
    ) -> Result<(), EmailError> {
        let content =
            PasswordResetEmail::new(email.clone(), token.to_string(), base_url.to_string());
        self.send_content(Box::new(content))
            .await
            .map_err(|e| EmailError::SendFailed(e.to_string()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builds_from_config_without_auth() {
        let config = SmtpConfig {
            host: "mailpit".to_string(),
            port: 1025,
            username: None,
            password: None,
            from: "noreply@klynt.local".to_string(),
            tls: false,
        };
        let service = SmtpEmailService::from_config(&config);
        assert!(service.is_ok());
    }
}
