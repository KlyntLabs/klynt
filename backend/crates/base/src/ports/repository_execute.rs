//! Default command execution helpers and result types for repository ports.
//!
//! These helpers keep the trait definitions in [`super::repository`] focused on
//! their interface while centralizing the dispatch logic for [`UserOp`],
//! [`TenantOp`], and [`MembershipOp`].

use crate::ctx::ExecutionContext;
use crate::ports::repository::{
    MembershipRepository, RepositoryError, TenantRepository, UserRepository,
};
use domain::membership::{Membership, TenantMember};
use domain::operations::{MembershipOp, TenantOp, UserOp};
use domain::tenant::{Tenant, TenantMembershipSummary};
use domain::{DomainResult, User, UserId};

/// Result of executing a [`UserOp`].
#[derive(Debug, Clone, PartialEq)]
pub enum UserOpResult {
    /// Optional user result.
    UserOption(Option<User>),
    /// User ID result.
    UserId(UserId),
    /// User result.
    User(User),
    /// Unit result.
    Unit,
    /// Paginated user list result.
    UserList((Vec<User>, u64)),
}

/// Result of executing a [`TenantOp`].
#[derive(Debug, Clone, PartialEq)]
pub enum TenantOpResult {
    /// Tenant result.
    Tenant(Tenant),
    /// Optional tenant result.
    TenantOption(Option<Tenant>),
    /// List of tenant membership summaries.
    TenantSummaryList(Vec<TenantMembershipSummary>),
    /// Unit result.
    Unit,
    /// Integer count result.
    Count(i64),
}

/// Result of executing a [`MembershipOp`].
#[derive(Debug, Clone, PartialEq)]
pub enum MembershipOpResult {
    /// Membership result.
    Membership(Membership),
    /// Optional membership result.
    MembershipOption(Option<Membership>),
    /// List of memberships.
    MembershipList(Vec<Membership>),
    /// List of tenant members.
    TenantMemberList(Vec<TenantMember>),
    /// Unit result.
    Unit,
}

/// Default [`UserRepository::execute`] implementation.
pub async fn execute_user<R>(
    repo: &R,
    ctx: &ExecutionContext,
    op: UserOp,
) -> Result<UserOpResult, RepositoryError>
where
    R: UserRepository + ?Sized,
{
    match op {
        UserOp::FindByEmail { email } => {
            let result = repo.find_by_email(ctx, &email).await?;
            Ok(UserOpResult::UserOption(result))
        }
        UserOp::FindById { user_id } => {
            let result = repo.find_by_id(ctx, user_id).await?;
            Ok(UserOpResult::UserOption(result))
        }
        UserOp::CreatePendingUser {
            full_name,
            username,
            email,
            password_hash,
            role,
            institution_id,
        } => {
            let result = repo
                .create_pending_user(
                    ctx,
                    full_name,
                    username,
                    email,
                    password_hash,
                    role,
                    institution_id,
                )
                .await?;
            Ok(UserOpResult::UserId(result))
        }
        UserOp::ActivateUser { user_id } => {
            repo.activate_user(ctx, user_id).await?;
            Ok(UserOpResult::Unit)
        }
        UserOp::UpdatePassword {
            user_id,
            password_hash,
        } => {
            repo.update_password(ctx, user_id, password_hash).await?;
            Ok(UserOpResult::Unit)
        }
        UserOp::Update { user } => {
            let result = repo.update(ctx, user).await?;
            Ok(UserOpResult::User(result))
        }
        UserOp::Delete { user_id } => {
            repo.delete(ctx, user_id).await?;
            Ok(UserOpResult::Unit)
        }
        UserOp::List { pagination } => {
            let result = repo.list(ctx, pagination).await?;
            Ok(UserOpResult::UserList(result))
        }
    }
}

/// Default [`TenantRepository::execute`] implementation.
pub async fn execute_tenant<R>(
    repo: &R,
    ctx: &ExecutionContext,
    op: TenantOp,
) -> DomainResult<TenantOpResult>
where
    R: TenantRepository + ?Sized,
{
    match op {
        TenantOp::Create { tenant } => {
            let result = repo.create(ctx, &tenant).await?;
            Ok(TenantOpResult::Tenant(result))
        }
        TenantOp::FindById { id } => {
            let result = repo.find_by_id(ctx, id).await?;
            Ok(TenantOpResult::TenantOption(result))
        }
        TenantOp::FindBySlug { slug } => {
            let result = repo.find_by_slug(ctx, &slug).await?;
            Ok(TenantOpResult::TenantOption(result))
        }
        TenantOp::ListForUser { user_id } => {
            let result = repo.list_for_user(ctx, user_id).await?;
            Ok(TenantOpResult::TenantSummaryList(result))
        }
        TenantOp::Update { tenant } => {
            let result = repo.update(ctx, &tenant).await?;
            Ok(TenantOpResult::Tenant(result))
        }
        TenantOp::Delete { id } => {
            repo.delete(ctx, id).await?;
            Ok(TenantOpResult::Unit)
        }
        TenantOp::CountOwnedByUser { user_id } => {
            let result = repo.count_owned_by_user(ctx, user_id).await?;
            Ok(TenantOpResult::Count(result))
        }
    }
}

/// Default [`MembershipRepository::execute`] implementation.
pub async fn execute_membership<R>(
    repo: &R,
    ctx: &ExecutionContext,
    op: MembershipOp,
) -> DomainResult<MembershipOpResult>
where
    R: MembershipRepository + ?Sized,
{
    match op {
        MembershipOp::Create { membership } => {
            let result = repo.create(ctx, &membership).await?;
            Ok(MembershipOpResult::Membership(result))
        }
        MembershipOp::Find { tenant_id, user_id } => {
            let result = repo.find(ctx, tenant_id, user_id).await?;
            Ok(MembershipOpResult::MembershipOption(result))
        }
        MembershipOp::ListForUser { user_id } => {
            let result = repo.list_for_user(ctx, user_id).await?;
            Ok(MembershipOpResult::MembershipList(result))
        }
        MembershipOp::ListForTenant { tenant_id } => {
            let result = repo.list_for_tenant(ctx, tenant_id).await?;
            Ok(MembershipOpResult::MembershipList(result))
        }
        MembershipOp::UpdateRole {
            tenant_id,
            user_id,
            role,
        } => {
            repo.update_role(ctx, tenant_id, user_id, role).await?;
            Ok(MembershipOpResult::Unit)
        }
        MembershipOp::Delete { tenant_id, user_id } => {
            repo.delete(ctx, tenant_id, user_id).await?;
            Ok(MembershipOpResult::Unit)
        }
    }
}
