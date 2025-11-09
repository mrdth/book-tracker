# Tasks: Book Tracker Application

**Input**: Design documents from `/specs/001-book-tracker/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create root workspace package.json with workspaces configuration
- [X] T002 Create backend/package.json with Express, better-sqlite3, graphql-request, Vite, Vitest, SuperTest dependencies
- [X] T003 Create frontend/package.json with Vue 3, Tailwind CSS, Vite, Vitest, Vue Test Utils, graphql-request dependencies
- [X] T004 Create shared/package.json with TypeScript type definitions
- [X] T005 [P] Configure TypeScript (tsconfig.json) for backend targeting ES2022
- [X] T006 [P] Configure TypeScript (tsconfig.json) for frontend targeting ES2022
- [X] T007 [P] Configure TypeScript (tsconfig.json) for shared types
- [X] T008 [P] Configure ESLint for backend in backend/eslint.config.js
- [X] T009 [P] Configure ESLint for frontend in frontend/eslint.config.js
- [X] T010 [P] Configure Prettier in .prettierrc
- [X] T011 [P] Create backend/.env.example with DATABASE_PATH, HARDCOVER_API_URL, HARDCOVER_API_KEY, COLLECTION_ROOT, PORT, LOG_LEVEL
- [X] T012 [P] Configure Vite for backend in backend/vite.config.ts
- [X] T013 [P] Configure Vite for frontend in frontend/vite.config.ts
- [X] T014 [P] Configure Vitest for backend in backend/vitest.config.ts
- [X] T015 [P] Configure Vitest for frontend in frontend/vitest.config.ts
- [X] T016 [P] Configure Tailwind CSS in frontend/tailwind.config.js
- [X] T017 [P] Create backend/src directory structure (models/, services/, api/routes/, api/middleware/, db/, config/)
- [X] T018 [P] Create frontend/src directory structure (components/, pages/, services/, router/, stores/, types/, styles/)
- [X] T019 [P] Create shared/types directory structure
- [X] T020 [P] Create test directory structures (backend/tests/, frontend/tests/)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database Infrastructure

- [X] T021 Create SQLite database schema in backend/src/db/schema.sql (authors, books, book_authors tables with indexes and triggers)
- [X] T022 Create database connection module in backend/src/db/connection.ts using better-sqlite3
- [X] T023 Create database migration runner in backend/src/db/migrate.ts
- [X] T024 Create initial migration 001_create_schema.sql in backend/src/db/migrations/

### Shared Types

- [X] T025 [P] Create Book type definition in shared/types/book.ts (Book, BookWithAuthors interfaces)
- [X] T026 [P] Create Author type definition in shared/types/author.ts (Author, AuthorWithBooks interfaces)
- [X] T027 [P] Create API contract types in shared/types/api.ts (request/response types from OpenAPI)
- [X] T028 [P] Create GraphQL query definitions in shared/queries/hardcover.ts (all 6 queries from contracts)

### Backend Core Infrastructure

- [X] T029 Create environment configuration in backend/src/config/env.ts
- [X] T030 Create structured logging utility in backend/src/config/logger.ts (supports DEBUG, INFO, WARN, ERROR levels)
- [X] T031 Create Express app setup in backend/src/app.ts (middleware, CORS, JSON parsing, error handling)
- [X] T032 Create error handling middleware in backend/src/api/middleware/errorHandler.ts
- [X] T033 Create logging middleware in backend/src/api/middleware/requestLogger.ts
- [X] T034 Create rate-limited Hardcover GraphQL client in backend/src/services/HardcoverClient.ts (exponential backoff, logging)
- [X] T035 Create ownership filesystem scanner in backend/src/services/OwnershipScanner.ts (using native fs.glob)
- [X] T036 Create server entry point in backend/src/index.ts

### Frontend Core Infrastructure

- [X] T037 Create Vue Router configuration in frontend/src/router/index.ts (routes for search, author pages)
- [X] T038 Create backend API client in frontend/src/services/api.ts (wrapper for fetch with type safety)
- [X] T039 Create Tailwind base styles in frontend/src/styles/main.css
- [X] T040 Create Vue app entry point in frontend/src/main.ts

### Testing Infrastructure

- [X] T041 Create backend test setup in backend/tests/setup.ts (in-memory SQLite database helper)
- [X] T042 Create frontend test setup in frontend/tests/setup.ts (MSW server configuration)
- [X] T043 Create MSW request handlers in frontend/tests/mocks/handlers.ts (mock API responses)
- [X] T044 Create Hardcover API mock responses in backend/tests/mocks/hardcover.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Search and Import Books by Title (Priority: P1) 🎯 MVP

**Goal**: Enable readers to search for books by title, view results with status indicators (already imported/deleted), and import selected books with author information and ownership detection.

**Independent Test**: Search for "The Great Gatsby", view search results, import a book, verify it appears in database with correct ownership status from filesystem check.

### Backend Implementation for US1

- [X] T045 [P] [US1] Create Author model in backend/src/models/Author.ts (CRUD operations for authors table)
- [X] T046 [P] [US1] Create Book model in backend/src/models/Book.ts (CRUD operations for books table)
- [X] T047 [P] [US1] Create BookAuthor model in backend/src/models/BookAuthor.ts (many-to-many association operations)
- [X] T048 [US1] Create BookService in backend/src/services/BookService.ts (import book, check duplicates, check deleted status)
- [X] T049 [US1] Create SearchService in backend/src/services/SearchService.ts (query Hardcover API, merge with local DB status)
- [X] T050 [US1] Create POST /api/search endpoint in backend/src/api/routes/search.ts (title search with pagination)
- [X] T051 [US1] Create POST /api/books endpoint in backend/src/api/routes/books.ts (import book by external ID)
- [X] T052 [US1] Create GET /api/books/:id endpoint in backend/src/api/routes/books.ts (get book details)
- [X] T053 [US1] Add route registration to Express app in backend/src/app.ts

### Frontend Implementation for US1

- [X] T054 [P] [US1] Create SearchBar component in frontend/src/components/common/SearchBar.vue (unified search input with type selector)
- [X] T055 [P] [US1] Create BookCard component in frontend/src/components/books/BookCard.vue (display book with status indicator and import button)
- [X] T056 [P] [US1] Create StatusBadge component in frontend/src/components/common/StatusBadge.vue (visual indicators for imported/deleted/not imported)
- [X] T057 [US1] Create useBookSearch composable in frontend/src/composables/useBookSearch.ts (search logic, loading states, error handling)
- [X] T058 [US1] Create SearchPage in frontend/src/pages/SearchPage.vue (main search interface with results list)
- [X] T059 [US1] Add search route to router in frontend/src/router/index.ts

### Integration for US1

- [X] T060 [US1] Integrate ownership scanner with book import in backend/src/services/BookService.ts
- [X] T061 [US1] Add comprehensive logging to all US1 services (API calls, imports, ownership checks, errors)

**Checkpoint**: User Story 1 should be fully functional - search by title, import books, view ownership status

---

## Phase 4: User Story 2 - Search and Import Author with Complete Bibliography (Priority: P2)

**Goal**: Enable readers to search for authors by name, view author profiles, and import all of an author's books at once with ownership detection for each book.

**Independent Test**: Search for "Agatha Christie", select an author, import their complete bibliography, verify all books added to database with ownership status.

### Backend Implementation for US2

- [ ] T062 [US2] Add author search to SearchService in backend/src/services/SearchService.ts (query Hardcover API for authors)
- [ ] T063 [US2] Create AuthorService in backend/src/services/AuthorService.ts (import author with books, check duplicates/deleted, bulk ownership scan)
- [ ] T064 [US2] Create POST /api/authors endpoint in backend/src/api/routes/authors.ts (import author by external ID with all books)
- [ ] T065 [US2] Create GET /api/authors/:id endpoint in backend/src/api/routes/authors.ts (get author with active books)
- [ ] T066 [US2] Add author routes to Express app in backend/src/app.ts

### Frontend Implementation for US2

- [ ] T067 [P] [US2] Create AuthorCard component in frontend/src/components/authors/AuthorCard.vue (display author with book count and import button)
- [ ] T068 [US2] Update SearchBar component to support author search type in frontend/src/components/common/SearchBar.vue
- [ ] T069 [US2] Update SearchPage to display author results in frontend/src/pages/SearchPage.vue
- [ ] T070 [US2] Create AuthorPage in frontend/src/pages/AuthorPage.vue (display author bio and book list)
- [ ] T071 [US2] Add author page route to router in frontend/src/router/index.ts

### Integration for US2

- [ ] T072 [US2] Add bulk ownership scanning for author imports in backend/src/services/AuthorService.ts
- [ ] T073 [US2] Add comprehensive logging to all US2 services (author imports, book counts, skipped books)

**Checkpoint**: User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Manage Author Profiles and Update Bibliographies (Priority: P3)

**Goal**: Enable readers to view author pages, edit biographical information, refresh book lists from Hardcover API, and perform bulk actions (mark as owned, delete) on multiple books.

**Independent Test**: View any author page, edit their bio, save changes, click "Update from API" to import new books, use bulk actions to mark multiple books as owned, verify all changes persist.

### Backend Implementation for US3

- [ ] T074 [US3] Create PATCH /api/authors/:id endpoint in backend/src/api/routes/authors.ts (update author bio/name/photo)
- [ ] T075 [US3] Create POST /api/authors/:id/refresh endpoint in backend/src/api/routes/authors.ts (fetch latest books from Hardcover API)
- [ ] T076 [US3] Create PATCH /api/books/bulk endpoint in backend/src/api/routes/books.ts (bulk update ownership/deletion)
- [ ] T077 [US3] Add refresh logic to AuthorService in backend/src/services/AuthorService.ts (compare API books with local, import new, skip deleted)
- [ ] T078 [US3] Add bulk update logic to BookService in backend/src/services/BookService.ts (validate book IDs, update multiple records in transaction)

### Frontend Implementation for US3

- [ ] T079 [P] [US3] Create EditAuthorModal component in frontend/src/components/authors/EditAuthorModal.vue (form for editing author info)
- [ ] T080 [P] [US3] Create BulkActionBar component in frontend/src/components/books/BulkActionBar.vue (checkboxes, select all, bulk action buttons)
- [ ] T081 [US3] Add edit mode to AuthorPage in frontend/src/pages/AuthorPage.vue (edit button, modal integration)
- [ ] T082 [US3] Add refresh functionality to AuthorPage in frontend/src/pages/AuthorPage.vue (refresh button, loading state)
- [ ] T083 [US3] Add bulk action mode to AuthorPage in frontend/src/pages/AuthorPage.vue (enable/disable bulk mode, selection state)

### Integration for US3

- [ ] T084 [US3] Add comprehensive logging to all US3 services (author updates, API refreshes, bulk operations)

**Checkpoint**: All user stories 1, 2, and 3 should now be independently functional

---

## Phase 6: User Story 4 - Search Books by ISBN (Priority: P3)

**Goal**: Enable readers to search for books using ISBN numbers for precise book identification and import.

**Independent Test**: Enter ISBN "978-0-7432-7356-5", view exact matching book, import it, verify it appears in database.

### Backend Implementation for US4

- [ ] T085 [US4] Add ISBN search to SearchService in backend/src/services/SearchService.ts (query Hardcover API by ISBN)

### Frontend Implementation for US4

- [ ] T086 [US4] Update SearchBar component to support ISBN search type in frontend/src/components/common/SearchBar.vue
- [ ] T087 [US4] Update SearchPage to handle ISBN results in frontend/src/pages/SearchPage.vue

**Checkpoint**: ISBN search should work independently

---

## Phase 7: User Story 5 - Mark Books as Deleted (Priority: P2)

**Goal**: Enable readers to soft-delete books from their collection while preventing re-import and maintaining data integrity.

**Independent Test**: View any book, click "Delete", verify it no longer appears on author page, confirm it shows "Deleted" indicator in search results, verify it's not re-imported when updating author's books.

### Backend Implementation for US5

- [ ] T088 [US5] Create PATCH /api/books/:id endpoint in backend/src/api/routes/books.ts (update book deletion status)
- [ ] T089 [US5] Add deletion logic to BookService in backend/src/services/BookService.ts (soft delete, prevent re-import)
- [ ] T090 [US5] Update SearchService to include deleted books in results with indicator in backend/src/services/SearchService.ts
- [ ] T091 [US5] Update AuthorService to filter deleted books from author pages in backend/src/services/AuthorService.ts

### Frontend Implementation for US5

- [ ] T092 [P] [US5] Add delete button to BookCard component in frontend/src/components/books/BookCard.vue
- [ ] T093 [US5] Update StatusBadge to show "Deleted" indicator in frontend/src/components/common/StatusBadge.vue
- [ ] T094 [US5] Update AuthorPage to filter deleted books in frontend/src/pages/AuthorPage.vue

**Checkpoint**: Soft deletion should work across all views

---

## Phase 8: Additional Features & Polish

**Purpose**: Complete remaining endpoints and cross-cutting concerns

### Ownership Scanning

**Note**: OwnershipScanner service (T035) is foundational and used throughout user stories. These tasks add a manual trigger endpoint for convenience.

- [ ] T095 [P] Create POST /api/ownership/scan endpoint in backend/src/api/routes/ownership.ts (trigger manual filesystem scan)
- [ ] T096 Add ownership routes to Express app in backend/src/app.ts

### Manual Ownership Override

- [ ] T097 Add manual ownership override to PATCH /api/books/:id in backend/src/api/routes/books.ts
- [ ] T098 Update BookService to handle manual ownership source in backend/src/services/BookService.ts
- [ ] T099 [P] Create OwnershipToggle component in frontend/src/components/books/OwnershipToggle.vue (button to manually mark as owned)
- [ ] T100 Add OwnershipToggle to BookCard in frontend/src/components/books/BookCard.vue

### Error Handling & Validation

- [ ] T101 Add request validation middleware in backend/src/api/middleware/validateRequest.ts (using Zod or similar)
- [ ] T102 Add error boundary component in frontend/src/components/common/ErrorBoundary.vue
- [ ] T103 Create error notification system in frontend/src/components/common/NotificationToast.vue

### UI Polish

- [ ] T104 [P] Create loading spinner component in frontend/src/components/common/LoadingSpinner.vue
- [ ] T105 [P] Create pagination component in frontend/src/components/common/Pagination.vue (50 results per page)
- [ ] T106 Add pagination to SearchPage in frontend/src/pages/SearchPage.vue
- [ ] T107 Add responsive design styles to all components
- [ ] T108 Create app header/navigation in frontend/src/components/common/AppHeader.vue

### Documentation & Scripts

- [ ] T109 Create npm scripts in root package.json (dev, build, test, lint, format)
- [ ] T110 Create database migration script in backend/package.json
- [ ] T111 Create README.md with quickstart instructions (points to specs/001-book-tracker/quickstart.md for detailed setup)
- [ ] T112 Verify all quickstart.md steps work correctly

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-7)**: All depend on Foundational phase completion
  - User Story 1 (P1): Can start immediately after Foundational
  - User Story 2 (P2): Can start after Foundational (integrates with US1 but independently testable)
  - User Story 3 (P3): Can start after Foundational (integrates with US1/US2 but independently testable)
  - User Story 4 (P3): Can start after Foundational (extends US1 search)
  - User Story 5 (P2): Can start after Foundational (modifies US1/US2/US3 behavior)
- **Polish (Phase 8)**: Depends on desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Foundation only - no dependencies on other stories
- **User Story 2 (P2)**: Foundation only - reuses US1 models/services but independently testable
- **User Story 3 (P3)**: Foundation only - extends US2 author pages but independently testable
- **User Story 4 (P3)**: Foundation only - extends US1 search but independently testable
- **User Story 5 (P2)**: Foundation only - modifies all stories but independently testable

### Within Each User Story

- Setup tasks (Phase 1) can all run in parallel [P]
- Foundational tasks follow order: Database → Types → Backend Core → Frontend Core → Testing
- Within user stories: Models [P] → Services → Routes → Components [P] → Pages → Integration
- All tasks marked [P] can run in parallel

### Parallel Opportunities

**Setup Phase**:
- All configuration files (T005-T020) can be created in parallel

**Foundational Phase**:
- T025-T028 (Shared types and queries) can run in parallel
- T032-T035 (Backend middleware and services) can run in parallel after T029-T031
- T037-T040 (Frontend infrastructure) can run in parallel

**User Story 1**:
- T045-T047 (Models) can run in parallel
- T054-T056 (Frontend components) can run in parallel

**User Story 2**:
- T067 can run in parallel with T068-T069 updates

**User Story 3**:
- T079-T080 (New components) can run in parallel

**User Story 5**:
- T092 can run in parallel with T093

**Polish Phase**:
- T095-T096, T099-T100, T104-T105 can all run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all models for User Story 1 together:
Task: "Create Author model in backend/src/models/Author.ts"
Task: "Create Book model in backend/src/models/Book.ts"
Task: "Create BookAuthor model in backend/src/models/BookAuthor.ts"

# After models complete, launch all frontend components together:
Task: "Create SearchBar component in frontend/src/components/common/SearchBar.vue"
Task: "Create BookCard component in frontend/src/components/books/BookCard.vue"
Task: "Create StatusBadge component in frontend/src/components/common/StatusBadge.vue"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T020)
2. Complete Phase 2: Foundational (T021-T044) - CRITICAL, blocks all stories
3. Complete Phase 3: User Story 1 (T045-T061)
4. **STOP and VALIDATE**: Test User Story 1 independently
   - Search for "The Great Gatsby"
   - Import the book
   - Verify ownership status from filesystem
   - Test already imported indicator
5. Deploy/demo if ready

### Incremental Delivery (Recommended)

1. **Foundation** (Phases 1-2) → Foundation ready
2. **MVP** (Phase 3: User Story 1) → Test independently → Deploy/Demo
   - Core value: Search and import books by title
3. **Expansion** (Phase 4: User Story 2) → Test independently → Deploy/Demo
   - Added value: Bulk import author bibliographies
4. **Management** (Phase 5: User Story 3) → Test independently → Deploy/Demo
   - Added value: Edit authors, refresh books, bulk actions
5. **Enhancement** (Phase 6: User Story 4 + Phase 7: User Story 5) → Test independently → Deploy/Demo
   - Added value: ISBN search + soft deletion
6. **Polish** (Phase 8) → Final testing → Production deploy

### Parallel Team Strategy

With multiple developers after Foundation (Phase 2) completes:

- **Developer A**: User Story 1 (T045-T061)
- **Developer B**: User Story 2 (T062-T073)
- **Developer C**: User Story 5 (T088-T094) - affects all stories but independently testable

Stories integrate but remain independently completable and testable.

---

## Task Summary

- **Total Tasks**: 112
- **Setup Phase**: 20 tasks (T001-T020)
- **Foundational Phase**: 24 tasks (T021-T044) - BLOCKS all user stories
- **User Story 1 (P1)**: 17 tasks (T045-T061) - MVP
- **User Story 2 (P2)**: 12 tasks (T062-T073)
- **User Story 3 (P3)**: 11 tasks (T074-T084)
- **User Story 4 (P3)**: 3 tasks (T085-T087)
- **User Story 5 (P2)**: 7 tasks (T088-T094)
- **Polish Phase**: 18 tasks (T095-T112)

**Parallel Opportunities**: 45 tasks marked [P] can run in parallel with other tasks in their phase

**Suggested MVP Scope**: Phases 1-3 (T001-T061) = 61 tasks = Core search and import functionality

---

## Notes

- **[P] tasks**: Different files, no dependencies, can run in parallel
- **[Story] labels**: Map tasks to specific user stories for traceability (US1, US2, US3, US4, US5)
- **Independent stories**: Each user story can be implemented, tested, and deployed independently
- **Foundation is blocking**: Phase 2 MUST complete before ANY user story work begins
- **Tests not included**: No test tasks generated as tests were not explicitly requested in spec.md
- **Manual ownership**: Implemented in Polish phase (T097-T100) as it extends User Story 1
- **Commit strategy**: Commit after each task or logical group
- **Validation checkpoints**: Stop after each user story phase to validate independently
