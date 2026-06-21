//! Shared domain types and errors.

pub mod error;
pub mod types;

mod user;

pub use error::*;
pub use types::*;
pub use user::User;

// Re-export the canonical email type from the util module so that
// `klynt_common::domain::Email` and `klynt_common::util::Email` refer to
// the same validated wrapper.
pub use crate::util::Email;
