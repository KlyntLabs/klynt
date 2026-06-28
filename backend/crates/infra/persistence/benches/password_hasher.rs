//! Benchmarks for password hashing operations.
//!
//! These benchmarks measure the synchronous CPU cost of Argon2 hashing and
//! verification. The numbers justify moving this work off the Tokio async
//! runtime with `spawn_blocking` so it does not block worker threads.

use criterion::{black_box, criterion_group, criterion_main, Criterion};
use persistence::password_hasher::Argon2PasswordHasher;
use persistence::ports::PasswordHasher;

fn bench_password_hash(c: &mut Criterion) {
    let hasher = Argon2PasswordHasher::new();
    let password = "a-very-long-password-for-benchmarking";
    let rt = tokio::runtime::Runtime::new().unwrap();

    c.bench_function("argon2_hash", |b| {
        b.to_async(&rt)
            .iter(|| async { hasher.hash(black_box(password)).await.unwrap() });
    });
}

fn bench_password_verify(c: &mut Criterion) {
    let hasher = Argon2PasswordHasher::new();
    let password = "a-very-long-password-for-benchmarking";
    let rt = tokio::runtime::Runtime::new().unwrap();
    let hash = rt.block_on(hasher.hash(password)).unwrap();

    c.bench_function("argon2_verify", |b| {
        b.to_async(&rt)
            .iter(|| async { hasher.verify(black_box(password), &hash).await.unwrap() });
    });
}

criterion_group!(benches, bench_password_hash, bench_password_verify);
criterion_main!(benches);
