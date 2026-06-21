//! Update profile use case.

use klynt_base::ctx::ExecutionContext;
use klynt_common::util::UserId;
use validator::Validate;

use crate::error::UserError;
use crate::models::{ProfileUpdate, UserProfile};
use crate::UserService;

pub(crate) async fn execute(
    service: &UserService,
    ctx: &ExecutionContext,
    user_id: UserId,
    updates: ProfileUpdate,
) -> Result<UserProfile, UserError> {
    updates
        .validate()
        .map_err(|e| UserError::validation(e.to_string()))?;

    let mut user = service
        .internal()
        .user_repository
        .find_by_id(ctx, user_id)
        .await?
        .ok_or(UserError::NotFound)?;

    user.update_profile(updates.full_name)?;

    service
        .internal()
        .user_repository
        .update(ctx, &user)
        .await?;

    service
        .internal()
        .audit_logger
        .log_profile_updated(ctx, user_id)
        .await;

    Ok(UserProfile::from(user))
}
