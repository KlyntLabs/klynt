use async_trait::async_trait;
use base::ctx::ExecutionContext;
use base::ports::session::{
    MembershipSnapshot, Session, SessionError, SessionKind, SessionStore, SessionToken,
};
use chrono::{DateTime, Utc};
use domain::session::SessionSummary;
use domain::UserId;
use sqlx::types::Json;
use sqlx::PgPool;
use uuid::Uuid;

/// PostgreSQL implementation of the session store.
pub struct PgSessionStore {
    pool: PgPool,
}

impl PgSessionStore {
    /// Create a new store backed by `pool`.
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Return the underlying connection pool.
    pub fn pool(&self) -> &PgPool {
        &self.pool
    }

    pub(crate) async fn active_tokens_for_user(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
    ) -> Result<Vec<SessionToken>, SessionError> {
        let rows: Vec<(Uuid,)> =
            sqlx::query_as("SELECT token FROM sessions WHERE user_id = $1 AND expires_at > NOW()")
                .bind(user_id.inner())
                .fetch_all(&self.pool)
                .await?;

        Ok(rows
            .into_iter()
            .map(|(token,)| SessionToken(token))
            .collect())
    }

    /// Resolve the bearer token for an active session owned by `user_id`.
    ///
    /// Returns `SessionError::Forbidden` if the session does not exist, is
    /// expired, or does not belong to the user.
    pub(crate) async fn resolve_active_token_by_id(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
        session_id: Uuid,
    ) -> Result<SessionToken, SessionError> {
        let row: Option<(Uuid,)> = sqlx::query_as(
            r#"
            SELECT token
            FROM sessions
            WHERE id = $1
              AND user_id = $2
              AND expires_at > NOW()
            "#,
        )
        .bind(session_id)
        .bind(user_id.inner())
        .fetch_optional(&self.pool)
        .await?;

        row.map(|(token,)| SessionToken(token))
            .ok_or(SessionError::Forbidden)
    }
}

#[async_trait]
impl SessionStore for PgSessionStore {
    async fn create_with_kind(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
        expires_at: DateTime<Utc>,
        kind: SessionKind,
        pair_id: Option<Uuid>,
    ) -> Result<SessionToken, SessionError> {
        let token = SessionToken::new();

        sqlx::query(
            r#"
            INSERT INTO sessions (token, user_id, kind, pair_id, expires_at)
            VALUES ($1, $2, $3, $4, $5)
            "#,
        )
        .bind(token.0)
        .bind(user_id.0)
        .bind(kind.as_str())
        .bind(pair_id)
        .bind(expires_at)
        .execute(&self.pool)
        .await?;

        Ok(token)
    }

    async fn find_valid(
        &self,
        _ctx: &ExecutionContext,
        token: &SessionToken,
    ) -> Result<Option<Session>, SessionError> {
        let row: Option<(
            Uuid,
            String,
            Option<Uuid>,
            DateTime<Utc>,
            Json<Vec<MembershipSnapshot>>,
        )> = sqlx::query_as(
            r#"
            SELECT user_id, kind, pair_id, expires_at, tenant_memberships
            FROM sessions
            WHERE token = $1
              AND expires_at > NOW()
            "#,
        )
        .bind(token.0)
        .fetch_optional(&self.pool)
        .await?;

        match row {
            Some((user_id, kind, pair_id, expires_at, memberships)) => Ok(Some(Session {
                user_id: UserId(user_id),
                expires_at,
                kind: SessionKind::try_from(kind.as_str())
                    .map_err(|e| SessionError::Internal(format!("invalid session kind: {e}")))?,
                pair_id,
                tenant_memberships: memberships.0,
            })),
            None => Ok(None),
        }
    }

