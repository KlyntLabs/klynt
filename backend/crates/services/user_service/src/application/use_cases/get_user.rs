//! Get user use case.

use klynt_base::ctx::ExecutionContext;
use klynt_common::util::UserId;

use crate::error::UserError;
use crate::models::UserProfile;
use crate::UserService;

pub(crate) async fn execute(
    service: &UserService,
    ctx: &ExecutionContext,
    user_id: UserId,
) -> Result<UserProfile, UserError> {
    let user = service
        .internal()
        .user_repository
        .find_by_id(ctx, user_id)
        .await?
        .ok_or(UserError::NotFound)?;

    if user.is_deleted() {
        return Err(UserError::UserDeleted);
    }

    Ok(UserProfile::from(user))
}
