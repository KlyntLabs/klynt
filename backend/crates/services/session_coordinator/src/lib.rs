//! Session synchronization coordinator.
//!
//! Listens to membership change events and keeps session state in sync.

pub mod config;
pub mod coordinator;
pub mod error;
pub mod event;

#[cfg(test)]
mod tests;

pub use config::SessionCoordinatorConfig;
pub use coordinator::SessionCoordinator;
pub use error::SessionCoordinatorError;
pub use event::MembershipEvent;
