//! Test support utilities and fake implementations for the gateway.

use std::sync::Arc;

use chrono::{DateTime, Utc};
use klynt_base::ports::{Clock, PasswordHashError, PasswordHasher};

pub mod auth;
pub mod session;
pub mod user;

pub use auth::build_test_auth_service;
pub use session::FakePersistenceSessionStore;
pub use user::{build_test_user_service, FakeUserServiceRepository};

/// Fixed clock for deterministic tests.
#[derive(Clone)]
pub struct FixedClock {
    pub now: DateTime<Utc>,
}

impl FixedClock {
    pub fn new(now: DateTime<Utc>) -> Self {
        Self { now }
    }
}

impl Clock for FixedClock {
    fn now(&self) -> DateTime<Utc> {
        self.now
    }
}

/// Fake password hasher that accepts any password matching "hash-{password}".
#[derive(Default, Clone)]
pub struct FakePasswordHasher;

#[async_trait::async_trait]
impl PasswordHasher for FakePasswordHasher {
    async fn hash(&self, password: &str) -> Result<String, PasswordHashError> {
        Ok(format!("hash-{password}"))
    }

    async fn verify(&self, password: &str, hash: &str) -> Result<bool, PasswordHashError> {
        Ok(hash == format!("hash-{password}"))
    }
}

/// Build test gateway services with exposed fakes for protected route tests.
pub fn build_test_services_with_fakes() -> (
    gateways::state::Services,
    Arc<session_service::SessionService>,
    Arc<FakeUserServiceRepository>,
) {
    let (auth_service, _, _) = build_test_auth_service();
    let session_store = Arc::new(FakePersistenceSessionStore::default());
    let session_service = Arc::new(session_service::SessionService::new(
        session_service::SessionConfig::default(),
        session_store,
    ));
    let (user_service, user_repo) = build_test_user_service();

    let services = gateways::state::Services {
        auth: Arc::new(auth_service),
        user: Arc::new(user_service),
        session: session_service.clone(),
    };

    (services, session_service, user_repo)
}

/// Build test gateway services.
pub fn build_test_services() -> gateways::state::Services {
    let (services, _, _) = build_test_services_with_fakes();
    services
}

/// Default test configuration.
pub fn test_config() -> gateways::Config {
    gateways::Config::default()
}
