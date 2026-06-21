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

/// User ID wrapper - stable, globally unique identifier.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct UserId(pub Uuid);

impl UserId {
    /// Create a new random user ID.
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }

    /// Create from UUID.
    pub fn from_uuid(uuid: Uuid) -> Self {
        Self(uuid)
    }

    /// Get the inner UUID.
    pub fn inner(&self) -> Uuid {
        self.0
    }
}

impl Default for UserId {
    fn default() -> Self {
        Self::new()
    }
}

impl std::fmt::Display for UserId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl std::str::FromStr for UserId {
    type Err = uuid::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Ok(Self(Uuid::parse_str(s)?))
    }
}

// Generic ID wrapper for other typed IDs
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
pub type SessionId = Id<SessionIdMarker>;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct SessionIdMarker;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn uuid_v4_generates_valid_uuid() {
        let id = uuid_v4();
        assert_eq!(id.get_version_num(), 4);
    }

    #[test]
    fn ulid_generates_non_empty_string() {
        let id = ulid();
        assert!(!id.is_empty());
        assert_eq!(id.len(), 26);
    }

    #[test]
    fn parse_id_accepts_valid_uuid() {
        let parsed = parse_id("550e8400-e29b-41d4-a716-446655440000").unwrap();
        assert_eq!(parsed.to_string(), "550e8400-e29b-41d4-a716-446655440000");
    }

    #[test]
    fn parse_id_rejects_invalid_input() {
        assert!(parse_id("not-a-uuid").is_err());
    }

    #[test]
    fn user_id_new_is_unique() {
        let a = UserId::new();
        let b = UserId::new();
        assert_ne!(a, b);
    }

    #[test]
    fn user_id_from_uuid_round_trips() {
        let uuid = Uuid::new_v4();
        let user_id = UserId::from_uuid(uuid);
        assert_eq!(user_id.inner(), uuid);
    }

    #[test]
    fn user_id_default_creates_new() {
        let id: UserId = Default::default();
        assert_eq!(id.inner().get_version_num(), 4);
    }

    #[test]
    fn user_id_display_formats_as_uuid() {
        let uuid = Uuid::new_v4();
        let user_id = UserId::from_uuid(uuid);
        assert_eq!(user_id.to_string(), uuid.to_string());
    }

    #[test]
    fn user_id_from_str_round_trips() {
        let original = UserId::new();
        let parsed: UserId = original.to_string().parse().unwrap();
        assert_eq!(parsed, original);
    }

    #[test]
    fn generic_id_new_is_unique() {
        let a = Id::<SessionIdMarker>::new();
        let b = Id::<SessionIdMarker>::new();
        assert_ne!(a, b);
    }

    #[test]
    fn generic_id_from_uuid_round_trips() {
        let uuid = Uuid::new_v4();
        let id = Id::<SessionIdMarker>::from_uuid(uuid);
        assert_eq!(id.inner(), uuid);
    }

    #[test]
    fn generic_id_default_creates_new() {
        let id: Id<SessionIdMarker> = Default::default();
        assert_eq!(id.inner().get_version_num(), 4);
    }

    #[test]
    fn generic_id_from_str_round_trips() {
        let original = Id::<SessionIdMarker>::new();
        let parsed: Id<SessionIdMarker> = original.to_string().parse().unwrap();
        assert_eq!(parsed, original);
    }

    #[test]
    fn generic_id_display_and_debug_match_uuid() {
        let id = Id::<SessionIdMarker>::new();
        assert_eq!(id.to_string(), id.inner().to_string());
        assert_eq!(format!("{:?}", id), id.inner().to_string());
    }
}
