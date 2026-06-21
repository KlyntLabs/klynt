//! Integration tests for the Redis-backed idempotency store.

use klynt_domain::ports::IdempotencyStore;
use klynt_infrastructure::repositories::redis_idempotency::RedisIdempotencyStore;
use uuid::Uuid;

fn redis_url() -> String {
    std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379/0".to_string())
}

#[derive(Clone, serde::Serialize, serde::Deserialize, Debug, PartialEq)]
struct Payload {
    value: u32,
}

#[tokio::test]
async fn get_returns_none_for_unknown_key() {
    let store: RedisIdempotencyStore<Payload> =
        RedisIdempotencyStore::new(&redis_url(), 60).await.unwrap();
    let key = Uuid::new_v4();

    let result = store.get(key).await.unwrap();

    assert!(result.is_none());
}

#[tokio::test]
async fn set_and_get_round_trip() {
    let store: RedisIdempotencyStore<Payload> =
        RedisIdempotencyStore::new(&redis_url(), 60).await.unwrap();
    let key = Uuid::new_v4();
    let payload = Payload { value: 42 };

    store.set(key, payload.clone()).await.unwrap();
    let result = store.get(key).await.unwrap();

    assert_eq!(result, Some(payload));
}

#[tokio::test]
async fn get_or_insert_returns_none_on_first_call() {
    let store: RedisIdempotencyStore<Payload> =
        RedisIdempotencyStore::new(&redis_url(), 60).await.unwrap();
    let key = Uuid::new_v4();
    let payload = Payload { value: 7 };

    let result = store.get_or_insert(key, payload.clone()).await.unwrap();

    assert!(result.is_none());
}

#[tokio::test]
async fn get_or_insert_returns_existing_value_on_second_call() {
    let store: RedisIdempotencyStore<Payload> =
        RedisIdempotencyStore::new(&redis_url(), 60).await.unwrap();
    let key = Uuid::new_v4();
    let first = Payload { value: 1 };
    let second = Payload { value: 2 };

    store.get_or_insert(key, first.clone()).await.unwrap();
    let result = store.get_or_insert(key, second).await.unwrap();

    assert_eq!(result, Some(first));
}
