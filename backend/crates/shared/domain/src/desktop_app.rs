//! Desktop mini-app domain entity.

use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// The type of a desktop mini-app.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AppType {
    Markdown,
    Notes,
    Video,
    Folder,
}

impl AppType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Markdown => "markdown",
            Self::Notes => "notes",
            Self::Video => "video",
            Self::Folder => "folder",
        }
    }
}

impl std::str::FromStr for AppType {
    type Err = crate::DomainError;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "markdown" => Ok(Self::Markdown),
            "notes" => Ok(Self::Notes),
            "video" => Ok(Self::Video),
            "folder" => Ok(Self::Folder),
            _ => Err(crate::DomainError::validation("invalid app type")),
        }
    }
}

/// A node in the desktop icon tree (supports folder nesting).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IconTreeNode {
    pub app_id: String,
    pub x: i32,
    pub y: i32,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<IconTreeNode>>,
}

/// A persisted desktop mini-app.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DesktopApp {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub app_type: AppType,
    pub title: String,
    pub content: serde_json::Value,
    pub menu_config: serde_json::Value,
    pub owner_id: Option<Uuid>,
    pub created_by: Uuid,
    pub locked: bool,
    pub etag: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn app_type_roundtrip() {
        for (s, expected) in [
            ("markdown", AppType::Markdown),
            ("notes", AppType::Notes),
            ("video", AppType::Video),
            ("folder", AppType::Folder),
        ] {
            let parsed: AppType = s.parse().unwrap();
            assert_eq!(parsed, expected);
            assert_eq!(parsed.as_str(), s);
        }
    }

    #[test]
    fn app_type_invalid() {
        assert!("html".parse::<AppType>().is_err());
    }

    #[test]
    fn icon_tree_node_serialization() {
        let node = IconTreeNode {
            app_id: "test".to_string(),
            x: 10,
            y: 20,
            children: Some(vec![IconTreeNode {
                app_id: "child".to_string(),
                x: 0,
                y: 0,
                children: None,
            }]),
        };
        let json = serde_json::to_string(&node).unwrap();
        let back: IconTreeNode = serde_json::from_str(&json).unwrap();
        assert_eq!(back.app_id, "test");
        assert!(back.children.is_some());
    }
}
