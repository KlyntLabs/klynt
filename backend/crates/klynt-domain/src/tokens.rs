use chrono::{DateTime, Duration, Utc};

use crate::models::UserId;

/// Which kind of token — determines TTL and target table.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum TokenKind {
    EmailVerification,
    PasswordReset,
}

impl TokenKind {
    /// Token lifetime before expiry.
    pub const fn ttl(self) -> Duration {
        match self {
            Self::EmailVerification => Duration::hours(24),
            Self::PasswordReset => Duration::minutes(30),
        }
    }

    /// Database table name for this token kind.
    pub const fn table(self) -> &'static str {
        match self {
            Self::EmailVerification => "email_verification_tokens",
            Self::PasswordReset => "password_reset_tokens",
        }
    }
}

/// A generated token — plaintext (for email) + hash (for storage).
///
/// Generated with a CSPRNG (≥256 bits), stored as a SHA-256 hash.
/// The plaintext is sent via email and never stored in the database.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Token {
    pub plaintext: String,
    pub hash: String,
    pub user_id: UserId,
    pub expires_at: DateTime<Utc>,
    pub kind: TokenKind,
}

impl Token {
    /// Generate a new token of the given kind for the given user.
    pub fn generate(kind: TokenKind, user_id: UserId) -> Self {
        let plaintext = generate_csprng_token();
        let hash = Self::sha256_hash(&plaintext);
        let expires_at = Utc::now() + kind.ttl();

        Self {
            plaintext,
            hash,
            user_id,
            expires_at,
            kind,
        }
    }

    /// Compute SHA-256 hash of a plaintext token (hex string).
    pub fn sha256_hash(token: &str) -> String {
        sha256_hash_inner(token)
    }

    /// Check if token has expired.
    pub fn is_expired(&self) -> bool {
        Utc::now() >= self.expires_at
    }
}

/// Generate a cryptographically secure random token (≥256 bits).
fn generate_csprng_token() -> String {
    // 43 bytes of random data = 344 bits (more than 256 required)
    // Base64URL encoding = ~58 characters
    use rand::Rng;
    let mut rng = rand::thread_rng();
    let mut bytes = [0u8; 43];
    for byte in bytes.iter_mut() {
        *byte = rng.gen();
    }
    base64_url_encode(&bytes)
}

/// Compute SHA-256 hash (hex string).
fn sha256_hash_inner(token: &str) -> String {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(token.as_bytes());
    format!("{:x}", hasher.finalize())
}

/// Base64URL-encode without padding (URL-safe).
fn base64_url_encode(data: &[u8]) -> String {
    use base64::prelude::*;
    BASE64_URL_SAFE_NO_PAD.encode(data)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn email_verification_token_has_sufficient_entropy() {
        let token = Token::generate(TokenKind::EmailVerification, UserId::new());
        assert!(token.plaintext.len() >= 56);
        assert_eq!(token.hash.len(), 64);
    }

    #[test]
    fn email_verification_expires_after_24_hours() {
        let token = Token::generate(TokenKind::EmailVerification, UserId::new());
        let expected = Utc::now() + TokenKind::EmailVerification.ttl();
        let diff = (token.expires_at - expected).num_seconds().abs();
        assert!(diff <= 1);
    }

    #[test]
    fn password_reset_expires_after_30_minutes() {
        let token = Token::generate(TokenKind::PasswordReset, UserId::new());
        let expected = Utc::now() + TokenKind::PasswordReset.ttl();
        let diff = (token.expires_at - expected).num_seconds().abs();
        assert!(diff <= 1);
    }

    #[test]
    fn sha256_is_deterministic() {
        let h1 = Token::sha256_hash("test-token");
        let h2 = Token::sha256_hash("test-token");
        assert_eq!(h1, h2);
        assert_eq!(h1.len(), 64);
    }

    #[test]
    fn generated_tokens_are_unique() {
        let uid = UserId::new();
        let t1 = Token::generate(TokenKind::EmailVerification, uid);
        let t2 = Token::generate(TokenKind::EmailVerification, uid);
        assert_ne!(t1.plaintext, t2.plaintext);
        assert_ne!(t1.hash, t2.hash);
    }

    #[test]
    fn expired_token_detection_works() {
        let mut token = Token::generate(TokenKind::EmailVerification, UserId::new());
        token.expires_at = Utc::now() - Duration::seconds(1);
        assert!(token.is_expired());

        token.expires_at = Utc::now() + Duration::seconds(1);
        assert!(!token.is_expired());
    }

    #[test]
    fn token_kind_table_names_differ() {
        assert_ne!(
            TokenKind::EmailVerification.table(),
            TokenKind::PasswordReset.table()
        );
    }
}
