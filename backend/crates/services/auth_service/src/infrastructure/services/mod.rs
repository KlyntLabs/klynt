//! Infrastructure service adapters.

pub mod audit_adapter;
pub mod email_adapter;
pub mod password_hasher_adapter;

pub use audit_adapter::AuditLoggerAdapter;
pub use email_adapter::EmailSenderAdapter;
pub use password_hasher_adapter::PasswordHasherAdapter;
