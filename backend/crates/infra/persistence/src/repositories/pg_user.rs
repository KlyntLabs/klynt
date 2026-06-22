use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use domain::{DomainError, Email, User, UserId, UserRole, UserStatus};

/// PostgreSQL implementation of the user repository.
pub struct PgUserRepository {
    pool: PgPool,
}

impl PgUserRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub fn pool(&self) -> &PgPool {
        &self.pool
    }
}

#[derive(sqlx::FromRow)]
pub(crate) struct UserRow {
    id: Uuid,
    email: String,
    name: String,
    password_hash: String,
    status: String,
    created_at: DateTime<Utc>,
    role: String,
    #[sqlx(default)]
    deleted_at: Option<DateTime<Utc>>,
}

impl UserRow {
    pub(crate) fn into_user(self) -> Result<User, DomainError> {
        let role = DbRole::parse(&self.role)
            .map_err(|e| DomainError::internal_msg(format!("invalid role in database: {e:?}")))?;
        let status = DbUserStatus::parse(&self.status)
            .map_err(|e| DomainError::internal_msg(format!("invalid status in database: {e:?}")))?;

        Ok(User {
            id: UserId(self.id),
            email: Email::new(self.email),
            full_name: if self.name.is_empty() {
                None
            } else {
                Some(self.name)
            },
            password_hash: self.password_hash,
            status: status_from_db(status),
            role: role_from_db(role),
            created_at: self.created_at,
            updated_at: None,
            deleted_at: self.deleted_at,
        })
    }
}

/// Database-specific role mapping.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum DbRole {
    Student,
    Teacher,
    Admin,
    Parent,
}

impl DbRole {
    pub(crate) fn parse(raw: &str) -> Result<Self, &'static str> {
        match raw.to_lowercase().as_str() {
            "student" => Ok(Self::Student),
            "teacher" => Ok(Self::Teacher),
            "admin" => Ok(Self::Admin),
            "parent" => Ok(Self::Parent),
            _ => Err("unknown role"),
        }
    }

    pub(crate) fn as_str(&self) -> &'static str {
        match self {
            DbRole::Student => "student",
            DbRole::Teacher => "teacher",
            DbRole::Admin => "admin",
            DbRole::Parent => "parent",
        }
    }
}

/// Database-specific status mapping.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum DbUserStatus {
    PendingVerification,
    Active,
    Suspended,
}

impl DbUserStatus {
    pub(crate) fn parse(raw: &str) -> Result<Self, &'static str> {
        match raw.to_lowercase().as_str() {
            "pending_verification" => Ok(Self::PendingVerification),
            "active" => Ok(Self::Active),
            "suspended" => Ok(Self::Suspended),
            _ => Err("unknown status"),
        }
    }

    pub(crate) fn as_str(&self) -> &'static str {
        match self {
            DbUserStatus::PendingVerification => "pending_verification",
            DbUserStatus::Active => "active",
            DbUserStatus::Suspended => "suspended",
        }
    }
}

pub(crate) fn role_to_db(role: UserRole) -> DbRole {
    match role {
        UserRole::Student => DbRole::Student,
        UserRole::Instructor => DbRole::Teacher,
        UserRole::Admin => DbRole::Admin,
    }
}

fn role_from_db(role: DbRole) -> UserRole {
    match role {
        DbRole::Student => UserRole::Student,
        DbRole::Teacher => UserRole::Instructor,
        DbRole::Admin => UserRole::Admin,
        // Parent is not represented in the shared domain; map to Student as least privilege.
        DbRole::Parent => UserRole::Student,
    }
}

pub(crate) fn status_to_db(status: UserStatus) -> DbUserStatus {
    match status {
        UserStatus::Active => DbUserStatus::Active,
        UserStatus::Inactive | UserStatus::Suspended => DbUserStatus::Suspended,
        UserStatus::Pending => DbUserStatus::PendingVerification,
    }
}

fn status_from_db(status: DbUserStatus) -> UserStatus {
    match status {
        DbUserStatus::Active => UserStatus::Active,
        DbUserStatus::PendingVerification => UserStatus::Pending,
        DbUserStatus::Suspended => UserStatus::Suspended,
    }
}

mod canonical;
