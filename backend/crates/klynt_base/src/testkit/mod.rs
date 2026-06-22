//! Shared test utilities and deterministic test doubles.
//!
//! This module is only available when the `testkit` feature is enabled. It
//! provides reusable implementations of [`Clock`], [`PasswordHasher`], in-memory
//! repository/store fakes, and helper functions for context and domain model
//! construction so that service tests don't duplicate the same fakes.
//!
//! [`Clock`]: crate::ports::Clock
//! [`PasswordHasher`]: crate::ports::PasswordHasher

pub mod clock;
pub mod context;
pub mod crypto;
pub mod domain;
pub mod repository;
pub mod session;
pub mod token;

pub use clock::TestClock;
pub use context::test_ctx;
pub use crypto::TestPasswordHasher;
pub use domain::{sample_active_user, sample_user};
pub use repository::FakeUserRepository;
pub use session::FakeSessionStore;
pub use token::FakeTokenStore;
