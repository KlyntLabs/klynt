# base

Base types and abstractions used across all Klynt services.

## Purpose

Provides the lowest-level, service-agnostic primitives:

- **Constants**: pagination defaults, session durations, API version prefix.
- **Traits**: `Identifiable`, `Auditable`, `SoftDeletable`, `Paginated`, `Validate`.
- **Context**: `RequestId`, `RequestContext`, `ExecutionContext`, and `ActorType`.

## When to use it

Any crate that needs request-scoped identifiers, shared entity traits, or
foundational constants should depend on `base` instead of duplicating
these types.

## Example

```rust
use base::{RequestContext, ExecutionContext, ActorType};

let request = RequestContext::new();
let ctx = ExecutionContext::new(request)
    .with_actor(user_id, ActorType::User);
```
