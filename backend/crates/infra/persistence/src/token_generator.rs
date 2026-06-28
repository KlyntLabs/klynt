use rand::RngExt;

/// Cryptographically secure token generator.
///
/// Uses thread-local RNG to generate URL-safe tokens with sufficient entropy.
pub struct TokenGenerator;

impl TokenGenerator {
    /// Generate a URL-safe token with ≥256 bits of entropy.
    ///
    /// Returns a base64URL-encoded string without padding.
    /// 43 random bytes → 344 bits → ~58 character string.
    pub fn generate() -> String {
        let mut rng = rand::rng();
        let mut bytes = [0u8; 43];
        rng.fill(&mut bytes[..]);
        base64_url_encode(&bytes)
    }

    /// Generate a token of specific byte length.
    pub fn generate_with_bytes(byte_length: usize) -> String {
        let mut rng = rand::rng();
        let mut bytes = vec![0u8; byte_length];
        rng.fill(bytes.as_mut_slice());
        base64_url_encode(&bytes)
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
    fn generates_url_safe_tokens() {
        let token = TokenGenerator::generate();
        // Should not contain padding
        assert!(!token.contains('='));
        // Should be reasonable length
        assert!(token.len() >= 50);
    }

    #[test]
    fn generates_unique_tokens() {
        let token1 = TokenGenerator::generate();
        let token2 = TokenGenerator::generate();
        assert_ne!(token1, token2);
    }

    #[test]
    fn can_generate_custom_length_tokens() {
        let token = TokenGenerator::generate_with_bytes(32);
        // 32 bytes → 256 bits → ~43 chars in base64
        assert!(token.len() >= 40);
    }

    #[test]
    fn tokens_are_url_safe() {
        let token = TokenGenerator::generate();
        // Should only contain URL-safe characters
        assert!(token
            .chars()
            .all(|c| c.is_alphanumeric() || c == '-' || c == '_'));
    }
}
