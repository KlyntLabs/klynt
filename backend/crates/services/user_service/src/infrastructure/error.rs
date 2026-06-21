//! Error mapping from domain errors to user_service errors.

use crate::error::UserError;

/// Map a domain error into a user_service internal error.
pub fn map_domain_error(err: klynt_common::domain::DomainError) -> UserError {
    UserError::Domain(klynt_common::domain::DomainError::Internal(err.to_string()))
}
