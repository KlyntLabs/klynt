//! # Klynt Persistence
//!
//! Data access, storage ports, repositories, and infrastructure adapters.

pub mod db;
pub mod email;
pub mod email_content;
pub mod error;
pub mod health;
pub mod password_hasher;
pub mod ports;
pub mod rate_limiter;
pub mod repositories;
pub mod repository;
pub mod token_generator;

pub use db::*;
pub use email::*;
pub use email_content::*;
pub use error::*;
pub use password_hasher::*;
pub use ports::*;
pub use rate_limiter::*;
pub use repositories::*;
pub use repository::*;
pub use token_generator::*;

/// Unified error type used by storage ports and operations.
pub type Error = klynt_domain::DomainError;
