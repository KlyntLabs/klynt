//! Email configuration.

use serde::Deserialize;

/// Email delivery provider.
#[derive(Debug, Clone, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "lowercase")]
pub enum EmailProvider {
    /// In-memory mock that records emails for testing.
    #[default]
    Mock,
    /// SMTP relay (e.g. Mailpit in local dev, AWS SES/Postmark in prod).
    Smtp,
}

/// SMTP-specific settings.
#[derive(Debug, Clone, Deserialize)]
pub struct SmtpConfig {
    /// SMTP server hostname.
    #[serde(default = "default_smtp_host")]
    pub host: String,

    /// SMTP server port.
    #[serde(default = "default_smtp_port")]
    pub port: u16,

    /// Optional username for SMTP authentication.
    pub username: Option<String>,

    /// Optional password for SMTP authentication.
    pub password: Option<String>,

    /// Sender address used in the `From` header.
    #[serde(default = "default_smtp_from")]
    pub from: String,

    /// Whether to use TLS. For local dev with Mailpit this should be false.
    #[serde(default)]
    pub tls: bool,
}

impl Default for SmtpConfig {
    fn default() -> Self {
        Self {
            host: default_smtp_host(),
            port: default_smtp_port(),
            username: None,
            password: None,
            from: default_smtp_from(),
            tls: false,
        }
    }
}

fn default_smtp_host() -> String {
    "localhost".to_string()
}

fn default_smtp_port() -> u16 {
    1025
}

fn default_smtp_from() -> String {
    "noreply@klynt.local".to_string()
}

/// Top-level email configuration.
#[derive(Debug, Clone, Deserialize, Default)]
pub struct EmailConfig {
    /// Which email backend to use.
    #[serde(default)]
    pub provider: EmailProvider,

    /// SMTP settings used when `provider` is `Smtp`.
    #[serde(default)]
    pub smtp: SmtpConfig,
}
