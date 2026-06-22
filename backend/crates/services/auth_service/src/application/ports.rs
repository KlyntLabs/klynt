//! Application-layer ports (dependency interfaces).

// Canonical ports from klynt_base.
pub use klynt_base::ports::audit::AuditLogger;
pub use klynt_base::ports::email::EmailSender;
pub use klynt_base::ports::repository::UserRepository;
