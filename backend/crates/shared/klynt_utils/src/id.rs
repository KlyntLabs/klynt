//! ID generation and utilities.

use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Generate a new UUID v4
pub fn uuid_v4() -> Uuid {
    Uuid::new_v4()
}

/// Generate a new ULID
pub fn ulid() -> String {
    ulid::Ulid::new().to_string()
}

/// Parse ID from string
pub fn parse_id(s: &str) -> Result<Uuid, uuid::Error> {
    Uuid::parse_str(s)
}

/// Wrapper for strongly-typed IDs
#[derive(Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Id<T>(pub Uuid, std::marker::PhantomData<T>);

impl<T> Id<T> {
    /// Create a new ID
    pub fn new() -> Self {
        Self(Uuid::new_v4(), std::marker::PhantomData)
    }

    /// Create from UUID
    pub fn from_uuid(uuid: Uuid) -> Self {
        Self(uuid, std::marker::PhantomData)
    }

    /// Get the inner UUID
    pub fn inner(&self) -> Uuid {
        self.0
    }
}

impl<T> Default for Id<T> {
    fn default() -> Self {
        Self::new()
    }
}

impl<T> std::str::FromStr for Id<T> {
    type Err = uuid::Error;

    /// Parse from string
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Ok(Self(Uuid::parse_str(s)?, std::marker::PhantomData))
    }
}

impl<T> std::fmt::Display for Id<T> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl<T> std::fmt::Debug for Id<T> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

// Type aliases for common IDs
pub type UserId = Id<UserIdMarker>;
pub type SessionId = Id<SessionIdMarker>;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct UserIdMarker;
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct SessionIdMarker;
