mod common;

use common::repository_conformance::run_user_repository_conformance_tests;
use klynt_api::infrastructure::repositories::in_memory_user::InMemoryUserRepository;

#[tokio::test]
async fn in_memory_user_repository_conforms() {
    let repo = InMemoryUserRepository::new();
    run_user_repository_conformance_tests(&repo)
        .await
        .expect("conformance tests should pass");
}
