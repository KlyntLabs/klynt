//! Unified response envelope and `mw_map_response` middleware.
//!
//! Every `/api/v1/*` response (except health probes) is wrapped into:
//! ```json
//! { "id", "status", "type", "data", "error", "meta" }
//! ```

use axum::{
    body::to_bytes,
    http::{header, Method, StatusCode, Uri},
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;
use serde_json::Value;

use crate::error::AppError;
use crate::logging::{log_request, LogEntry, LogRequest, LogResponse};
use crate::request_context::{RequestContext, RequestId};

/// Maximum response body size to buffer for envelope wrapping (1 MB).
const MAX_ENVELOPE_BODY_SIZE: usize = 1024 * 1024;

/// Top-level response envelope.
#[derive(Debug, Serialize)]
pub struct ApiResponse {
    pub id: String,
    pub status: u8,
    #[serde(rename = "type")]
    pub response_type: &'static str,
    pub data: Option<Value>,
    pub error: Option<ApiErrorPayload>,
    pub meta: ResponseMeta,
}

#[derive(Debug, Serialize)]
pub struct ApiErrorPayload {
    #[serde(rename = "type")]
    pub error_type: &'static str,
    pub code: u16,
    pub message: String,
    pub details: Option<Value>,
}

#[derive(Debug, Serialize)]
pub struct ResponseMeta {
    pub request_id: String,
    pub trace_id: String,
    pub timestamp: String,
    pub duration_ms: f64,
}

impl ApiResponse {
    pub fn success(id: &str, data: Value, meta: ResponseMeta) -> Self {
        Self {
            id: id.to_string(),
            status: 0,
            response_type: "success",
            data: Some(data),
            error: None,
            meta,
        }
    }

    pub fn error(id: &str, error: ApiErrorPayload, meta: ResponseMeta) -> Self {
        Self {
            id: id.to_string(),
            status: 1,
            response_type: "error",
            data: None,
            error: Some(error),
            meta,
        }
    }
}

/// Build `ResponseMeta` from the request context + duration.
fn build_meta(ctx: &RequestContext) -> ResponseMeta {
    ResponseMeta {
        request_id: ctx.request_id.to_string(),
        trace_id: ctx.trace_id.to_string(),
        timestamp: chrono::Utc::now().to_rfc3339(),
        duration_ms: ctx.start_time.elapsed().as_secs_f64() * 1000.0,
    }
}

/// Check if a response should be enveloped (JSON + small enough).
fn should_envelope(status: StatusCode, headers: &axum::http::HeaderMap) -> bool {
    // Skip 204 No Content.
    if status == StatusCode::NO_CONTENT {
        return false;
    }
    // Check Content-Type is JSON.
    let is_json = headers
        .get(header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .map(|t| t.contains("application/json"))
        .unwrap_or(false);
    if !is_json {
        return false;
    }
    // Check body size.
    if let Some(len) = headers.get(header::CONTENT_LENGTH) {
        if let Ok(s) = len.to_str() {
            if let Ok(n) = s.parse::<usize>() {
                if n > MAX_ENVELOPE_BODY_SIZE {
                    return false;
                }
            }
        }
    }
    true
}

/// Map a raw handler response into the unified envelope.
pub async fn mw_map_response(
    request_id: RequestId,
    request_ctx: RequestContext,
    uri: Uri,
    method: Method,
    res: Response,
) -> Response {
    let (parts, body) = res.into_parts();

    // Guard: non-JSON or oversized → pass through unchanged.
    if !should_envelope(parts.status, &parts.headers) {
        return Response::from_parts(parts, body);
    }

    let meta = build_meta(&request_ctx);
    let id = &request_id.0.to_string();

    let bytes = to_bytes(body, MAX_ENVELOPE_BODY_SIZE)
        .await
        .unwrap_or_default();

    let (envelope, final_status, log_error) = if parts.status.is_success() {
        let data: Value = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
        (ApiResponse::success(id, data, meta), parts.status, None)
    } else if let Some(app_err) = parts.extensions.get::<AppError>() {
        let error_payload = ApiErrorPayload {
            error_type: app_err.kind.error_code(),
            code: parts.status.as_u16(),
            message: sanitize_error_message(&app_err.kind),
            details: None,
        };
        let classification = crate::logging::ErrorClassification {
            error_code: app_err.kind.error_code(),
            message: sanitize_error_message(&app_err.kind),
            severity: app_err.kind.severity(),
            category: app_err.kind.category(),
        };
        (
            ApiResponse::error(id, error_payload, meta),
            parts.status,
            Some(classification),
        )
    } else {
        let body_val: Value = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
        let error_payload = if body_val != Value::Null {
            ApiErrorPayload {
                error_type: "UNKNOWN_ERROR",
                code: parts.status.as_u16(),
                message: body_val
                    .get("message")
                    .and_then(|m| m.as_str())
                    .unwrap_or("An unexpected error occurred")
                    .to_string(),
                details: Some(body_val),
            }
        } else {
            ApiErrorPayload {
                error_type: "UNKNOWN_ERROR",
                code: parts.status.as_u16(),
                message: "An unexpected error occurred".to_string(),
                details: None,
            }
        };
        (
            ApiResponse::error(id, error_payload, meta),
            parts.status,
            None,
        )
    };

    // Preserve original response headers (except Content-Type/Length, re-set by Json).
    let mut original_headers = parts.headers.clone();
    original_headers.remove(header::CONTENT_TYPE);
    original_headers.remove(header::CONTENT_LENGTH);

    // Centralized logging (best-effort).
    let log_entry = LogEntry {
        request_ctx,
        request: LogRequest {
            uri: uri.clone(),
            method: method.clone(),
        },
        response: LogResponse {
            status: final_status.as_u16(),
            body: Some(envelope.to_log_value()),
            error: log_error,
        },
    };
    // Swallow logging errors — never fail the HTTP response.
    log_request(log_entry);

    let mut response = (final_status, Json(&envelope)).into_response();
    // Merge preserved headers.
    for (name, value) in original_headers.iter() {
        response.headers_mut().insert(name.clone(), value.clone());
    }

    response
}

/// Avoid leaking internal error details for `Internal` variants.
fn sanitize_error_message(kind: &crate::error::AppErrorKind) -> String {
    match kind {
        crate::error::AppErrorKind::Internal(_) => "something went wrong".to_string(),
        other => other.to_string(),
    }
}

impl ApiResponse {
    /// Serialize to a serde_json::Value for logging (without re-serializing the response).
    fn to_log_value(&self) -> Value {
        serde_json::to_value(self).unwrap_or(Value::Null)
    }
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use super::*;

    #[test]
    fn success_envelope_serializes() {
        let meta = ResponseMeta {
            request_id: "req-1".to_string(),
            trace_id: "trace-1".to_string(),
            timestamp: "2026-06-20T17:04:50Z".to_string(),
            duration_ms: 12.3,
        };
        let resp = ApiResponse::success("req-1", serde_json::json!({"name": "Ada"}), meta);
        let json = serde_json::to_value(&resp).unwrap();
        assert_eq!(json["status"], 0);
        assert_eq!(json["type"], "success");
        assert_eq!(json["data"]["name"], "Ada");
        assert!(json["error"].is_null());
        assert_eq!(json["meta"]["duration_ms"], 12.3);
    }

    #[test]
    fn error_envelope_serializes() {
        let meta = ResponseMeta {
            request_id: "req-2".to_string(),
            trace_id: "trace-2".to_string(),
            timestamp: "2026-06-20T17:04:50Z".to_string(),
            duration_ms: 3.1,
        };
        let error = ApiErrorPayload {
            error_type: "AUTHENTICATION_REQUIRED",
            code: 401,
            message: "Authentication required".to_string(),
            details: None,
        };
        let resp = ApiResponse::error("req-2", error, meta);
        let json = serde_json::to_value(&resp).unwrap();
        assert_eq!(json["status"], 1);
        assert_eq!(json["type"], "error");
        assert!(json["data"].is_null());
        assert_eq!(json["error"]["type"], "AUTHENTICATION_REQUIRED");
        assert_eq!(json["error"]["code"], 401);
    }

    #[test]
    fn sanitize_internal_error_hides_details() {
        let kind = crate::error::AppErrorKind::Internal(Arc::new(std::io::Error::other(
            "db password=secret",
        )));
        let msg = sanitize_error_message(&kind);
        assert_eq!(msg, "something went wrong");
        assert!(!msg.contains("secret"));
    }

    #[test]
    fn sanitize_bad_request_shows_message() {
        let kind = crate::error::AppErrorKind::BadRequest("invalid email".to_string());
        let msg = sanitize_error_message(&kind);
        assert_eq!(msg, "bad request: invalid email");
    }
}
