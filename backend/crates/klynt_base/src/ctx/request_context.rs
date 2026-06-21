//! Request context for tracking request-scoped data.

use std::fmt;

/// Unique request ID
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub struct RequestId(pub uuid::Uuid);

impl RequestId {
    /// Generate a new request ID
    pub fn new() -> Self {
        Self(uuid::Uuid::new_v4())
    }
}

impl std::str::FromStr for RequestId {
    type Err = uuid::Error;

    /// Create from UUID string
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Ok(Self(uuid::Uuid::parse_str(s)?))
    }
}

impl fmt::Display for RequestId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl Default for RequestId {
    fn default() -> Self {
        Self::new()
    }
}

/// Request context containing request-scoped data
#[derive(Clone, Debug)]
pub struct RequestContext {
    pub request_id: RequestId,
    pub trace_id: Option<String>,
    pub user_agent: Option<String>,
    pub client_ip: Option<String>,
    pub start_time: chrono::DateTime<chrono::Utc>,
}

impl RequestContext {
    /// Create a new request context
    pub fn new() -> Self {
        Self {
            request_id: RequestId::new(),
            trace_id: None,
            user_agent: None,
            client_ip: None,
            start_time: chrono::Utc::now(),
        }
    }

    /// Create with specific request ID
    pub fn with_request_id(request_id: RequestId) -> Self {
        Self {
            request_id,
            trace_id: None,
            user_agent: None,
            client_ip: None,
            start_time: chrono::Utc::now(),
        }
    }

    /// Set the trace ID (for distributed tracing)
    pub fn with_trace_id(mut self, trace_id: String) -> Self {
        self.trace_id = Some(trace_id);
        self
    }

    /// Set user agent
    pub fn with_user_agent(mut self, user_agent: String) -> Self {
        self.user_agent = Some(user_agent);
        self
    }

    /// Set client IP
    pub fn with_client_ip(mut self, client_ip: String) -> Self {
        self.client_ip = Some(client_ip);
        self
    }

    /// Get elapsed time since request start
    pub fn elapsed(&self) -> chrono::Duration {
        chrono::Utc::now() - self.start_time
    }
}

impl Default for RequestContext {
    fn default() -> Self {
        Self::new()
    }
}

/// Execution context for service operations
#[derive(Clone, Debug)]
pub struct ExecutionContext {
    pub request: RequestContext,
    pub actor_id: Option<uuid::Uuid>,
    pub actor_type: Option<ActorType>,
}

impl ExecutionContext {
    /// Create a new execution context
    pub fn new(request: RequestContext) -> Self {
        Self {
            request,
            actor_id: None,
            actor_type: None,
        }
    }

    /// Set the actor (authenticated user/system)
    pub fn with_actor(mut self, id: uuid::Uuid, actor_type: ActorType) -> Self {
        self.actor_id = Some(id);
        self.actor_type = Some(actor_type);
        self
    }

    /// Check if actor is a user
    pub fn is_user(&self) -> bool {
        matches!(self.actor_type, Some(ActorType::User))
    }

    /// Check if actor is a system
    pub fn is_system(&self) -> bool {
        matches!(self.actor_type, Some(ActorType::System))
    }
}

/// Type of actor performing an action
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ActorType {
    User,
    System,
    Service,
}
