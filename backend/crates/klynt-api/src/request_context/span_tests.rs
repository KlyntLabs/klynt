//! Tests for tracing span field recording driven by `RequestContext`.

use std::sync::{Arc, Mutex};

use tracing::field::{Field, Visit};
use tracing::span::{Attributes, Id};
use tracing::Subscriber;
use tracing_subscriber::layer::{Context, Layer};
use tracing_subscriber::prelude::*;

use super::{build_request_context, record_request_context_span};

#[derive(Clone, Default)]
struct RecordingLayer {
    fields: Arc<Mutex<Vec<(String, String)>>>,
}

impl Visit for RecordingLayer {
    fn record_debug(&mut self, field: &Field, value: &dyn std::fmt::Debug) {
        self.fields
            .lock()
            .unwrap()
            .push((field.name().to_string(), format!("{:?}", value)));
    }
}

impl<S> Layer<S> for RecordingLayer
where
    S: Subscriber + for<'a> tracing_subscriber::registry::LookupSpan<'a>,
{
    fn on_new_span(&self, attrs: &Attributes<'_>, _id: &Id, _ctx: Context<'_, S>) {
        let mut recorder = self.clone();
        attrs.record(&mut recorder);
    }

    fn on_record(&self, _id: &Id, values: &tracing::span::Record<'_>, _ctx: Context<'_, S>) {
        let mut recorder = self.clone();
        values.record(&mut recorder);
    }
}

#[test]
fn span_fields_recorded_from_request_context() {
    let layer = RecordingLayer::default();
    let fields = Arc::clone(&layer.fields);
    let subscriber = tracing_subscriber::registry()
        .with(layer.with_filter(tracing_subscriber::filter::EnvFilter::new("debug")));

    let ctx = build_request_context(&axum::http::HeaderMap::new(), super::tests::socket(), &[]);
    let request_id = ctx.request_id.to_string();
    let trace_id = ctx.trace_id.to_string();

    tracing::subscriber::with_default(subscriber, || {
        let span = tracing::debug_span!(
            "http.request",
            request_id = tracing::field::Empty,
            trace_id = tracing::field::Empty,
        );
        let _guard = span.enter();

        record_request_context_span(&ctx);
    });

    let recorded = fields.lock().unwrap();
    let request_id_recorded = recorded
        .iter()
        .any(|(name, value)| name == "request_id" && value.contains(&request_id));
    let trace_id_recorded = recorded
        .iter()
        .any(|(name, value)| name == "trace_id" && value.contains(&trace_id));
    assert!(
        request_id_recorded,
        "request_id should be recorded on the span"
    );
    assert!(trace_id_recorded, "trace_id should be recorded on the span");
}
