# Implementation Plan: Book Tracker Application

**Branch**: `001-book-tracker` | **Date**: 2025-11-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-book-tracker/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

A single-user book tracking application that enables searching, importing, and managing books and authors using the Hardcover GraphQL API. The system consists of a Vue.js frontend with Tailwind CSS for UI, an Express.js backend API, and SQLite for local data storage. Books are searched by title, author, or ISBN; ownership is automatically determined by scanning the user's filesystem collection directory. The application supports bulk imports of author bibliographies, manual ownership marking, soft deletion of books, and author profile management with API refresh capability.

## Technical Context

**Language/Version**: TypeScript (targeting ES2022), Node.js 22.x (minimum 20.19+)  
**Primary Dependencies**: 
- Backend: Express.js, better-sqlite3 (@types/better-sqlite3), Vite, Vitest, graphql-request
- Frontend: Vue 3 (Composition API with `<script setup>`), Tailwind CSS, Vite, Vitest, Vue Test Utils, graphql-request
- Testing: SuperTest (API testing), Mock Service Worker (MSW for mocking)
- Shared: TypeScript types for API contracts, GraphQL query definitions

**Storage**: SQLite via better-sqlite3 (synchronous API, local embedded database file)  
**Testing**: 
- Unit tests: Vitest (backend services, frontend composables)
- Integration tests: Vitest + SuperTest (API endpoints), Vitest + Vue Test Utils + MSW (component integration)
- User story validation: Vitest + SuperTest + in-memory SQLite

**Target Platform**: Desktop/server environment (Node.js 22+ runtime), browser (modern ES6+ support)  
**Project Type**: Web application (client/server split with shared TypeScript types)  
**Performance Goals**: 
- Search results displayed within 5 seconds (SC-007)
- Book import completed within 30 seconds (SC-001)
- Author bibliography import within 60 seconds excluding rate limit delays (SC-002)
- Filesystem scan using native `fs.glob` asynchronous iteration to prevent blocking

**Constraints**: 
- Single-user operation (no concurrent access handling required)
- Hardcover API rate limiting requires client-side throttling with exponential backoff (FR-031) - implemented via wrapper around graphql-request
- Filesystem read access required for ownership detection using pattern `{COLLECTION_ROOT}/*/*/*/`
- Offline-capable after initial data import (local SQLite storage)
- Synchronous database operations (better-sqlite3) for simplicity and debuggability

**Scale/Scope**: 
- Single user per installation
- Expected thousands of books in personal library
- Dozens to hundreds of authors
- Filesystem scanning optimized with native Node.js 22 `fs.glob`, async iteration, optional caching with 1-hour TTL

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. User-Centric Design ✅

- **Clear user problems identified**: Five user stories (P1-P3) covering search by title, author import, profile management, ISBN search, and deletion
- **Solution validation**: Each story has acceptance scenarios validating the reader workflow
- **Discoverability**: Search interface unified, bulk actions explicit with checkbox mode
- **Reader workflows prioritized**: Ownership detection automated from filesystem, manual override available

**Status**: PASS - Feature spec demonstrates clear user needs with prioritized stories

### II. Data Integrity & Privacy ✅

- **Secure storage**: SQLite local database, single-user model eliminates multi-tenant concerns
- **User ownership**: Local database file owned by user, filesystem-based ownership detection
- **Data validation**: Soft deletion prevents data loss (FR-022, FR-024), duplicate prevention (FR-028)
- **Privacy by design**: Single-user, no cloud sync, no analytics mentioned
- **Data export**: Not required - locally-run app with direct database file access

**Status**: PASS - Local database file provides full data ownership and access

### III. Incremental Development ✅

- **Independently testable stories**: Each user story has independent acceptance scenarios
- **Test-first approach**: Acceptance scenarios defined before implementation
- **Foundation phase**: NEEDS CLARIFICATION on foundation requirements (database setup, API client configuration)
- **Standalone value**: Each story delivers complete workflow (search→import→view)
- **No partial features**: Stories complete end-to-end flows

**Status**: PASS - Specification follows incremental development principles; foundation phase to be defined in research.md

### IV. Simplicity First ✅

- **YAGNI compliance**: No authentication (single-user), no edition tracking, no social features
- **Standard patterns**: REST/GraphQL client, SQLite, Express.js - all standard choices
- **Avoiding premature optimization**: Performance goals realistic, no caching layer specified until needed
- **Complexity tracking**: Client/server split is justified by browser UI requirement

**Status**: PASS - Technology choices are standard and justified; no unnecessary complexity detected

### V. Observable & Debuggable ✅

- **Structured logging required**: FR-032 mandates logging of API calls, errors, imports, user actions
- **Log levels defined**: ERROR for failures, operational logging for actions
- **Boundaries logged**: API interactions, filesystem scans, database operations
- **Actionable errors**: Error handling specified (FR-026) with user-friendly messages
- **Performance metrics**: Success criteria define measurable timing goals

**Status**: PASS - Logging requirements comprehensively specified

---

**GATE RESULT (Initial)**: PASS

All constitution principles satisfied. No blockers identified.

---

### Phase 1 Re-evaluation

