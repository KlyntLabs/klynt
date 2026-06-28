use crate::ports::{HashedPassword, PasswordHasher};
use argon2::{
    password_hash::{rand_core::OsRng, SaltString},
    Argon2, PasswordHash, PasswordHasher as Argon2PasswordHasherTrait, PasswordVerifier,
};
use domain::DomainError;

#[derive(Debug, Default, Clone)]
pub struct Argon2PasswordHasher;

impl Argon2PasswordHasher {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait::async_trait]
impl PasswordHasher for Argon2PasswordHasher {
    async fn hash(&self, plaintext: &str) -> Result<HashedPassword, DomainError> {
        // Clone into owned `String`s because `spawn_blocking` requires `'static`
        // data and the trait boundary passes borrowed strings.
        let plaintext = plaintext.to_string();
        tokio::task::spawn_blocking(move || {
            let salt = SaltString::generate(&mut OsRng);
            let argon2 = Argon2::default();
            argon2
                .hash_password(plaintext.as_bytes(), &salt)
                .map(|hash| HashedPassword::from(hash.to_string()))
                .map_err(DomainError::internal)
        })
        .await
        .map_err(|e| DomainError::internal_msg(format!("password hashing task failed: {e}")))?
    }

    async fn verify(&self, plaintext: &str, hash: &HashedPassword) -> Result<bool, DomainError> {
        let plaintext = plaintext.to_string();
        let hash = hash.clone();
        tokio::task::spawn_blocking(move || {
            let parsed_hash = PasswordHash::new(hash.as_str()).map_err(DomainError::internal)?;
            match Argon2::default().verify_password(plaintext.as_bytes(), &parsed_hash) {
                Ok(()) => Ok(true),
                Err(argon2::password_hash::Error::Password) => Ok(false),
                Err(e) => Err(DomainError::internal(e)),
            }
        })
        .await
        .map_err(|e| DomainError::internal_msg(format!("password verification task failed: {e}")))?
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn hashes_and_verifies_password() {
        let hasher = Argon2PasswordHasher::new();
        let hash = hasher.hash("a-very-long-password").await.unwrap();
        assert!(hasher.verify("a-very-long-password", &hash).await.unwrap());
        assert!(!hasher.verify("wrong-password", &hash).await.unwrap());
    }

    #[tokio::test]
    async fn rejects_malformed_hash() {
        let hasher = Argon2PasswordHasher::new();
        let bad_hash = HashedPassword::new("not-a-valid-hash");
        let result = hasher.verify("password", &bad_hash).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn same_password_hashes_differently() {
        let hasher = Argon2PasswordHasher::new();
        let hash1 = hasher.hash("same-password").await.unwrap();
        let hash2 = hasher.hash("same-password").await.unwrap();
        assert_ne!(hash1, hash2);
        assert!(hasher.verify("same-password", &hash1).await.unwrap());
        assert!(hasher.verify("same-password", &hash2).await.unwrap());
    }

    #[tokio::test]
    async fn hashing_does_not_block_runtime() {
        use std::sync::atomic::{AtomicBool, Ordering};
        use std::sync::Arc;
        use std::time::Duration;

        let hasher = Arc::new(Argon2PasswordHasher::new());
        let hasher_for_task = Arc::clone(&hasher);
        let progress_flag = Arc::new(AtomicBool::new(false));
        let progress_flag_clone = Arc::clone(&progress_flag);

        // Start a slow hash on a blocking thread.
        let hash_task =
            tokio::spawn(
                async move { hasher_for_task.hash("long-running-password").await.unwrap() },
            );

        // Start a tiny async task that should make progress while the hash
        // runs. If hashing ran directly on the Tokio runtime, this task would
        // be blocked until the hash finished.
        let quick_task = tokio::spawn(async move {
            tokio::time::sleep(Duration::from_millis(10)).await;
            progress_flag_clone.store(true, Ordering::SeqCst);
        });

        tokio::time::timeout(Duration::from_secs(5), quick_task)
            .await
            .expect("quick async task should run while hash is on blocking thread")
            .unwrap();

        let hash = hash_task.await.unwrap();
        assert!(hasher.verify("long-running-password", &hash).await.unwrap());
        assert!(progress_flag.load(Ordering::SeqCst));
    }
}
