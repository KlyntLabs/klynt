# klynt_storage

Database and storage abstractions.

## Purpose

Provides infrastructure for persistence without depending on a specific
domain model:

- **Connection management**: `DbPool`, `create_pool`, `health_check`.
- **Errors**: `StorageError`, `StorageResult<T>`.
- **Traits**: `Repository`, `Transactional`.

## When to use it

Service crates can depend on `klynt_storage` for pool creation and repository
traits. Concrete repositories for domain entities belong in service-specific
infrastructure crates.

## Example

```rust
use klynt_storage::{create_pool, health_check};

#[tokio::main]
async fn main() {
    let pool = create_pool("postgresql://...").await.unwrap();
    assert!(health_check(&pool).await);
}
```
