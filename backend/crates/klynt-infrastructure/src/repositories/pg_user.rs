use async_trait::async_trait;
use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use crate::repositories::User;
use crate::repositories::{CreateResult, UserRepository};
use klynt_core::ctx::Ctx;
use klynt_shared_domain::DomainError;
use klynt_storage::ports::HashedPassword;
use klynt_utils::{Email, GlobalRole, Role, UserId, UserStatus};

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
    email_verified_at: Option<DateTime<Utc>>,
    global_role: Option<String>,
    created_at: DateTime<Utc>,
    terms_accepted_at: DateTime<Utc>,
    terms_version: String,
    role: String,
    institution_id: Option<Uuid>,
    #[sqlx(default)]
    deleted_at: Option<DateTime<Utc>>,
}

impl UserRow {
    pub fn deleted_at(&self) -> Option<DateTime<Utc>> {
        self.deleted_at
    }
}

impl UserRow {
    fn into_user(self) -> Result<User, DomainError> {
        let role = Role::parse(&self.role)
            .map_err(|e| DomainError::internal_msg(format!("invalid role in database: {e:?}")))?;
        let status = UserStatus::parse(&self.status)
            .map_err(|e| DomainError::internal_msg(format!("invalid status in database: {e:?}")))?;
        let global_role = self
            .global_role
            .map(|r| {
                GlobalRole::parse(&r).map_err(|e| {
                    DomainError::internal_msg(format!("invalid global_role in database: {e:?}"))
                })
            })
            .transpose()?;

        Ok(User {
            id: UserId(self.id),
            email: Email::parse(&self.email).map_err(|e| {
                DomainError::internal_msg(format!("invalid email in database: {e}"))
            })?,
            name: self.name,
            role,
            institution_id: self.institution_id,
            status,
            email_verified_at: self.email_verified_at,
            global_role,
            password_hash: self.password_hash,
            terms_accepted_at: self.terms_accepted_at,
            terms_version: self.terms_version,
            created_at: self.created_at,
        })
    }
}

#[async_trait]
impl UserRepository for PgUserRepository {
    async fn create_if_not_exists(
        &self,
        _ctx: &Ctx,
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
        .bind(&user.name)
        .bind(&user.password_hash)
        .bind(user.status.as_str())
        .bind(user.email_verified_at)
        .bind(user.global_role.map(|r| r.as_str().to_string()))
        .bind(user.terms_accepted_at)
        .bind(&user.terms_version)
        .bind(user.role.as_str())
        .bind(user.institution_id)
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

    async fn find_by_email(&self, _ctx: &Ctx, email: &Email) -> Result<Option<User>, DomainError> {
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

    async fn find_by_id(&self, _ctx: &Ctx, id: UserId) -> Result<Option<User>, DomainError> {
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

    async fn set_email_verified(&self, _ctx: &Ctx, user_id: UserId) -> Result<(), DomainError> {
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
        _ctx: &Ctx,
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
    /// Find a user by ID, returning the user together with the optional
    /// soft-delete timestamp.
    pub async fn find_by_id_full(
        &self,
        _ctx: &Ctx,
        id: UserId,
    ) -> Result<Option<(User, Option<DateTime<Utc>>)>, DomainError> {
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

        row.map(|r| {
            let deleted_at = r.deleted_at();
            r.into_user().map(|u| (u, deleted_at))
        })
        .transpose()
    }

    /// List non-deleted users with pagination, returning each user together
    /// with its soft-delete timestamp (`None` for active users).
    pub async fn list_full(
        &self,
        _ctx: &Ctx,
        pagination: klynt_shared_domain::PaginationRequest,
    ) -> Result<(Vec<(User, Option<DateTime<Utc>>)>, u64), DomainError> {
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
            .map(|r| {
                let deleted_at = r.deleted_at();
                r.into_user().map(|u| (u, deleted_at))
            })
            .collect::<Result<Vec<_>, _>>()?;

        Ok((users, total as u64))
    }

    /// Update a user's mutable fields.
    pub async fn update_full(&self, _ctx: &Ctx, user: &User) -> Result<(), DomainError> {
        let result = sqlx::query(
            r#"
            UPDATE users
            SET
                name = $1,
                status = $2,
                role = $3,
                institution_id = $4,
                global_role = $5,
                password_hash = $6
            WHERE id = $7
            "#,
        )
        .bind(&user.name)
        .bind(user.status.as_str())
        .bind(user.role.as_str())
        .bind(user.institution_id)
        .bind(user.global_role.map(|r| r.as_str().to_string()))
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
    pub async fn soft_delete(&self, _ctx: &Ctx, user_id: UserId) -> Result<(), DomainError> {
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
