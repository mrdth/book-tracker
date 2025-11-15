# Implementation Plan: Author Deletion

**Branch**: `003-author-deletion` | **Date**: 2025-11-15 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/003-author-deletion/spec.md`

## Summary

Add a Delete button to the author page that allows users to permanently remove authors from their library. When deletion is confirmed, the system removes the author record and handles books based on authorship: sole-authored books are permanently deleted, while co-authored books have only the deleted author's association removed. The operation is atomic (all-or-nothing) with proper confirmation dialogs, loading states, error handling, and concurrent operation prevention.

## Technical Context

**Language/Version**: TypeScript (ES2022), Node.js 22.x (minimum 20.19+)  
**Primary Dependencies**:
  - Backend: Express 5.x, better-sqlite3 12.x, TypeScript 5.x
  - Frontend: Vue 3.5.x, Vue Router 4.x, Vite 7.x, TypeScript 5.x
**Storage**: SQLite (better-sqlite3) with schema in `backend/src/db/schema.sql`  
**Testing**: Vitest 4.x (both backend contract tests and frontend integration tests)  
**Target Platform**: Web application (Node.js backend, browser frontend)  
**Project Type**: Web (frontend + backend monorepo)  
**Performance Goals**: <5 seconds for deletion of authors with up to 100 books, <1 second redirect after completion  
**Constraints**: Atomic operations (no partial deletions), no artificial timeout limits, prevent concurrent operations  
**Scale/Scope**: Personal library application, designed for single-user data management

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: User-Centric Design
✅ **PASS** - Feature addresses clear user need: removing unwanted authors from library
- Delete button clearly labeled with destructive styling (red/warning colors)
- Confirmation dialog shows author name and exact count of books to be deleted
- Proper singular/plural grammar in messages
- Clear error messages keep user informed
- Cancellation option preserves user control

### Principle II: Data Integrity & Privacy
✅ **PASS** - Atomic deletion ensures data consistency
- All-or-nothing operation (FR-010): prevents partial deletions
- Co-authored book handling preserves data integrity (FR-009)
- Database CASCADE DELETE constraints maintain referential integrity
- Proper error handling prevents data corruption
- No logging of deletion events per user specification (clarification #2)

### Principle III: Incremental Development
✅ **PASS** - Feature is independently testable and deliverable
- Standalone feature: adds deletion capability without modifying existing functionality
- P1 user story delivers core value (delete with confirmation)
- P2 and P3 stories add polish (better feedback, error handling)
- Each story has clear, testable acceptance criteria
- Foundation already exists (database schema, API patterns, UI components)

### Principle IV: Simplicity First
✅ **PASS** - Minimal complexity, leverages existing patterns
- Uses existing Express REST API pattern (DELETE endpoint)
- Uses existing confirmation dialog patterns (similar to book deletion)
- Leverages database CASCADE DELETE for data cleanup
- No new dependencies required
- No custom abstractions needed
- Reuses existing error handling middleware

### Principle V: Observable & Debuggable
✅ **PASS** - Proper logging at API boundaries
- INFO logging for deletion requests (author ID, book counts)
- ERROR logging for deletion failures
- Success/failure clearly communicated to user via UI
- No silent failures (FR-012, SC-003)
- Existing logger infrastructure handles all observability needs

**Overall Status**: ✅ ALL GATES PASSED - Ready for Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/003-author-deletion/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── author-deletion-api.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/
│   │   ├── Author.ts           # MODIFY: Add deletion logic for co-authored book handling
│   │   ├── Book.ts             # REVIEW: Understand existing deletion patterns
│   │   └── BookAuthor.ts       # REVIEW: Understand CASCADE DELETE behavior
│   ├── services/
│   │   ├── AuthorService.ts    # MODIFY: Add deleteAuthor method
│   │   └── BookService.ts      # REVIEW: Understand book deletion logic
│   ├── api/
│   │   └── routes/
│   │       └── authors.ts      # MODIFY: Add DELETE /api/authors/:id endpoint
│   └── db/
│       └── schema.sql          # REVIEW: Verify CASCADE DELETE constraints
└── tests/
    └── contract/
        └── authors.test.ts     # MODIFY: Add deletion endpoint tests

frontend/
├── src/
│   ├── pages/
│   │   └── AuthorPage.vue      # MODIFY: Add Delete button and confirmation modal
│   ├── components/
│   │   └── authors/
│   │       └── DeleteAuthorModal.vue  # CREATE: Confirmation dialog component
│   └── services/
│       └── api.ts              # MODIFY: Add deleteAuthor API method
└── tests/
    └── integration/
        └── AuthorPage.test.ts  # CREATE: Test deletion flows
```

**Structure Decision**: Web application pattern with backend/frontend separation. All existing infrastructure (API routes, database models, UI components) follows established patterns. The Delete button will be added to the existing AuthorPage.vue component, and a new DeleteAuthorModal.vue component will handle the confirmation dialog following the pattern used by EditAuthorModal.vue.

## Complexity Tracking

> No Constitution violations - table not needed

