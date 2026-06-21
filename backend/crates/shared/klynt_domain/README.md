# klynt_shared_domain

Shared domain types and errors used across multiple services.

## Purpose

Contains domain primitives that are stable enough to be reused without tying
callers to a specific service implementation:

- **Errors**: `DomainError` and `DomainResult<T>`.
- **Types**: `Email`, `Timestamp`, `PaginationRequest`, `PaginatedResponse<T>`.

## When to use it

Use this crate for shared domain vocabulary. Service-specific models should
remain in their own crates.

## Example

```rust
use klynt_shared_domain::{Email, PaginationRequest};

let email = Email::new("user@example.com".to_string());
let page = PaginationRequest::first();
```
