# ADR-002: Use React + Vite for the Frontend

## Status
Accepted

## Date
2026-06-18

## Context
We need a modern frontend stack for an education platform with dashboards, courses, lessons, and admin interfaces.

## Decision
Use React with Vite as the build tool and TypeScript for type safety.

## Alternatives Considered

### Next.js
- Pros: SSR, SSG, full-stack framework
- Cons: Tighter coupling to deployment model, more complex for a foundation phase
- Rejected: Start with SPA; migrate to Next.js or React Router framework mode if SSR is needed

### Vue + Vite
- Pros: Gentle learning curve, good DX
- Cons: Smaller talent pool for education platform team, less ecosystem depth for some libraries
- Rejected: React is the team's primary frontend framework

## Consequences
- Fast HMR and build times with Vite
- Mature ecosystem for forms, state management, and testing
- Easy migration path to SSR later if needed
