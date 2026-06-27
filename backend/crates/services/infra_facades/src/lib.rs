//! Infrastructure facades for simplified dependency injection.

pub mod infrastructure;
pub mod persistence;

pub use infrastructure::InfraFacade;
pub use persistence::PersistenceFacade;

#[cfg(test)]
mod tests;
