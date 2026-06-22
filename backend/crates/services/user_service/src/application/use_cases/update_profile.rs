//! Update profile use case.

use base::ctx::ExecutionContext;
use domain::UserId;
use serde_json::json;
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
        .user_repository
        .find_by_id(ctx, user_id)
        .await?
        .ok_or(UserError::NotFound)?;

    let before_json = json!({ "full_name": user.full_name });

    user.update_profile(updates.full_name)?;

    let user = service.internal().user_repository.update(ctx, user).await?;

    let after_json = json!({ "full_name": user.full_name });

    service
        .internal()
        .audit_logger
        .log_profile_updated(ctx, user_id, before_json, after_json)
        .await;

    Ok(UserProfile::from(user))
}
