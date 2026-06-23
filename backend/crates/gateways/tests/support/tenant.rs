//! Fake tenant service dependencies for gateway tests.

pub use permission_repo::FakePermissionRepository;
pub use repos::{
    FakeMembershipRepository, FakeTenantInviteRepository, FakeTenantRepository,
    StatefulFakeMembershipRepository, StatefulFakeTenantRepository,
};
pub use role_repo::{FakeRoleRepository, StatefulFakeRoleRepository};
pub use service_builder::{build_stateful_test_tenant_service, build_test_tenant_service};

mod permission_repo;
mod repos;
mod role_repo;
mod service_builder;
