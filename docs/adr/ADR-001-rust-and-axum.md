# ADR-001: Use Rust + Axum for the Backend

## Status
Accepted

## Date
2026-06-18

## Context
We need a backend stack that is performant, type-safe, and maintainable for an education platform that will eventually handle authentication, courses, lessons, assignments, analytics, and payments.

## Decision
Use Rust with Axum as the backend framework.

## Alternatives Considered

### Node.js + Express/Fastify
- Pros: Large ecosystem, fast to prototype
- Cons: Runtime errors, less efficient for CPU-bound work, weaker type safety
- Rejected: Long-term maintainability and performance favor Rust

### Go + Gin/Echo
- Pros: Fast compile times, simple concurrency
- Cons: Less expressive type system, smaller ecosystem for some domains
- Rejected: Rust's ownership model and type system provide stronger correctness guarantees

## Consequences
- Steeper learning curve for some team members
- Excellent performance and memory safety
- Strong async ecosystem with Tokio
- Axum's composable middleware and state management fit Clean Architecture
