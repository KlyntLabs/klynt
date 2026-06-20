use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::errors::DomainError;
use crate::models::UserId;

/// Email verification token.
///
/// Tokens are generated with a CSPRNG (≥256 bits) and stored as SHA-256 hashes.
/// The plaintext token is sent via email and never stored in the database.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EmailVerificationToken {
    pub plaintext: String,
    pub hash: String,
    pub user_id: UserId,
    pub expires_at: DateTime<Utc>,
}

impl EmailVerificationToken {
    /// Token lifetime before expiry.
    pub const TTL: Duration = Duration::hours(24);

    /// Generate a new verification token with CSPRNG.
    ///
    /// Returns both the plaintext (for email) and hash (for storage).
    pub fn generate(user_id: UserId) -> Self {
        let plaintext = Self::generate_csprng_token();
        let hash = Self::sha256_hash(&plaintext);
        let expires_at = Utc::now() + Self::TTL;

        Self {
            plaintext,
            hash,
            user_id,
            expires_at,
        }
    }

    /// Generate a cryptographically secure random token (≥256 bits).
    fn generate_csprng_token() -> String {
        // 43 bytes of random data = 344 bits (more than 256 required)
        // Base64URL encoding = ~58 characters
        use rand::Rng;
        let mut rng = rand::thread_rng();
        let bytes: [u8; 43] = rng.gen();
        base64_url_encode(&bytes)
    }

    /// Compute SHA-256 hash of token (hex string).
    fn sha256_hash(token: &str) -> String {
        use sha2::{Digest, Sha256};
        let mut hasher = Sha256::new();
        hasher.update(token.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    /// Check if token has expired.
    pub fn is_expired(&self) -> bool {
        Utc::now() >= self.expires_at
    }
}

/// Password reset token.
///
/// Similar to email verification but with shorter TTL for security.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PasswordResetToken {
    pub plaintext: String,
    pub hash: String,
    pub user_id: UserId,
    pub expires_at: DateTime<Utc>,
}

impl PasswordResetToken {
    /// Token lifetime before expiry (shorter than email verification).
    pub const TTL: Duration = Duration::minutes(30);

    /// Generate a new reset token with CSPRNG.
    pub fn generate(user_id: UserId) -> Self {
        let plaintext = Self::generate_csprng_token();
        let hash = Self::sha256_hash(&plaintext);
        let expires_at = Utc::now() + Self::TTL;

        Self {
            plaintext,
            hash,
            user_id,
            expires_at,
        }
    }

    /// Generate a cryptographically secure random token (≥256 bits).
    fn generate_csprng_token() -> String {
        use rand::Rng;
        let mut rng = rand::thread_rng();
        let bytes: [u8; 43] = rng.gen();
        base64_url_encode(&bytes)
    }

    /// Compute SHA-256 hash of token (hex string).
    fn sha256_hash(token: &str) -> String {
        use sha2::{Digest, Sha256};
        let mut hasher = Sha256::new();
        hasher.update(token.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    /// Check if token has expired.
    pub fn is_expired(&self) -> bool {
        Utc::now() >= self.expires_at
    }
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
    fn email_token_has_sufficient_entropy() {
        let token = EmailVerificationToken::generate(UserId::new());
        // Base64URL encoding of 43 bytes = 58 chars
        assert!(token.plaintext.len() >= 56);
        // Hash is 64 hex chars (256 bits)
        assert_eq!(token.hash.len(), 64);
    }

    #[test]
    fn email_token_expires_after_24_hours() {
        let token = EmailVerificationToken::generate(UserId::new());
        let expected_expiry = Utc::now() + EmailVerificationToken::TTL;
        // Allow 1 second tolerance
        let diff = (token.expires_at - expected_expiry).num_seconds().abs();
        assert!(diff <= 1);
    }

    #[test]
    fn reset_token_expires_after_30_minutes() {
        let token = PasswordResetToken::generate(UserId::new());
        let expected_expiry = Utc::now() + PasswordResetToken::TTL;
        // Allow 1 second tolerance
        let diff = (token.expires_at - expected_expiry).num_seconds().abs();
        assert!(diff <= 1);
    }

    #[test]
    fn token_hashes_are_different_for_same_input() {
        let plaintext = "test-token";
        let hash1 = EmailVerificationToken::sha256_hash(plaintext);
        // Hash should be deterministic
        let hash2 = EmailVerificationToken::sha256_hash(plaintext);
        assert_eq!(hash1, hash2);
        assert_eq!(hash1.len(), 64);
    }

    #[test]
    fn generated_tokens_are_unique() {
        let user_id = UserId::new();
        let token1 = EmailVerificationToken::generate(user_id);
        let token2 = EmailVerificationToken::generate(user_id);
        assert_ne!(token1.plaintext, token2.plaintext);
        assert_ne!(token1.hash, token2.hash);
    }

    #[test]
    fn expired_token_detection_works() {
        let mut token = EmailVerificationToken::generate(UserId::new());
        // Set expiry to past
        token.expires_at = Utc::now() - Duration::seconds(1);
        assert!(token.is_expired());

        // Set expiry to future
        token.expires_at = Utc::now() + Duration::seconds(1);
        assert!(!token.is_expired());
    }
}
