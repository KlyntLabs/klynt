//! Benchmarks for role-permission assignment writes.
//!
//! These benchmarks measure the cost of assigning many permissions to a role.
//! The baseline implementation issues one INSERT per permission inside a
//! transaction (N+1 writes). The optimized implementation uses a single bulk
//! INSERT with `UNNEST`.

use std::sync::Arc;

use base::ctx::{ExecutionContext, RequestContext};
use base::ports::permission::RoleRepository;
use criterion::{criterion_group, criterion_main, Criterion};
use domain::{PermissionId, RoleId, TenantId, TenantRoleAggregate};
use persistence::repositories::role::PgRoleRepository;
use sqlx::PgPool;
use uuid::Uuid;

struct BenchFixture {
    pool: PgPool,
    tenant_id: TenantId,
    permission_ids: Vec<PermissionId>,
}

async fn setup_fixture() -> BenchFixture {
    let url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = PgPool::connect(&url)
        .await
        .expect("DATABASE_URL must point to a running PostgreSQL instance");

    let tenant_id = TenantId::from_uuid(Uuid::new_v4());
    let bench_suffix = Uuid::new_v4().to_string().split_at(8).0.to_string();
    let tenant_slug = format!("bench-{bench_suffix}");
    let owner_id = Uuid::new_v4();

    sqlx::query(
        r#"
        INSERT INTO users (id, email, username, name, password_hash, status, terms_accepted_at, terms_version)
        VALUES ($1, $2, $3, 'Benchmark Owner', 'not-a-real-hash', 'active', NOW(), '1.0')
        ON CONFLICT (email) DO NOTHING
        "#,
    )
    .bind(owner_id)
    .bind(format!("bench-owner-{tenant_slug}@example.com"))
    .bind(format!("bench-owner-{tenant_slug}"))
    .execute(&pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        INSERT INTO tenants (id, name, slug, owner_id)
        VALUES ($1, 'Benchmark Tenant', $2, $3)
        ON CONFLICT (slug) DO NOTHING
        "#,
    )
    .bind(tenant_id.0)
    .bind(&tenant_slug)
    .bind(owner_id)
    .execute(&pool)
    .await
    .unwrap();

    let mut permission_ids = Vec::new();
    for i in 0..128 {
        let id = PermissionId::from_uuid(Uuid::new_v4());
        let name = format!("bench.permission.{}", i);
        let result = sqlx::query(
            r#"
            INSERT INTO permissions (id, name, description, category)
            VALUES ($1, $2, 'benchmark permission', 'benchmark')
            ON CONFLICT (name) DO NOTHING
            "#,
        )
        .bind(id.0)
        .bind(&name)
        .execute(&pool)
        .await
        .unwrap();

        if result.rows_affected() > 0 {
            permission_ids.push(id);
        }
    }

    BenchFixture {
        pool,
        tenant_id,
        permission_ids,
    }
}

fn make_role(tenant_id: TenantId, permission_ids: &[PermissionId]) -> TenantRoleAggregate {
    TenantRoleAggregate {
        id: RoleId::from_uuid(Uuid::new_v4()),
        tenant_id,
        name: format!("bench-role-{}", Uuid::new_v4()),
        description: "benchmark role".to_string(),
        is_custom: true,
        is_system: false,
        permission_ids: permission_ids.to_vec(),
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
    }
}

fn bench_role_create(c: &mut Criterion) {
    let rt = tokio::runtime::Runtime::new().unwrap();
    let fixture = rt.block_on(setup_fixture());
    let repo = Arc::new(PgRoleRepository::new(fixture.pool));
    let ctx = ExecutionContext::new(RequestContext::new());

    let mut group = c.benchmark_group("role_create_permissions");
    for count in [10, 50, 100] {
        let permissions = fixture
            .permission_ids
            .iter()
            .copied()
            .take(count)
            .collect::<Vec<_>>();
        group.bench_with_input(
            criterion::BenchmarkId::new("permissions", count),
            &count,
            |b, &_count| {
                b.to_async(&rt).iter(|| {
                    let repo = Arc::clone(&repo);
                    let ctx = ctx.clone();
                    let role = make_role(fixture.tenant_id, &permissions);
                    async move {
                        repo.create_role(&ctx, role).await.unwrap();
                    }
                });
            },
        );
    }
    group.finish();
}

criterion_group!(benches, bench_role_create);
criterion_main!(benches);
