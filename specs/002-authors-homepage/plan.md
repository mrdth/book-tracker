# Implementation Plan: Authors Homepage

**Branch**: `002-authors-homepage` | **Date**: 2025-11-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-authors-homepage/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Create a new homepage for the book tracker application featuring a paginated/infinite-scroll list of authors sorted by last name, then first name. Each author entry displays their name, photo, bio (truncated at 300 characters), and count of collected books. The page includes A-Z alphabetical filtering navigation and a persistent navigation bar linking to Authors and Search pages. The feature emphasizes progressive loading for scalability with large author collections (10,000+ authors) while maintaining sub-500ms load times for pagination.

## Technical Context

**Language/Version**: TypeScript (ES2022), Node.js 22.x (minimum 20.19+)  
**Primary Dependencies**: 
- Backend: Express 5.x, better-sqlite3 12.x, graphql 16.x
- Frontend: Vue 3.5.x, Vue Router 4.x, Tailwind CSS 4.x, Vite 7.x
- Shared: GraphQL Request 7.x
**Storage**: SQLite (better-sqlite3), schema in backend/src/db/schema.sql  
**Testing**: Vitest 4.x (both frontend and backend), Supertest 7.x (backend), Vue Test Utils 2.x (frontend), MSW 2.x (frontend mocking)  
**Target Platform**: Web application (browser + Node.js server)  
**Project Type**: Web application (monorepo with backend, frontend, shared workspaces)  
**Performance Goals**: 
- Initial page load: <3 seconds (SC-001)
- Pagination load: <500ms (SC-003)
- Support 10,000+ authors without degradation (SC-004)
**Constraints**: 
- Circular photo presentation (FR-010)
- 300 character bio truncation (FR-012)
- 50 authors per page/batch (FR-006, US-002)
- 10 second timeout for initial load (FR-018)
- Network error handling requires manual refresh (per clarifications)
**Scale/Scope**: Designed for 10,000+ author collections with efficient pagination

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: User-Centric Design ✅
- **Clear user need**: Users need to discover and browse authors in their collection
- **Improves reading tracking**: Enables efficient navigation to author detail pages
- **Discoverable**: A-Z navigation makes finding specific authors intuitive
- **Prioritizes reader workflow**: Homepage serves as primary entry point for author discovery

### Principle II: Data Integrity & Privacy ✅
- **Data security**: Read-only operations on existing author data
- **User ownership**: Displays user's existing author collection
- **Data validation**: No new data writes in this feature (uses existing validated data)
- **Privacy by design**: No new data collection or tracking introduced

### Principle III: Incremental Development ✅
- **Independently testable stories**: Each user story (P1-P4) can be tested and delivered separately
- **Foundation first**: Uses existing database schema and Author model (already implemented)
- **Story-by-story delivery**: 
  - P1 (Browse Authors List) can be delivered as standalone value
  - P2 (Infinite Scroll) builds on P1
  - P2 (Alphabetical Filter) builds on P1
  - P3 (Navigation Bar) is independent of author list functionality
- **Test-first approach**: Contract tests for API, integration tests for user journeys

### Principle IV: Simplicity First ✅
- **Standard patterns**: REST API for author list endpoint, Vue Router for navigation
- **Existing infrastructure**: Reuses AuthorModel, no new database tables needed
- **No premature optimization**: Simple SQL pagination with LIMIT/OFFSET initially
- **Standard libraries**: Vue 3 Composition API, Tailwind for styling (already in use)

### Principle V: Observable & Debuggable ✅
- **Structured logging**: Request/response logging for new API endpoints (existing logger)
- **Error messages**: Clear error states for network failures, empty results, timeouts
- **API boundaries**: New /api/authors endpoint with input/output logging
- **Performance metrics**: Log pagination load times to monitor 500ms target

**Gate Result**: ✅ PASSED - All constitutional principles satisfied, no violations to justify

---

## Post-Design Constitution Re-evaluation

*Phase 1 design complete. Re-checking constitutional compliance with actual implementation decisions.*

### Principle I: User-Centric Design ✅

**Design Review**:
- ✅ Virtual scrolling ensures smooth UX even with 10,000+ authors (research confirmed)
- ✅ A-Z filter provides immediate navigation to specific authors (under 1ms query time)
- ✅ Clear loading indicators and error messages (per quickstart implementation)
- ✅ Accessible navigation with ARIA labels and keyboard support (per quickstart)

**Validation**: Design choices directly support user needs. Virtual scrolling prevents performance degradation that would harm user experience at scale.

### Principle II: Data Integrity & Privacy ✅