    async fn revoke(
        &self,
        _ctx: &ExecutionContext,
        token: &SessionToken,
    ) -> Result<(), SessionError> {
        sqlx::query(
            r#"
            DELETE FROM sessions
            WHERE token = $1
            "#,
        )
        .bind(token.0)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    async fn revoke_pair(
        &self,
        _ctx: &ExecutionContext,
        pair_id: Uuid,
        except_token: &SessionToken,
    ) -> Result<(), SessionError> {
        sqlx::query(
            r#"
            DELETE FROM sessions
            WHERE pair_id = $1
              AND token <> $2
            "#,
        )
        .bind(pair_id)
        .bind(except_token.0)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    async fn list_active_by_user(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
    ) -> Result<Vec<SessionSummary>, SessionError> {
        let rows: Vec<(Uuid, Uuid, String, DateTime<Utc>, DateTime<Utc>)> = sqlx::query_as(
            r#"
            SELECT id, user_id, kind, created_at, expires_at
            FROM sessions
            WHERE user_id = $1
              AND expires_at > NOW()
            ORDER BY created_at DESC
            "#,
        )
        .bind(user_id.inner())
        .fetch_all(&self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(
                |(id, user_id, kind, created_at, expires_at)| SessionSummary {
                    id,
                    user_id: UserId(user_id),
                    kind,
                    created_at,
                    expires_at,
                },
            )
            .collect())
    }

    async fn revoke_by_id(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
        session_id: Uuid,
    ) -> Result<(), SessionError> {
        let token = self
            .resolve_active_token_by_id(ctx, user_id, session_id)
            .await?;
        self.revoke(ctx, &token).await
    }

    async fn update_memberships(
        &self,
        _ctx: &ExecutionContext,
        token: &SessionToken,
        memberships: Vec<MembershipSnapshot>,
    ) -> Result<(), SessionError> {
        sqlx::query("UPDATE sessions SET tenant_memberships = $1 WHERE token = $2")
            .bind(Json(memberships))
            .bind(token.0)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    async fn add_membership(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
        membership: MembershipSnapshot,
    ) -> Result<(), SessionError> {
        sqlx::query(
            r#"
            UPDATE sessions
            SET tenant_memberships = COALESCE(
                (
                    SELECT jsonb_agg(
                        CASE
                            WHEN (elem->>'tenant_id')::uuid = ($1->>'tenant_id')::uuid
                            THEN $1
                            ELSE elem
                        END
                    )
                    FROM jsonb_array_elements(tenant_memberships) AS elem
                ),
                '[]'::jsonb
            ) || CASE
                WHEN EXISTS (
                    SELECT 1
                    FROM jsonb_array_elements(tenant_memberships) AS elem
                    WHERE (elem->>'tenant_id')::uuid = ($1->>'tenant_id')::uuid
                )
                THEN '[]'::jsonb
                ELSE $1
            END
            WHERE user_id = $2 AND expires_at > NOW()
            "#,
        )
        .bind(Json(membership))
        .bind(user_id.inner())
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    async fn update_membership_for_user(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
        membership: MembershipSnapshot,
    ) -> Result<(), SessionError> {
        sqlx::query(
            r#"
            UPDATE sessions
            SET tenant_memberships = (
                SELECT COALESCE(jsonb_agg(
                    CASE
                        WHEN (elem->>'tenant_id')::uuid = $1
                        THEN jsonb_set(elem, '{role}', to_jsonb($2::text))
                        ELSE elem
                    END
                ), '[]'::jsonb)
                FROM jsonb_array_elements(tenant_memberships) AS elem
            )
            WHERE user_id = $3 AND expires_at > NOW()
            "#,
        )
        .bind(membership.tenant_id)
        .bind(membership.role.as_str())
        .bind(user_id.inner())
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    async fn remove_membership(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
        tenant_id: domain::TenantId,
    ) -> Result<(), SessionError> {
        sqlx::query(
            r#"
            UPDATE sessions
            SET tenant_memberships = (
                SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
                FROM jsonb_array_elements(tenant_memberships) AS elem
                WHERE (elem->>'tenant_id')::uuid <> $1
            )
            WHERE user_id = $2 AND expires_at > NOW()
            "#,
        )
        .bind(tenant_id.inner())
        .bind(user_id.inner())
        .execute(&self.pool)
        .await?;
        Ok(())
    }
}
