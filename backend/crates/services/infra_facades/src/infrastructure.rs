//! Infrastructure facade — groups infrastructure adapters.

use base::ports::Clock;
use base::ports::EmailSender;
use base::ports::PasswordHasher;
use std::sync::Arc;

/// Infrastructure facade — single access point to infrastructure adapters.
pub struct InfraFacade {
    pub password_hasher: Arc<dyn PasswordHasher>,
    pub email_sender: Arc<dyn EmailSender>,
    pub clock: Arc<dyn Clock>,
}

impl InfraFacade {
    /// Create a new infrastructure facade.
    pub fn new(
        password_hasher: Arc<dyn PasswordHasher>,
        email_sender: Arc<dyn EmailSender>,
        clock: Arc<dyn Clock>,
    ) -> Self {
        Self {
            password_hasher,
            email_sender,
            clock,
        }
    }
}
