//! Tenant desktop layout entity.

use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// A single icon on the desktop.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DesktopIcon {
    pub app_id: String,
    pub x: i32,
    pub y: i32,
}

/// A window on the desktop.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DesktopWindow {
    pub app_id: String,
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
    pub state: String,
}

/// Scope of a desktop layout.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum LayoutScope {
    Shared,
    User,
}

impl LayoutScope {
    /// Return the canonical string representation.
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Shared => "shared",
            Self::User => "user",
        }
    }
}

impl std::fmt::Display for LayoutScope {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_str())
    }
}

impl std::str::FromStr for LayoutScope {
    type Err = crate::DomainError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "shared" => Ok(Self::Shared),
            "user" => Ok(Self::User),
            _ => Err(crate::DomainError::validation("invalid layout scope")),
        }
    }
}

/// A persisted desktop layout for a tenant.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TenantDesktopLayout {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub scope: LayoutScope,
    pub user_id: Option<Uuid>,
    pub version: i32,
    pub background_preset_id: String,
    pub icons: Vec<DesktopIcon>,
    pub windows: Vec<DesktopWindow>,
    pub etag: String,
}
