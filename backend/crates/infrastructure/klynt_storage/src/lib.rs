//! # Klynt Storage
//!
//! Storage abstractions, port interfaces, and database client.

pub mod db;
pub mod email_content;
pub mod error;
pub mod ports;
pub mod repository;
pub mod session;
pub mod tokens;

pub use db::*;
pub use email_content::*;
pub use error::*;
pub use ports::*;
pub use repository::*;
pub use session::*;
pub use tokens::*;

/// Unified error type used by storage ports and operations.
pub type Error = klynt_shared_domain::DomainError;
