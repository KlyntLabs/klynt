//! Event types.

use serde::{Deserialize, Serialize};
use std::any::Any;

/// Domain event
pub trait Event: Any + Send + Sync {
    /// Event type name
    fn event_type(&self) -> &'static str;

    /// Event version
    fn version(&self) -> &'static str {
        "1.0"
    }

    /// Convert to any
    fn as_any(&self) -> &dyn Any;
}

/// Event metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventMetadata {
    pub event_id: String,
    pub event_type: String,
    pub version: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub source: String,
}

/// Envelope for events
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventEnvelope {
    pub metadata: EventMetadata,
    pub payload: serde_json::Value,
}
