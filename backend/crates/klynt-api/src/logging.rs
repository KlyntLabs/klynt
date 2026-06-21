//! Structured request/response logging with PII sanitization.
//!
//! One structured JSON log line per request, emitted from `mw_map_response`.
//! Logging is best-effort: failures are swallowed and logged internally — they
//! can never fail an HTTP response.

use std::collections::HashMap;
use std::sync::LazyLock;

use axum::http::{Method, Uri};
use serde::Serialize;
use serde_json::{json, Value};
use serde_with::skip_serializing_none;
use tracing::{debug, error, info};

use crate::error::{ErrorCategory, ErrorSeverity};
use crate::request_context::RequestContext;

/// Fields whose values are redacted before logging.
const SENSITIVE_FIELDS: &[&str] = &[
    "password",
    "pwd",
    "token",
    "secret",
    "key",
    "api_key",
    "apikey",
    "authorization",
    "credit_card",
    "card_number",
    "cvv",
    "ssn",
    "social_security",
    "phone",
    "email",
    "date_of_birth",
];

/// Logging configuration loaded from environment.
struct LogConfig {
    log_bodies: bool,
    log_success: bool,
    max_body_size: usize,
}

impl LogConfig {
    fn from_env() -> Self {
        Self {
            // Default false everywhere — PII minimization.
            log_bodies: std::env::var("KLYNT_LOG_BODIES")
                .map(|v| v == "true")
                .unwrap_or(false),
            log_success: std::env::var("KLYNT_LOG_SUCCESS")
                .map(|v| v == "true")
                .unwrap_or(false),
            max_body_size: std::env::var("KLYNT_MAX_BODY_SIZE")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(10 * 1024),
        }
    }
}

static LOG_CONFIG: LazyLock<LogConfig> = LazyLock::new(LogConfig::from_env);

/// Request info collected for logging.
pub struct LogRequest {
    pub uri: Uri,
    pub method: Method,
}

/// Owned error classification extracted at log time (avoids lifetime issues
/// with borrowing `AppError` from response extensions).
#[derive(Debug, Clone)]
pub struct ErrorClassification {
    pub error_code: &'static str,
    pub message: String,
    pub severity: ErrorSeverity,
    pub category: ErrorCategory,
}

/// Response info collected for logging.
pub struct LogResponse {
    pub status: u16,
    pub body: Option<Value>,
    pub error: Option<ErrorClassification>,
}

/// Full log entry passed to `log_request`.
pub struct LogEntry {
    pub request_ctx: RequestContext,
    pub request: LogRequest,
    pub response: LogResponse,
}

/// Recursively redact sensitive fields in a JSON value (case-insensitive key match).
fn sanitize_value(value: &mut Value) {
    match value {
        Value::Object(map) => {
            for (key, val) in map.iter_mut() {
                let lower = key.to_lowercase();
                if SENSITIVE_FIELDS.iter().any(|f| lower.contains(f)) {
                    *val = json!("[REDACTED]");
                } else {
                    sanitize_value(val);
                }
            }
        }
        Value::Array(arr) => {
            for item in arr.iter_mut() {
                sanitize_value(item);
            }
        }
        _ => {}
    }
}

/// Extract and sanitize query parameters from a URI.
fn extract_query_params(uri: &Uri) -> Option<Value> {
    uri.query().map(|q| {
        let params: HashMap<String, String> = q
            .split('&')
            .filter_map(|pair| {
                let mut parts = pair.splitn(2, '=');
                let key = parts.next()?.to_string();
                let value = parts.next().unwrap_or("").to_string();
                Some((key, value))
            })
            .collect();

        let mut value = json!(params);
        sanitize_value(&mut value);
        value
    })
}

