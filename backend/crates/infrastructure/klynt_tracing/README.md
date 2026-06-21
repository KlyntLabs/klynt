# klynt_tracing

Observability and tracing utilities.

## Purpose

Wraps `tracing`, `tracing-subscriber`, and `tracing-error` in a small,
service-ready API:

- **Subscriber setup**: `init_tracing`.
- **Field names**: `REQUEST_ID`, `USER_ID`, `SERVICE_NAME`, `TRACE_ID`.
- **Middleware helpers**: `make_request_span`.

## When to use it

Use this crate to initialize tracing and keep field names consistent across
services and middleware.

## Example

```rust
use klynt_core::RequestId;
use klynt_tracing::{init_tracing, make_request_span};

init_tracing("auth-service");
let _span = make_request_span(RequestId::new());
```
