# klynt_messaging

Event messaging and pub/sub infrastructure.

## Purpose

Defines the messaging contracts used to publish and subscribe to domain
events:

- **Events**: `Event` trait, `EventMetadata`, `EventEnvelope`.
- **Bus**: `MessageBus` trait for publishing and subscribing.
- **Errors**: `MessagingError`.

## When to use it

Use this crate when a service needs to emit or react to domain events without
knowing the concrete broker implementation.

## Example

```rust
use klynt_messaging::{EventEnvelope, EventMetadata};

let envelope = EventEnvelope {
    metadata: EventMetadata {
        event_id: "evt_123".to_string(),
        event_type: "user.registered".to_string(),
        version: "1.0".to_string(),
        timestamp: chrono::Utc::now(),
        source: "auth-service".to_string(),
    },
    payload: serde_json::json!({"user_id": "u_123"}),
};
```
