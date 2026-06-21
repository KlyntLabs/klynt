//! Shared domain types and errors.

pub mod error;
pub mod types;

mod user;

pub use error::*;
pub use types::*;
pub use user::User;
