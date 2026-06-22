//! Session types and the canonical session-store port re-export.
//!
//! The canonical port lives in [`klynt_base::ports::session`]; this module
//! re-exports it for auth-service internal use.

pub use klynt_base::ports::session::{Session, SessionError, SessionStore, SessionToken};
