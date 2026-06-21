//! Shared application-layer ports (dependency interfaces).

pub mod clock;
pub mod http_error;
pub mod password_hasher;

pub use clock::{Clock, SystemClock};
pub use http_error::HttpError;
pub use password_hasher::{PasswordHashError, PasswordHasher};
