//! User operation commands.

use crate::user::{Email, PaginationRequest, User, UserId, UserRole};

/// User repository operation.
#[derive(Debug, Clone, PartialEq)]
pub enum UserOp {
    FindByEmail {
        email: Email,
    },
    FindById {
        user_id: UserId,
    },
    CreatePendingUser {
        full_name: String,
        username: String,
        email: Email,
        password_hash: String,
        role: UserRole,
        institution_id: Option<uuid::Uuid>,
    },
    ActivateUser {
        user_id: UserId,
    },
    UpdatePassword {
        user_id: UserId,
        password_hash: String,
    },
    Update {
        user: User,
    },
    Delete {
        user_id: UserId,
    },
    List {
        pagination: PaginationRequest,
    },
}
