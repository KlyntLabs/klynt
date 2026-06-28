//! Core traits used across the application.

use std::fmt::Debug;
use std::hash::Hash;

/// Trait for entities that can be identified
pub trait Identifiable {
    type Id: Eq + Hash + Debug + Clone + Send + Sync;

    fn id(&self) -> &Self::Id;
}

/// Trait for entities that track creation and modification
pub trait Auditable {
    fn created_at(&self) -> chrono::DateTime<chrono::Utc>;
    fn updated_at(&self) -> Option<chrono::DateTime<chrono::Utc>>;
}

/// Trait for entities that can be soft-deleted
pub trait SoftDeletable {
    fn deleted_at(&self) -> Option<chrono::DateTime<chrono::Utc>>;
    fn is_deleted(&self) -> bool {
        self.deleted_at().is_some()
    }
}

/// Trait for paginated results
pub trait Paginated {
    type Item;

    fn items(&self) -> &[Self::Item];
    fn total_count(&self) -> u64;
    fn page(&self) -> u32;
    fn page_size(&self) -> u32;
    fn total_pages(&self) -> u32;
}

/// Trait for entities that can be validated
pub trait Validate {
    type Error;

    fn validate(&self) -> Result<(), Self::Error>;
}
