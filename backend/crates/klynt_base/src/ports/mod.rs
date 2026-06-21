//! Shared application-layer ports (dependency interfaces).

pub mod clock;
pub mod password_hasher;

pub use clock::{Clock, SystemClock};
pub use password_hasher::{PasswordHashError, PasswordHasher};