**Design Review**:
- ✅ Read-only API endpoint (`POST /api/authors/list`) does not modify data
- ✅ No new data collection (only queries existing `authors` and `books` tables)
- ✅ `sort_name` column is derived data (computed from existing `name` field)
- ✅ Input validation on API prevents injection attacks

**Validation**: No privacy or integrity concerns introduced. New `sort_name` column is optimization, not new user data.

### Principle III: Incremental Development ✅

**Design Review**:
- ✅ Migration 003 can be applied independently (adds column + index)
- ✅ Backend endpoint can be tested in isolation via curl/Postman
- ✅ Frontend composable can be unit tested without full UI
- ✅ Components can be developed and tested incrementally (AlphabetFilter → AuthorCard → HomePage)
- ✅ Contract tests verify API before frontend integration

**Validation**: Design supports story-by-story delivery. Each layer (DB → API → Composable → Components) can be completed and tested independently.

### Principle IV: Simplicity First ✅

**Design Review**:
- ✅ Used proven libraries (VueUse, vue-virtual-scroller) instead of custom implementations
- ✅ Simple last-word heuristic for name parsing (90% accuracy acceptable for MVP)
- ✅ Standard REST API pattern (no complex GraphQL subscriptions)
- ✅ Cursor-based pagination is simpler than maintaining session state
- ✅ No new database tables (just one column + index)

**Validation**: All complexity justified by scale requirements (10k+ authors). Avoided premature optimization while meeting performance goals.

### Principle V: Observable & Debuggable ✅

**Design Review**:
- ✅ API logs request params (cursor, letterFilter) and response size
- ✅ Frontend composable exposes loading/error state for DevTools inspection
- ✅ Clear error messages ("letterFilter must be a single letter A-Z")
- ✅ Performance timing can be added to pagination requests
- ✅ Virtual scroller has data-index attributes for debugging

**Validation**: Design includes logging at all boundaries (API, composable, components). Easy to diagnose issues in production.

### Additional Considerations

**Dependencies Introduced**:
- `@vueuse/core`: Well-maintained (41k+ stars), small bundle (~2 KB tree-shakeable)
- `vue-virtual-scroller@next`: Official Vue 3 support, battle-tested (~15 KB)

**Complexity Justified**:
- Cursor-based pagination: Required for consistent performance at 10k+ scale
- Virtual scrolling: Mandatory to prevent DOM bloat (reduces memory by 38%)
- `sort_name` column: Necessary for efficient sorting without runtime parsing

**Constitution Alignment Score**: **5/5** ✅

All design decisions align with constitutional principles. No violations requiring justification in Complexity Tracking table.

---

## Project Structure

### Documentation (this feature)

```text
specs/002-authors-homepage/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/
│   │   ├── Author.ts           # Existing - may need pagination methods
│   │   ├── Book.ts             # Existing
│   │   └── BookAuthor.ts       # Existing
│   ├── services/
│   │   └── AuthorService.ts    # Existing - may need list/pagination methods
│   ├── api/
│   │   └── routes/
│   │       └── authors.ts      # Existing - will add pagination endpoint
│   └── db/
│       ├── schema.sql          # Existing schema (authors table already defined)
│       └── connection.ts       # Existing
└── tests/
    ├── contract/               # New API contract tests
    └── integration/            # New author list integration tests

frontend/
├── src/
│   ├── components/
│   │   └── authors/
│   │       ├── AuthorCard.vue       # Existing - may need updates
│   │       ├── AuthorsList.vue      # NEW - main list component
│   │       └── AlphabetFilter.vue   # NEW - A-Z navigation
│   ├── pages/
│   │   └── AuthorsHomePage.vue      # NEW - homepage route
│   ├── composables/
│   │   └── useAuthorsList.ts        # NEW - list/pagination logic
│   ├── router/
│   │   └── index.ts                 # Update with new routes
│   └── services/
│       └── api.ts                   # Update with authors list endpoint
└── tests/
    ├── integration/                 # New user journey tests
    └── unit/                        # Component tests

shared/
├── src/
│   ├── types/
│   │   └── author.ts               # Existing - may need pagination types
│   └── queries/                    # May need new query types if using GraphQL
```

**Structure Decision**: This is a monorepo with three npm workspaces (backend, frontend, shared). The backend uses Express + SQLite with a service/model layer. The frontend uses Vue 3 with Composition API and Vue Router. Shared types and utilities live in the shared workspace. This feature primarily adds new Vue components and pages, with minor additions to existing API routes for pagination support. The navigation bar will be implemented directly in App.vue rather than as a separate component for simplicity.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations - this section intentionally left empty per Constitution Check passing all gates.
