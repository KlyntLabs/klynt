//! Email content templates.

use klynt_utils::Email;

/// Domain entity for email content.
///
/// Separates email formatting/template logic from delivery.
/// Implementations define subject line, body content, and
/// any template variables.
pub trait EmailContent: Send + Sync {
    /// Recipient email address
    fn recipient(&self) -> &Email;

    /// Email subject line
    fn subject(&self) -> String;

    /// Plain text email body
    fn body_text(&self) -> String;

    /// HTML email body (optional)
    fn body_html(&self) -> Option<String> {
        None
    }

    /// Content type for the email body
    fn content_type(&self) -> &'static str {
        "text/plain"
    }
}

/// Verification email sent after user registration.
#[derive(Debug, Clone)]
pub struct VerificationEmail {
    recipient: Email,
    verification_token: String,
    base_url: String,
}

impl VerificationEmail {
    pub fn new(recipient: Email, verification_token: String, base_url: String) -> Self {
        Self {
            recipient,
            verification_token,
            base_url,
        }
    }
}

impl EmailContent for VerificationEmail {
    fn recipient(&self) -> &Email {
        &self.recipient
    }

    fn subject(&self) -> String {
        "Verify your Klynt account".to_string()
    }

    fn body_text(&self) -> String {
        format!(
            "Welcome to Klynt!\n\n\
            Please verify your email address by clicking the link below:\n\n\
            {base}/verify/{token}\n\n\
            This link expires in 24 hours.\n\n\
            If you didn't create a Klynt account, please ignore this email.",
            base = self.base_url,
            token = self.verification_token
        )
    }

    fn body_html(&self) -> Option<String> {
        Some(format!(
            r#"<html>
            <body style="font-family: Arial, sans-serif;">
                <h2>Welcome to Klynt!</h2>
                <p>Please verify your email address by clicking the button below:</p>
                <p>
                    <a href="{base}/verify/{token}"
                       style="background: #4F46E5; color: white; padding: 12px 24px;
                              text-decoration: none; border-radius: 6px; display: inline-block;">
                        Verify Email
                    </a>
                </p>
                <p style="color: #666; font-size: 14px;">
                    This link expires in 24 hours.<br/>
                    If you didn't create a Klynt account, please ignore this email.
                </p>
            </body>
        </html>"#,
            base = self.base_url,
            token = self.verification_token
        ))
    }

    fn content_type(&self) -> &'static str {
        "text/html"
    }
}

/// Password reset email initiated by user.
#[derive(Debug, Clone)]
pub struct PasswordResetEmail {
    recipient: Email,
    reset_token: String,
    base_url: String,
}

impl PasswordResetEmail {
    pub fn new(recipient: Email, reset_token: String, base_url: String) -> Self {
        Self {
            recipient,
            reset_token,
            base_url,
        }
    }
}

impl EmailContent for PasswordResetEmail {
    fn recipient(&self) -> &Email {
        &self.recipient
    }

    fn subject(&self) -> String {
        "Reset your Klynt password".to_string()
    }

    fn body_text(&self) -> String {
        format!(
            "You requested a password reset for your Klynt account.\n\n\
            Click the link below to reset your password:\n\n\
            {base}/reset-password/{token}\n\n\
            This link expires in 1 hour.\n\n\
            If you didn't request this reset, please ignore this email.",
            base = self.base_url,
            token = self.reset_token
        )
    }

    fn body_html(&self) -> Option<String> {
        Some(format!(
            r#"<html>
            <body style="font-family: Arial, sans-serif;">
                <h2>Reset Your Password</h2>
                <p>You requested a password reset for your Klynt account.</p>
                <p>Click the button below to reset your password:</p>
                <p>
                    <a href="{base}/reset-password/{token}"
                       style="background: #4F46E5; color: white; padding: 12px 24px;
                              text-decoration: none; border-radius: 6px; display: inline-block;">
                        Reset Password
                    </a>
                </p>
                <p style="color: #666; font-size: 14px;">
                    This link expires in 1 hour.<br/>
                    If you didn't request this reset, please ignore this email.
                </p>
            </body>
        </html>"#,
            base = self.base_url,
            token = self.reset_token
        ))
    }

    fn content_type(&self) -> &'static str {
        "text/html"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn verification_email_has_required_fields() {
        let email = Email::parse("user@example.com").unwrap();
        let content = VerificationEmail::new(
            email.clone(),
            "token123".to_string(),
            "https://klynt.edu".to_string(),
        );

        assert_eq!(content.recipient(), &email);
        assert_eq!(content.subject(), "Verify your Klynt account");
        assert!(content.body_text().contains("token123"));
        assert!(content.body_text().contains("https://klynt.edu"));
    }

    #[test]
    fn verification_email_includes_html_version() {
        let email = Email::parse("user@example.com").unwrap();
        let content = VerificationEmail::new(
            email,
            "token123".to_string(),
            "https://klynt.edu".to_string(),
        );

        assert!(content.body_html().is_some());
        let html = content.body_html().unwrap();
        assert!(html.contains("<html>"));
        assert!(html.contains("token123"));
    }

    #[test]
    fn password_reset_email_has_required_fields() {
        let email = Email::parse("user@example.com").unwrap();
        let content = PasswordResetEmail::new(
            email.clone(),
            "reset456".to_string(),
            "https://klynt.edu".to_string(),
        );

        assert_eq!(content.recipient(), &email);
        assert_eq!(content.subject(), "Reset your Klynt password");
        assert!(content.body_text().contains("reset456"));
    }
}
