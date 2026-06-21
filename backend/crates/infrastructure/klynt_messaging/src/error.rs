//! Messaging-related errors.

use thiserror::Error;

/// Messaging error type
#[derive(Error, Debug)]
pub enum MessagingError {
    #[error("Connection failed: {0}")]
    Connection(String),

    #[error("Publish failed: {0}")]
    Publish(String),

    #[error("Subscription failed: {0}")]
    Subscription(String),

    #[error("Serialization failed: {0}")]
    Serialization(String),
}
