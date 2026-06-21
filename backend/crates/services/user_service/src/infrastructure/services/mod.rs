//! Infrastructure service adapters.

pub mod audit_adapter;
pub mod password_hasher_adapter;

pub use audit_adapter::AuditLoggerAdapter;
pub use password_hasher_adapter::PasswordHasherAdapter;
