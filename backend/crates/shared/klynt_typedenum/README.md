# klynt_typedenum

Shared enums and type-safe constants.

## Purpose

Centralizes enum values that appear in multiple services, ensuring consistent
serialization and deserialization:

- `UserRole`: `Admin`, `Instructor`, `Student`.
- `UserStatus`: `Active`, `Inactive`, `Suspended`, `Pending`.

Enums serialize to lowercase strings by default.

## When to use it

Use this crate whenever a role, status, or other shared enum needs to cross
service boundaries.

## Example

```rust
use klynt_typedenum::{UserRole, UserStatus};

let role = UserRole::Student;
let status = UserStatus::default(); // Pending
```
