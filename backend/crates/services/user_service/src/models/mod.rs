//! User service models and DTOs.
//!
//! These types live in `klynt_domain::contracts::user` so they can be shared
//! across service boundaries; this module re-exports them for local
//! convenience.

pub use klynt_domain::contracts::user::{ProfileUpdate, UserProfile};
