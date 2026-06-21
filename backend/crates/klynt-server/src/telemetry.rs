use tracing_error::ErrorLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

/// Build the curated directive string used when `RUST_LOG` is not set.
///
/// Noisy infrastructure crates are raised to `warn` so the app's own spans
/// remain visible at `info` level in production.
fn build_directive(log_level: &str) -> String {
    let level = if log_level.is_empty() {
        "info"
    } else {
        log_level
    };
    format!(
        "{level},\
         klynt=info,\
         axum=info,\
         tower_http=info,\
         sqlx=warn,\
         hyper=warn,\
         h2=warn,\
         tokio=warn,\
         tower=warn,\
         reqwest=warn,\
         rustls=warn,\
         redis=warn,\
         runtime=warn"
    )
}

/// A curated `EnvFilter` that respects `RUST_LOG` if set, otherwise falls back
/// to a curated directive that suppresses noisy infrastructure crates.
fn default_env_filter(log_level: &str) -> EnvFilter {
    EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new(build_directive(log_level)))
}

/// Initialize the global tracing subscriber with env-aware filtering,
/// JSON formatting, and spanbacktrace error correlation.
///
/// # Panics
///
/// Panics if called more than once per process because the global subscriber
/// can only be set once.
pub fn init_telemetry(log_level: &str) {
    let env_filter = default_env_filter(log_level);

    tracing_subscriber::registry()
        .with(env_filter)
        .with(ErrorLayer::default())
        .with(tracing_subscriber::fmt::layer().json())
        .init();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn directive_includes_klynt_and_noisy_crates() {
        let directive = build_directive("info");
        assert!(directive.contains("klynt=info"));
        assert!(directive.contains("tokio=warn"));
        assert!(directive.contains("sqlx=warn"));
        assert!(directive.contains("hyper=warn"));
        assert!(directive.contains("redis=warn"));
    }

    #[test]
    fn directive_uses_info_for_empty_log_level() {
        let directive = build_directive("");
        assert!(directive.starts_with("info,"));
    }

    #[test]
    fn directive_uses_provided_log_level() {
        let directive = build_directive("debug");
        assert!(directive.starts_with("debug,"));
    }

    #[test]
    fn fallback_directive_is_valid_env_filter() {
        // Verifies our hardcoded directive string parses without panicking.
        let _ = EnvFilter::new(build_directive("debug"));
        let _ = EnvFilter::new(build_directive("warn"));
        let _ = EnvFilter::new(build_directive(""));
    }
}
