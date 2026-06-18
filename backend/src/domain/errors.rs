use thiserror::Error;

use crate::domain::models::Role;

#[derive(Debug, Error, PartialEq)]
pub enum EmailError {
    #[error("email is empty")]
    Empty,
    #[error("invalid email format")]
    InvalidFormat,
}

#[derive(Debug, Error, PartialEq)]
pub enum PasswordError {
    #[error("password must be at least 12 characters")]
    TooShort,
}

#[derive(Debug, Error, PartialEq)]
pub enum RoleError {
    #[error("unknown role")]
    Unknown,
}

#[derive(Debug, Error)]
pub enum DomainError {
    #[error("user already exists: {email}")]
    AlreadyExists { email: String },
    #[error("invalid email")]
    InvalidEmail(#[from] EmailError),
    #[error("weak password")]
    WeakPassword(#[from] PasswordError),
    #[error("invalid role")]
    InvalidRole(#[from] RoleError),
    #[error("not found")]
    NotFound,
    #[error("institution is required for role {0:?}")]
    InstitutionRequired(Role),
    #[error("terms must be accepted")]
    TermsNotAccepted,
    #[error("internal domain error")]
    Internal(#[from] anyhow::Error),
}
