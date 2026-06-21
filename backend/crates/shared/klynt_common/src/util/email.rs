//! Email address type with validation.

use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error, PartialEq)]
pub enum EmailError {
    #[error("email is empty")]
    Empty,
    #[error("invalid email format")]
    InvalidFormat,
}

/// Email address wrapper.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Email(String);

impl Email {
    /// Parse and validate an email address.
    pub fn parse(raw: &str) -> Result<Self, EmailError> {
        let trimmed = raw.trim();
        if trimmed.is_empty() {
            return Err(EmailError::Empty);
        }

        let parts: Vec<&str> = trimmed.split('@').collect();
        if parts.len() != 2 {
            return Err(EmailError::InvalidFormat);
        }
        let local = parts[0];
        let domain = parts[1];
        if local.is_empty()
            || domain.is_empty()
            || !domain.contains('.')
            || domain.starts_with('.')
            || domain.ends_with('.')
        {
            return Err(EmailError::InvalidFormat);
        }

        Ok(Self(trimmed.to_lowercase()))
    }

    /// Get inner string.
    pub fn as_str(&self) -> &str {
        &self.0
    }

    /// Create email without validation (for tests).
    pub fn unsafe_new(email: String) -> Self {
        Self(email.to_lowercase())
    }
}

impl std::fmt::Display for Email {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_valid_email() {
        let email = Email::parse("User@Example.COM").unwrap();
        assert_eq!(email.as_str(), "user@example.com");
    }

    #[test]
    fn parse_empty_email_fails() {
        assert_eq!(Email::parse("  ").unwrap_err(), EmailError::Empty);
    }

    #[test]
    fn parse_missing_at_sign_fails() {
        assert_eq!(
            Email::parse("user.example.com").unwrap_err(),
            EmailError::InvalidFormat
        );
    }

    #[test]
    fn parse_missing_domain_dot_fails() {
        assert_eq!(
            Email::parse("user@example").unwrap_err(),
            EmailError::InvalidFormat
        );
    }

    #[test]
    fn parse_leading_or_trailing_domain_dot_fails() {
        assert!(matches!(
            Email::parse("user@.example.com").unwrap_err(),
            EmailError::InvalidFormat
        ));
        assert!(matches!(
            Email::parse("user@example.com.").unwrap_err(),
            EmailError::InvalidFormat
        ));
    }

    #[test]
    fn display_and_as_str_match() {
        let email = Email::parse("test@klynt.dev").unwrap();
        assert_eq!(email.to_string(), email.as_str());
    }

    #[test]
    fn unsafe_new_preserves_lower_case() {
        let email = Email::unsafe_new("Admin@Klynt.Dev".to_string());
        assert_eq!(email.as_str(), "admin@klynt.dev");
    }
}