*Completed after research.md, data-model.md, contracts/, and quickstart.md generation*

#### I. User-Centric Design ✅ (Re-confirmed)

- **API design**: OpenAPI contract defines clear, RESTful endpoints matching user workflows
- **Data model**: Soft deletion, ownership tracking, and manual overrides respect user intent
- **Discoverability**: Search unified in single endpoint with type parameter (title/author/isbn)

**Status**: PASS - Design artifacts reinforce user-centric approach

#### II. Data Integrity & Privacy ✅ (Re-confirmed)

- **Data model integrity**: Foreign keys, unique constraints, CHECK constraints enforce data validity
- **Soft deletion**: Books never physically removed, preventing accidental data loss
- **Privacy**: Local-only storage, no external services beyond read-only API calls
- **Data ownership**: SQLite database file directly accessible to user for backup, migration, or external analysis

**Status**: PASS - Local database architecture ensures complete data ownership without requiring export API

#### III. Incremental Development ✅ (Re-confirmed)

- **Testing strategy**: Multi-layer tests (unit, integration, user story validation) support incremental delivery
- **Foundation phase**: Defined in research.md (database setup, API client, filesystem scanner)
- **Contract tests**: API contracts enable test-first development of endpoints
- **Independent stories**: Each user story maps to specific API endpoints and database operations

**Status**: PASS - Design supports incremental, test-driven development

#### IV. Simplicity First ✅ (Re-confirmed)

- **Technology choices**: All research recommendations favor simplicity (better-sqlite3, graphql-request, native fs.glob)
- **Data model**: Three simple tables, no ORM, straightforward relationships
- **API design**: Standard REST patterns, no complex middleware or authentication
- **No premature optimization**: Filesystem caching optional, only added if performance testing shows need

**Status**: PASS - Design adheres to simplicity principles; no complexity violations

#### V. Observable & Debuggable ✅ (Re-confirmed)

- **API logging**: contracts/hardcover.graphql.md specifies comprehensive logging for all API calls
- **Error handling**: OpenAPI defines error schemas with actionable messages
- **Structured logging**: INFO for actions, ERROR for failures, WARN for rate limits
- **Debugging aids**: Timestamp fields in data model, updated_at triggers for audit trail

**Status**: PASS - Observability comprehensively designed

---

**FINAL GATE RESULT (Phase 1)**: PASS ✅

**All Constitution Principles Satisfied**:
- ✅ User-Centric Design
- ✅ Data Integrity & Privacy (local database ownership)
- ✅ Incremental Development
- ✅ Simplicity First
- ✅ Observable & Debuggable

**No Blockers**: Ready to proceed to Phase 2 (task generation)

**Design Quality**: All Phase 1 artifacts (research.md, data-model.md, contracts/, quickstart.md) are comprehensive and align with constitution principles

## Project Structure

### Documentation (this feature)

```text
specs/001-book-tracker/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── api.openapi.yaml # Backend REST API specification
│   └── hardcover.graphql.md # External Hardcover API queries/mutations
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/          # Database models (Book, Author, BookAuthor)
│   ├── services/        # Business logic (HardcoverClient, OwnershipScanner, ImportService)
│   ├── api/             # Express routes and controllers
│   │   ├── routes/      # Route definitions (search, books, authors)
│   │   └── middleware/  # Logging, error handling, rate limiting
│   ├── db/              # Database connection and migrations
│   └── config/          # Environment config, constants
├── tests/
│   ├── contract/        # API contract tests (OpenAPI compliance)
│   ├── integration/     # End-to-end user story tests
│   └── unit/            # Service and model unit tests
├── vite.config.ts       # Vite build configuration
├── vitest.config.ts     # Vitest test configuration
└── package.json

frontend/
├── src/
│   ├── components/      # Reusable Vue components (SearchBar, BookCard, AuthorCard)
│   │   ├── common/      # Generic UI components
│   │   ├── books/       # Book-specific components
│   │   └── authors/     # Author-specific components
│   ├── pages/           # Route-level page components (SearchPage, AuthorPage)
│   ├── services/        # API client for backend communication
│   ├── stores/          # State management (if needed, using Pinia or composables)
│   ├── types/           # TypeScript type definitions
│   ├── router/          # Vue Router configuration
│   └── styles/          # Tailwind CSS configuration and custom styles
├── tests/
│   ├── integration/     # Component integration tests
│   └── unit/            # Component unit tests
├── vite.config.ts       # Vite build configuration
├── vitest.config.ts     # Vitest test configuration
├── tailwind.config.js   # Tailwind CSS configuration
└── package.json

shared/                  # Shared TypeScript types between frontend and backend
├── types/
│   ├── api.ts           # API request/response types
│   ├── book.ts          # Book entity types
│   └── author.ts        # Author entity types
└── package.json

.env.example             # Example environment configuration
package.json             # Root workspace configuration
```

**Structure Decision**: Web application structure (Option 2) selected due to frontend (Vue/Tailwind) + backend (Express) requirement. A `shared/` directory is added for TypeScript type sharing to maintain type safety across the client/server boundary. The backend uses Vite for build tooling per user requirements. Both projects use Vitest for testing consistency.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
