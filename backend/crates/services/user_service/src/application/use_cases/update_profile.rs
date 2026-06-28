//! Update profile use case.

use base::ctx::ExecutionContext;
use base::ports::audit::ProfileUpdateSnapshot;
use domain::UserId;
use validator::Validate;

use crate::core::UserExt;
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
        .persistence_facade
        .user_repository
        .find_by_id(ctx, user_id)
        .await?
        .ok_or(UserError::NotFound)?;

    let full_name_changed = user.full_name != updates.full_name;

    user.update_profile(updates.full_name)?;

    let user = service
        .internal()
        .persistence_facade
        .user_repository
        .update(ctx, user)
        .await?;

    service
        .internal()
        .persistence_facade
        .audit_logger
        .log_profile_updated(
            ctx,
            user_id,
            ProfileUpdateSnapshot {
                full_name_changed: false,
            },
            ProfileUpdateSnapshot { full_name_changed },
        )
        .await;

    Ok(UserProfile::from(user))
}
