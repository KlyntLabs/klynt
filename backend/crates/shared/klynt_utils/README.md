# klynt_utils

Common utilities for ID generation, cryptography, and time handling.

## Purpose

Reusable helpers that are not domain-specific:

- **ID generation**: UUID v4, ULID, and strongly-typed `Id<T>` wrappers.
- **Crypto**: random alphanumeric strings, URL-safe tokens, SHA-256 hashing.
- **Time**: UTC now, duration arithmetic, past/future checks.

## When to use it

Use `klynt_utils` for cross-cutting concerns like generating tokens, hashing
stable identifiers, or working with strongly-typed IDs.

## Example

```rust
use klynt_utils::{UserId, random_token, sha256_hash};

let user_id = UserId::new();
let token = random_token(32);
let hash = sha256_hash(token.as_bytes());
```
