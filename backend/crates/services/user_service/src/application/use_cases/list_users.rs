//! List users use case.

use base::ctx::ExecutionContext;
use domain::{PaginatedResponse, PaginationRequest};

use crate::error::UserError;
use crate::models::UserProfile;
use crate::UserService;

pub(crate) async fn execute(
    service: &UserService,
    ctx: &ExecutionContext,
    pagination: PaginationRequest,
) -> Result<PaginatedResponse<UserProfile>, UserError> {
    let (users, total) = service
        .internal()
        .persistence_facade
        .user_repository
        .list(ctx, pagination.clone())
        .await?;

    let items = users.into_iter().map(UserProfile::from).collect();

    Ok(PaginatedResponse::new(
        items,
        total,
        pagination.page,
        pagination.page_size,
    ))
}
