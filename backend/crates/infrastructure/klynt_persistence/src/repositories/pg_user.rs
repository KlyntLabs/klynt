use async_trait::async_trait;
use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::ports::HashedPassword;
use crate::repositories::{CreateResult, UserRepository};
use klynt_base::ctx::ExecutionContext;
use klynt_common::domain::{DomainError, User, UserRole, UserStatus};
use klynt_common::util::{Email, Role as DbRole, UserId, UserStatus as DbUserStatus};

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
struct UserRow {
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
    fn into_user(self) -> Result<User, DomainError> {
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

fn role_to_db(role: UserRole) -> DbRole {
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

fn status_to_db(status: UserStatus) -> DbUserStatus {
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

#[async_trait]
impl UserRepository for PgUserRepository {
    async fn create_if_not_exists(
        &self,
        _ctx: &ExecutionContext,
        email: &Email,
        user: &User,
    ) -> Result<CreateResult, DomainError> {
        let inserted = sqlx::query_scalar::<_, Uuid>(
            r#"
            INSERT INTO users (
                id, email, name, password_hash,
                status, email_verified_at, global_role,
                terms_accepted_at, terms_version,
                role, institution_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (email) DO NOTHING
            RETURNING id
            "#,
        )
        .bind(user.id.0)
        .bind(email.as_str())
        .bind(user.full_name.as_deref().unwrap_or(""))
        .bind(&user.password_hash)
        .bind(status_to_db(user.status).as_str())
        .bind(None::<DateTime<Utc>>)
        .bind(None::<String>)
        .bind(user.created_at)
        .bind("1.0")
        .bind(role_to_db(user.role).as_str())
        .bind(None::<Uuid>)
        .fetch_optional(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        if inserted.is_some() {
            return Ok(CreateResult::Created);
        }

        let existing = self
            .find_by_email(_ctx, email)
            .await?
            .ok_or_else(|| DomainError::internal_msg("conflict user disappeared"))?;
        Ok(CreateResult::AlreadyExists(existing))
    }

    async fn find_by_email(
        &self,
        _ctx: &ExecutionContext,
        email: &Email,
    ) -> Result<Option<User>, DomainError> {
        let row: Option<UserRow> = sqlx::query_as(
            r#"
            SELECT
                id, email, name, password_hash,
                status, email_verified_at, global_role,
                created_at, terms_accepted_at, terms_version,
                role, institution_id
            FROM users
            WHERE email = $1
            "#,
        )
        .bind(email.as_str())
        .fetch_optional(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        row.map(|r| r.into_user()).transpose()
    }

    async fn find_by_id(
        &self,
        _ctx: &ExecutionContext,
        id: UserId,
    ) -> Result<Option<User>, DomainError> {
        let row: Option<UserRow> = sqlx::query_as(
            r#"
            SELECT
                id, email, name, password_hash,
                status, email_verified_at, global_role,
                created_at, terms_accepted_at, terms_version,
                role, institution_id
            FROM users
            WHERE id = $1
            "#,
        )
        .bind(id.0)
        .fetch_optional(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        row.map(|r| r.into_user()).transpose()
    }

    async fn set_email_verified(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
    ) -> Result<(), DomainError> {
        let result = sqlx::query(
            r#"
            UPDATE users
            SET status = 'active', email_verified_at = NOW()
            WHERE id = $1
            "#,
        )
        .bind(user_id.0)
        .execute(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        if result.rows_affected() == 0 {
            return Err(DomainError::NotFound("not found".to_string()));
        }
        Ok(())
    }

    async fn update_password(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
        password_hash: &HashedPassword,
    ) -> Result<(), DomainError> {
        let result = sqlx::query(
            r#"
            UPDATE users
            SET password_hash = $1
            WHERE id = $2
            "#,
        )
        .bind(password_hash.as_str())
        .bind(user_id.0)
        .execute(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        if result.rows_affected() == 0 {
            return Err(DomainError::NotFound("not found".to_string()));
        }
        Ok(())
    }
}

/// Extended user repository operations used by the user_service.
impl PgUserRepository {
    /// Find a user by ID, including the optional soft-delete timestamp in the
    /// returned domain model.
    pub async fn find_by_id_full(
        &self,
        _ctx: &ExecutionContext,
        id: UserId,
    ) -> Result<Option<User>, DomainError> {
        let row: Option<UserRow> = sqlx::query_as(
            r#"
            SELECT
                id, email, name, password_hash,
                status, email_verified_at, global_role,
                created_at, terms_accepted_at, terms_version,
                role, institution_id,
                deleted_at
            FROM users
            WHERE id = $1
            "#,
        )
        .bind(id.0)
        .fetch_optional(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        row.map(|r| r.into_user()).transpose()
    }

    /// List non-deleted users with pagination.
    pub async fn list_full(
        &self,
        _ctx: &ExecutionContext,
        pagination: klynt_common::domain::PaginationRequest,
    ) -> Result<(Vec<User>, u64), DomainError> {
        let rows: Vec<UserRow> = sqlx::query_as(
            r#"
            SELECT
                id, email, name, password_hash,
                status, email_verified_at, global_role,
                created_at, terms_accepted_at, terms_version,
                role, institution_id,
                deleted_at
            FROM users
            WHERE deleted_at IS NULL
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(pagination.page_size as i64)
        .bind(pagination.offset() as i64)
        .fetch_all(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        let total: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(*)
            FROM users
            WHERE deleted_at IS NULL
            "#,
        )
        .fetch_one(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        let users = rows
            .into_iter()
            .map(|r| r.into_user())
            .collect::<Result<Vec<_>, _>>()?;

        Ok((users, total as u64))
    }

    /// Update a user's mutable fields from the canonical domain model.
    pub async fn update_full(
        &self,
        _ctx: &ExecutionContext,
        user: &User,
    ) -> Result<(), DomainError> {
        let result = sqlx::query(
            r#"
            UPDATE users
            SET
                name = $1,
                status = $2,
                role = $3,
                password_hash = $4
            WHERE id = $5
            "#,
        )
        .bind(user.full_name.as_deref().unwrap_or(""))
        .bind(status_to_db(user.status).as_str())
        .bind(role_to_db(user.role).as_str())
        .bind(&user.password_hash)
        .bind(user.id.0)
        .execute(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        if result.rows_affected() == 0 {
            return Err(DomainError::NotFound("not found".to_string()));
        }
        Ok(())
    }

    /// Soft delete a user by setting `deleted_at` to the current timestamp.
    pub async fn soft_delete(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
    ) -> Result<(), DomainError> {
        let result = sqlx::query(
            r#"
            UPDATE users
            SET deleted_at = NOW()
            WHERE id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(user_id.0)
        .execute(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        if result.rows_affected() == 0 {
            return Err(DomainError::NotFound("not found".to_string()));
        }
        Ok(())
    }
}