/// Emit one structured log line for a request. Best-effort — never fails.
pub fn log_request(entry: LogEntry) {
    let LogEntry {
        request_ctx,
        request,
        response,
    } = entry;

    let now = chrono::Utc::now();
    let duration_ms = request_ctx.start_time.elapsed().as_secs_f64() * 1000.0;

    let is_error = response.status >= 400;

    // Successful requests are emitted at debug! unless KLYNT_LOG_SUCCESS is set.
    if !is_error && !LOG_CONFIG.log_success && !tracing::enabled!(tracing::Level::DEBUG) {
        return;
    }

    // Sanitize response body.
    let resp_body = if LOG_CONFIG.log_bodies {
        let mut body = response.body;
        if let Some(ref mut b) = body {
            let size = b.to_string().len();
            if size > LOG_CONFIG.max_body_size {
                *b = json!(format!("[TRUNCATED: {} bytes]", size));
            }
            sanitize_value(b);
        }
        body
    } else {
        None
    };

    let (severity, category, error_info) = if let Some(classification) = response.error {
        (
            Some(classification.severity.as_str()),
            Some(classification.category.as_str()),
            Some(ErrorInfo {
                type_: classification.error_code,
                message: classification.message,
            }),
        )
    } else {
        (None, None, None)
    };

    let log_line = RequestLogLine {
        id: request_ctx.request_id.to_string(),
        trace_id: request_ctx.trace_id.to_string(),
        timestamp: now.to_rfc3339(),
        duration_ms,
        severity,
        category,
        request: RequestLogContext {
            method: request.method.to_string(),
            path: request.uri.path().to_string(),
            query: extract_query_params(&request.uri),
            client_ip: request_ctx.client_ip.clone(),
            user_agent: request_ctx.user_agent.clone(),
        },
        response: ResponseLogContext {
            status_code: response.status,
            body: resp_body,
        },
        error: error_info,
    };

    let serialized = match serde_json::to_string(&log_line) {
        Ok(s) => s,
        Err(e) => {
            error!("Failed to serialize log line: {e}");
            return;
        }
    };

    if is_error {
        error!("REQUEST LOG: {serialized}");
    } else if LOG_CONFIG.log_success {
        info!("REQUEST LOG: {serialized}");
    } else {
        debug!("REQUEST LOG: {serialized}");
    }
}

#[skip_serializing_none]
#[derive(Serialize)]
struct RequestLogLine<'a> {
    id: String,
    trace_id: String,
    timestamp: String,
    duration_ms: f64,
    severity: Option<&'a str>,
    category: Option<&'a str>,
    request: RequestLogContext,
    response: ResponseLogContext,
    error: Option<ErrorInfo>,
}

#[skip_serializing_none]
#[derive(Serialize)]
struct RequestLogContext {
    method: String,
    path: String,
    query: Option<Value>,
    client_ip: Option<String>,
    user_agent: Option<String>,
}

#[skip_serializing_none]
#[derive(Serialize)]
struct ResponseLogContext {
    status_code: u16,
    body: Option<Value>,
}

#[skip_serializing_none]
#[derive(Serialize)]
struct ErrorInfo {
    #[serde(rename = "type")]
    type_: &'static str,
    message: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sanitize_redacts_password() {
        let mut val = json!({"name": "Ada", "password": "secret123"});
        sanitize_value(&mut val);
        assert_eq!(val["password"], "[REDACTED]");
        assert_eq!(val["name"], "Ada");
    }

    #[test]
    fn sanitize_redacts_email() {
        let mut val = json!({"email": "ada@example.com", "id": "123"});
        sanitize_value(&mut val);
        assert_eq!(val["email"], "[REDACTED]");
        assert_eq!(val["id"], "123");
    }

    #[test]
    fn sanitize_redacts_nested_token() {
        let mut val = json!({
            "user": {"name": "Ada", "token": "abc"},
            "items": [{"api_key": "xyz", "label": "ok"}]
        });
        sanitize_value(&mut val);
        assert_eq!(val["user"]["token"], "[REDACTED]");
        assert_eq!(val["items"][0]["api_key"], "[REDACTED]");
        assert_eq!(val["items"][0]["label"], "ok");
    }

    #[test]
    fn sanitize_is_case_insensitive() {
        let mut val = json!({"Password": "x", "API_KEY": "y"});
        sanitize_value(&mut val);
        assert_eq!(val["Password"], "[REDACTED]");
        assert_eq!(val["API_KEY"], "[REDACTED]");
    }

    #[test]
    fn extract_query_params_redacts_sensitive() {
        let uri: Uri = "/api/v1/users?name=Ada&token=secret&page=1"
            .parse()
            .unwrap();
        let params = extract_query_params(&uri).unwrap();
        assert_eq!(params["name"], "Ada");
        assert_eq!(params["token"], "[REDACTED]");
        assert_eq!(params["page"], "1");
    }

    #[test]
    fn extract_query_params_none_when_no_query() {
        let uri: Uri = "/api/v1/health/live".parse().unwrap();
        assert!(extract_query_params(&uri).is_none());
    }
}
