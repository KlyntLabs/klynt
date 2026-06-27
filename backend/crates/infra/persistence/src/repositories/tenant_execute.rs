//! Command execution helper for the PostgreSQL tenant repository.

use base::ctx::ExecutionContext;
use base::ports::repository::{TenantOpResult, TenantRepository};
use domain::operations::TenantOp;
use domain::DomainResult;

use super::PgTenantRepository;

/// Execute a tenant operation by delegating to the concrete repository methods.
pub async fn execute(
    repo: &PgTenantRepository,
    ctx: &ExecutionContext,
    op: TenantOp,
) -> DomainResult<TenantOpResult> {
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
            Ok(TenantOpResult::Unit(()))
        }
        TenantOp::CountOwnedByUser { user_id } => {
            let result = repo.count_owned_by_user(ctx, user_id).await?;
            Ok(TenantOpResult::Count(result))
        }
    }
}
