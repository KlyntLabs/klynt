//! Shared application-layer ports (dependency interfaces).

pub mod audit;
pub mod clock;
pub mod email;
pub mod http_error;
pub mod password_hasher;
pub mod permission;
pub mod repository;
pub mod session;
pub mod token;

pub use audit::AuditLogger;
pub use clock::{Clock, SystemClock};
pub use email::{EmailError, EmailSender};
pub use http_error::HttpError;
pub use password_hasher::{PasswordHashError, PasswordHasher};
pub use permission::{PermissionRepository, RoleRepository};
pub use repository::{RepositoryError, UserRepository};
pub use session::{Session, SessionError, SessionStore, SessionToken};
pub use token::{TokenError, TokenKind, TokenStore};
