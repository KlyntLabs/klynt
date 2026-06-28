# Ubiquitous Language

Canonical domain vocabulary for the Klynt Education Platform. Derived from
`CONTEXT.md`, the ADRs, and the `shared/domain` types. When the prose below
disagrees with older docs, this file wins — and the disagreement is logged in
[Flagged ambiguities](#flagged-ambiguities) so we can fix the stale doc.

## Identity & authentication

| Term                     | Definition                                                                                       | Aliases to avoid            |
| ------------------------ | ------------------------------------------------------------------------------------------------ | --------------------------- |
| **User**                 | A person's account/identity in the platform (email + password + status + a global role).         | account, login, profile     |
| **Email**                | A user's unique identifier and contact method.                                                   | username\*, email address   |
| **UserStatus**           | The lifecycle state of a user: `pending`, `active`, `inactive`, `suspended` (deletion is `deleted_at`, not a status). | state                       |
| **Session**              | A server-side authenticated session record; Postgres-authoritative, Redis-cached, with a `kind`. | login session               |
| **Access token**         | A short-lived opaque bearer tied to an access **Session** that authorizes an API request.         | access_token, JWT\*         |
| **Refresh token**        | A long-lived credential that mints new access tokens; rejected by the auth middleware.            | refresh_token               |
| **Verification token**   | A single-use token for email verification or password reset.                                     | token (bare), code          |
| **Session cookie**       | The `session_token` `HttpOnly` cookie scoped to the parent domain, enabling cross-subdomain SSO. | auth cookie, JWT\*          |

\* Klynt uses **opaque** server-side tokens, not JWTs — say "access token", not "JWT".

## Tenancy & membership

| Term              | Definition                                                                              | Aliases to avoid                 |
| ----------------- | --------------------------------------------------------------------------------------- | -------------------------------- |
| **Tenant**        | An organization/institution that groups users and content; addressed externally by slug. | organization, institution, group |
| **TenantSlug**    | The canonical, URL-safe, human-readable identifier of a tenant (its subdomain).         | tenant id\*, org name            |
| **Membership**    | The authoritative link between a **User** and a **Tenant**, carrying a **TenantRole** and status. | association, tenant_user         |
| **Member**        | A **User** who holds an active **Membership** in a tenant.                              | participant, user (loose)        |
| **TenantRole**    | A user's role within one tenant: `owner`, `admin`, `member`, or `guest`.                | role (bare), permission\*        |
| **Invite**        | A pending, token-gated offer for an email to join a tenant with a specific **TenantRole**. | invitation                       |

\* A tenant's internal UUID is the `TenantId`; the **TenantSlug** is what appears in URLs.

## Authorization

| Term                  | Definition                                                                         | Aliases to avoid          |
| --------------------- | ---------------------------------------------------------------------------------- | ------------------------- |
| **Permission**        | A granular, named capability in the global catalog (e.g. `content.publish`).       | capability, claim         |
| **PermissionCategory**| The grouping of a **Permission**: `tenant`, `member`, `role`, `content`, `platform`. | —                         |
| **Role (aggregate)**  | A tenant-scoped bundle of **Permissions**; either a system role or a custom role.  | role (bare)               |
| **System role**       | One of the four non-deletable, auto-seeded roles: owner/admin/member/guest.        | default role              |
| **Custom role**       | A tenant-defined **Role** created via `tenant.manage_roles`.                       | user role, ad-hoc role    |

> ⚠️ "role" is the single most overloaded word in this codebase. See
> [Flagged ambiguities](#flagged-ambiguities) before using it unqualified.

## Workspace (desktop metaphor)

| Term                   | Definition                                                                        | Aliases to avoid      |
| ---------------------- | --------------------------------------------------------------------------------- | --------------------- |
| **Desktop**            | A tenant's workspace rendered as an OS-like desktop surface.                      | workspace (as a noun) |
| **TenantDesktopLayout**| The persisted arrangement (icons, windows, background) for a tenant's desktop.    | layout config         |
| **DesktopIcon**        | A placed shortcut to an **App** on the desktop (app_id + x/y).                    | icon, shortcut        |
| **DesktopWindow**      | An open **App** window on the desktop (position, size, state).                    | window, panel         |
| **App**                | A launchable application referenced by `app_id` on a desktop.                     | widget, tool          |
| **LayoutScope**        | Whether a layout is `shared` across the tenant or per-**User** (`user`).          | scope, level          |

## Content

| Term       | Definition                                                                        | Aliases to avoid        |
| ---------- | --------------------------------------------------------------------------------- | ----------------------- |
| **Content** | Learning material belonging to a **Tenant** (view/create/edit/delete/publish).    | material, resource, doc |

## Service & port vocabulary

These are part of how the team talks about the system, not domain entities,
but they appear in domain conversations so they earn a definition.

| Term                    | Definition                                                                       | Aliases to avoid    |
| ----------------------- | -------------------------------------------------------------------------------- | ------------------- |
| **Port**                | A canonical interface in `base::ports` that infra implements and services call.  | trait (loose), API  |
| **Repository**          | A persistence **Port** for an aggregate (e.g. `UserRepository`).                 | store\*, dao, repo  |
| **Store**               | A **Port** for non-aggregate state (e.g. `SessionStore`, `TokenStore`).          | repository\*        |
| **Adapter**             | A concrete impl of a **Port** (e.g. the Postgres `UserRepository`).              | impl, provider      |
| **Service**             | A business-logic layer over ports (`auth_service`, `tenant_service`, …).         | manager, handler    |
| **AuthorizationService**| The single fail-closed policy engine answering permission checks.                | authz, checker      |
| **SessionCoordinator**  | The service that applies **MembershipEvents** to active sessions.                | sync service        |
| **MembershipEvent**     | A domain event (`Added`/`Updated`/`Removed`) signaling a membership change.      | membership change   |

\* "repository" (aggregates) and "store" (session/token state) are deliberately
distinct — don't swap them.

## Relationships

- A **User** holds zero or more **Memberships**, each in exactly one **Tenant** with one **TenantRole**.
- A **Tenant** has exactly one owning **User**; a user may own at most 2 active tenants.
- A **TenantRole** is the name on a **Membership**; it resolves to a **Role (aggregate)** whose **Permissions** authorize actions.
- A **Membership** is the source of truth for authorization — a **Session**'s membership snapshot is UX-only and never authoritative.
- A **MembershipEvent** flows through the **SessionCoordinator** to keep session snapshots roughly in sync with **Membership** changes.
- An **Invite**, when accepted, creates a **Membership**; until then it grants no access.
- A **Tenant** owns one shared **TenantDesktopLayout** and one per-**User** layout.
- **Access token**s may be cached in Redis; **refresh token**s and **verification token**s never are.
- A **Session cookie** carries an access token so a single login authenticates every subdomain.

## Example dialogue

> **Dev:** "When we remove a **member** from a **tenant**, does their **session** lose access immediately?"
>
> **Domain expert:** "Yes. `remove_member` emits a **MembershipEvent::Removed**, the **SessionCoordinator** drops that **Tenant** from the session, and the next request re-verifies the **Membership** against Postgres. The stale **session** snapshot can't bypass that."
>
> **Dev:** "But the snapshot used to keep them as a **guest**. So 'guest **role**' and 'removed' are different things?"
>
> **Domain expert:** "Right. A **guest** still holds a **Membership** with read access. A removed **member** has no **Membership** at all — there's nothing to authorize against."
>
> **Dev:** "And is 'guest' a **TenantRole** or one of the global roles?"
>
> **Domain expert:** "**TenantRole** — `owner`/`admin`/`member`/`guest` are in-tenant. Platform-wide is **GlobalRole** (`owner`/`admin`/`user`). When you say 'admin,' always say which: a tenant admin can't touch platform settings, and a platform admin isn't automatically a tenant owner."

## Flagged ambiguities

- **"role" means four different things.** The codebase has four competing enums:
  - `Role` — `student`, `teacher`, `admin`, `parent` (legacy "education context", not wired to `User`).
  - `GlobalRole` — `owner`, `admin`, `user` (platform-wide).
  - `UserRole` — `student`, `instructor`, `admin` (the actual `User.role` field).
  - `TenantRole` — `owner`, `admin`, `member`, `guest` (in-tenant, the one authorization actually uses).
  **Recommendation:** use **TenantRole** for in-tenant authorization and **GlobalRole** for platform-wide. Treat `Role` and `UserRole` as legacy — they even disagree with each other (`teacher` vs `instructor`, and `parent` exists only in `Role`). Always qualify the variant ("the `member` tenant role", "a platform admin").
- **"admin" collides across every role enum.** It is a variant of `Role`, `GlobalRole`, `UserRole`, **and** `TenantRole`, each with different permissions. Never write "admin" alone — say "tenant admin" or "platform admin".
- **"teacher" vs "instructor."** The same education role is named `Role::Teacher` in one enum and `UserRole::Instructor` in another. **Recommendation:** consolidate on **teacher** (and drop the orphan `parent`/`instructor` duplicates when `Role` is retired), or pick `instructor` deliberately — but pick one.
- **"token" means two things.** `CONTEXT.md` defines **Token** as a verification token, but the auth API also uses "access_token"/"refresh_token" (session tokens). **Recommendation:** always qualify — **verification token** (email/password reset) vs **access token** / **refresh token** (session). Reserve the bare word "token" for nothing.
- **"tenant" = "organization" = "institution".** ADR-007, `role.rs`, and `CONTEXT.md` each use a different word for the same concept. **Recommendation:** standardize on **Tenant** (matches `domain::Tenant` and the `tenants` table); replace "organization"/"institution" in prose.
- **"member" is overloaded.** It is a **TenantRole** variant, a person (a **User** with a **Membership**), and the `TenantMember` read model. **Recommendation:** "member" = the person; "the `member` role" = the variant; **Membership** = the relationship; **TenantMember** = the list view.
- **"repository" vs "store."** Repositories persist aggregates (`UserRepository`, `TenantRepository`); stores hold non-aggregate state (`SessionStore`, `TokenStore`). Don't call the `SessionStore` a repository or vice-versa.
- **`CONTEXT.md`'s glossary is stale.** It lists tenant roles as `teacher`/`student`/`admin`, which match **none** of the four enums actually implemented. Treat this file as canonical until `CONTEXT.md` is reconciled.
