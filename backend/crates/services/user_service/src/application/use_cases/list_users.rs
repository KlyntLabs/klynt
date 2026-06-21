//! List users use case.

use klynt_base::ctx::ExecutionContext;
use klynt_common::domain::{PaginatedResponse, PaginationRequest};

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
