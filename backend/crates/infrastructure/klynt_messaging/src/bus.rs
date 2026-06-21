//! Message bus abstraction.

use crate::error::MessagingError;
use crate::event::EventEnvelope;
use async_trait::async_trait;

/// Message bus trait
#[async_trait]
pub trait MessageBus: Send + Sync {
    /// Publish an event
    async fn publish(&self, event: EventEnvelope) -> Result<(), MessagingError>;

    /// Subscribe to events
    async fn subscribe<F>(&self, pattern: &str, handler: F) -> Result<(), MessagingError>
    where
        F: Fn(EventEnvelope) + Send + Sync + 'static;
}
