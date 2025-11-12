# Tasks: Authors Homepage

**Input**: Design documents from `/home/mrdth/Development/book-tracker/specs/002-authors-homepage/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in specification - test tasks excluded per template guidelines

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `- [ ] [ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

This is a monorepo with:
- Backend: `backend/src/`
- Frontend: `frontend/src/`
- Shared: `shared/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and database schema updates

- [X] T001 Create migration file `backend/src/db/migrations/003_add_author_sort_name.sql` to add sort_name column and index
- [X] T002 [P] Create name parser utility `backend/src/utils/nameParser.ts` with generateSortName function
- [X] T003 Create backfill script `backend/src/db/backfillSortNames.ts` to populate sort_name for existing authors
- [X] T004 Run migration and backfill script to update database schema
- [X] T005 [P] Install frontend dependencies: @vueuse/core and vue-virtual-scroller@next

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 Update `backend/src/models/Author.ts` to include sortName field in Author interface
- [X] T007 Update `backend/src/models/Author.ts` create method to generate and store sort_name on author creation
- [X] T008 Update `backend/src/models/Author.ts` update method to regenerate sort_name when name changes
- [X] T009 Update `backend/src/models/Author.ts` findAll method to sort by sort_name COLLATE NOCASE

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Browse Authors List (Priority: P1) 🎯 MVP

**Goal**: Display a sortable, browsable list of all authors with their basic information and book counts

**Independent Test**: Navigate to homepage and verify authors list displays with names, photos, bios, and book counts sorted by last name, then first name

### Backend Implementation for User Story 1

- [X] T010 [US1] Create POST /api/authors/list endpoint in `backend/src/api/routes/authors.ts` with cursor-based pagination
- [X] T011 [US1] Add request validation for cursor, letterFilter, and limit parameters in `backend/src/api/routes/authors.ts`
- [X] T012 [US1] Implement SQL query with cursor-based pagination using row value comparisons in `backend/src/api/routes/authors.ts`
- [X] T013 [US1] Add book count subquery to authors list endpoint in `backend/src/api/routes/authors.ts`
- [X] T014 [US1] Add logging for API requests and responses in `backend/src/api/routes/authors.ts`

### Frontend Implementation for User Story 1

- [X] T015 [P] [US1] Create TypeScript interfaces for Author and pagination types in `shared/src/types/author.ts`
- [X] T016 [P] [US1] Create useAuthorsList composable in `frontend/src/composables/useAuthorsList.ts` with pagination state management
- [X] T017 [P] [US1] Create AuthorCard component in `frontend/src/components/authors/AuthorCard.vue` with photo, name, bio, and book count display
- [X] T018 [US1] Implement bio truncation to 3 lines using CSS line-clamp with ellipsis in `frontend/src/components/authors/AuthorCard.vue`
- [X] T018a [US1] Add click handler to expand bio in-place to show full text in `frontend/src/components/authors/AuthorCard.vue`
- [X] T018b [US1] Implement name truncation at 50 characters with ellipsis and full name in HTML title tooltip in `frontend/src/components/authors/AuthorCard.vue`
- [X] T019 [US1] Add circular photo styling and placeholder for missing photos in `frontend/src/components/authors/AuthorCard.vue`
- [X] T020 [US1] Display "No biography available" message for empty bios in `frontend/src/components/authors/AuthorCard.vue`
- [X] T021 [US1] Create AuthorsHomePage component in `frontend/src/pages/AuthorsHomePage.vue` with virtual scrolling setup
- [X] T022 [US1] Integrate DynamicScroller from vue-virtual-scroller in `frontend/src/pages/AuthorsHomePage.vue`
- [X] T023 [US1] Implement scroll event handler to trigger loadMore in `frontend/src/pages/AuthorsHomePage.vue`
- [X] T024 [US1] Add loading indicator for initial page load in `frontend/src/pages/AuthorsHomePage.vue`
- [X] T025 [US1] Add error state display with retry button in `frontend/src/pages/AuthorsHomePage.vue`
- [X] T026 [US1] Add empty state message for no authors in `frontend/src/pages/AuthorsHomePage.vue`
- [X] T027 [US1] Update router configuration in `frontend/src/router/index.ts` to add authors homepage route at "/"

**Checkpoint**: At this point, User Story 1 should be fully functional - users can browse paginated authors list sorted by last name

---

## Phase 4: User Story 2 - Navigate Large Author Lists (Priority: P2)

**Goal**: Efficiently load and scroll through potentially thousands of authors without performance degradation

**Independent Test**: Scroll through authors list and verify additional authors load automatically without manual pagination, page remains responsive

### Implementation for User Story 2

- [X] T028 [US2] Add hasMore state tracking to useAuthorsList composable in `frontend/src/composables/useAuthorsList.ts`
- [X] T029 [US2] Implement automatic loading on scroll to bottom in `frontend/src/pages/AuthorsHomePage.vue`
- [X] T030 [US2] Add loading indicator for pagination loads in `frontend/src/pages/AuthorsHomePage.vue`
- [X] T031 [US2] Add end-of-list indicator when all authors loaded in `frontend/src/pages/AuthorsHomePage.vue`
- [X] T032 [US2] Configure virtual scroller min-item-size and size-dependencies in `frontend/src/pages/AuthorsHomePage.vue`
- [X] T033 [US2] Implement scroll position stability during loading in `frontend/src/pages/AuthorsHomePage.vue`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - infinite scroll pagination is functional

---

## Phase 5: User Story 3 - Filter Authors Alphabetically (Priority: P2)

**Goal**: Quick navigation to authors whose last names start with a specific letter via A-Z navigation links

**Independent Test**: Click any letter (A-Z) and verify list filters to show only authors whose last names start with that letter

### Backend Implementation for User Story 3

- [X] T034 [US3] Add letterFilter support to SQL query in `backend/src/api/routes/authors.ts` using LIKE clause
- [X] T035 [US3] Add letterFilter validation (single A-Z character) in `backend/src/api/routes/authors.ts`

### Frontend Implementation for User Story 3

- [X] T036 [P] [US3] Create AlphabetFilter component in `frontend/src/components/authors/AlphabetFilter.vue` with A-Z buttons
- [X] T037 [US3] Add "All" button to clear filter in `frontend/src/components/authors/AlphabetFilter.vue`
- [X] T038 [US3] Implement visual highlighting for selected letter in `frontend/src/components/authors/AlphabetFilter.vue`
- [X] T039 [US3] Add letterFilter state to AuthorsHomePage in `frontend/src/pages/AuthorsHomePage.vue`
- [X] T040 [US3] Integrate AlphabetFilter component in `frontend/src/pages/AuthorsHomePage.vue`
- [X] T041 [US3] Implement filter reset logic in useAuthorsList composable in `frontend/src/composables/useAuthorsList.ts`
- [X] T042 [US3] Add watcher to reset pagination when letterFilter changes in `frontend/src/composables/useAuthorsList.ts`
- [X] T043 [US3] Update empty state message to show "No authors found for letter X" in `frontend/src/pages/AuthorsHomePage.vue`

**Checkpoint**: All primary user stories complete - browsing, pagination, and filtering all functional

---

## Phase 6: User Story 4 - Navigate Between Pages (Priority: P3)

**Goal**: Consistent navigation bar appears across all pages enabling access to other application sections

**Independent Test**: Navigate to homepage and verify navigation bar is present with links, clicking links navigates to corresponding pages

### Implementation for User Story 4

- [X] T044 [US4] Update App.vue to add persistent navigation bar outside router-view in `frontend/src/App.vue`
- [X] T045 [US4] Add RouterLink components for Authors and Search in `frontend/src/App.vue`
- [X] T046 [US4] Implement active page highlighting using route.path in `frontend/src/App.vue`
- [X] T047 [US4] Add ARIA labels and accessibility attributes to navigation in `frontend/src/App.vue`
- [X] T048 [US4] Style navigation bar with Tailwind CSS (shadow, hover states, focus indicators) in `frontend/src/App.vue`
- [X] T049 [US4] Add aria-current="page" attribute to active link in `frontend/src/App.vue`

**Checkpoint**: All user stories complete - navigation bar provides consistent access to all sections

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T050 [P] Add error handling for network timeout (10 seconds) in `frontend/src/composables/useAuthorsList.ts`
- [ ] T051 [P] Verify 3-line bio truncation with CSS line-clamp and click-to-expand works correctly in `frontend/src/components/authors/AuthorCard.vue`
- [ ] T051a [P] Verify name truncation at 50 characters with tooltip displays full name in `frontend/src/components/authors/AuthorCard.vue`
- [ ] T052 [P] Test circular photo styling and default placeholder display in `frontend/src/components/authors/AuthorCard.vue`
- [ ] T053 [P] Verify cursor-based pagination maintains performance at 10,000+ authors
- [ ] T054 [P] Test alphabetical filtering with all letters including edge cases (Q, X, Z)
- [ ] T055 [P] Verify virtual scrolling reduces memory usage and maintains smooth scrolling
- [ ] T056 [P] Test keyboard navigation and focus management for accessibility
- [ ] T057 Validate all success criteria from spec.md are met
- [ ] T058 Run through complete user journey from quickstart.md for validation
- [ ] T059 Code cleanup and remove any console.log statements
- [ ] T060 Final linting and formatting pass: npm test && npm run lint

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-6)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P2 → P3)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Depends on User Story 1 completion - extends pagination functionality
- **User Story 3 (P2)**: Depends on User Story 1 completion - adds filtering to existing list
- **User Story 4 (P3)**: Can start after Foundational (Phase 2) - Independent navigation component

### Within Each User Story

- Backend endpoints before frontend integration
- Composables and utilities before components
- Base components (AuthorCard) before page components (AuthorsHomePage)
- Core functionality before edge case handling
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 1 - Setup:**
- T002 (nameParser.ts) and T005 (install dependencies) can run in parallel

**Phase 2 - Foundational:**
- All T006-T009 must be done in sequence (same file modifications)

**User Story 1:**
- T015 (types), T016 (composable), T017 (AuthorCard) can start in parallel
- Backend tasks (T010-T014) can run parallel to frontend tasks (T015-T027)

**User Story 3:**
- T034-T035 (backend) parallel to T036-T038 (AlphabetFilter component)

**User Story 4:**
- All tasks are in App.vue, must run sequentially

**Phase 7 - Polish:**
- T050-T056 can all run in parallel (different concerns)

---

## Parallel Example: User Story 1

```bash
# Backend and frontend can proceed in parallel:

# Backend Team:
Task T010: "Create POST /api/authors/list endpoint"
Task T011: "Add request validation"
Task T012: "Implement SQL query with cursor pagination"
Task T013: "Add book count subquery"
Task T014: "Add logging"

# Frontend Team (parallel to backend):
Task T015: "Create TypeScript interfaces"
Task T016: "Create useAuthorsList composable"
Task T017: "Create AuthorCard component"

# Once both complete, integrate:
Task T021-T027: "Create AuthorsHomePage and integrate components"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T005)
2. Complete Phase 2: Foundational (T006-T009) - CRITICAL - blocks all stories
3. Complete Phase 3: User Story 1 (T010-T027)
4. **STOP and VALIDATE**: Test User Story 1 independently
   - Navigate to homepage
   - Verify authors display sorted by last name
   - Verify photos, bios, book counts display correctly
   - Verify empty states and error handling
5. Deploy/demo if ready - **This is your MVP!**

### Incremental Delivery

1. **Setup + Foundational** (T001-T009) → Database ready, models updated
2. **+ User Story 1** (T010-T027) → Test independently → Deploy/Demo (**MVP - Browse authors list**)
3. **+ User Story 2** (T028-T033) → Test independently → Deploy/Demo (**Infinite scroll pagination**)
4. **+ User Story 3** (T034-T043) → Test independently → Deploy/Demo (**A-Z filtering**)
5. **+ User Story 4** (T044-T049) → Test independently → Deploy/Demo (**Navigation bar**)
6. **+ Polish** (T050-T060) → Final validation → Production ready

Each story adds value without breaking previous stories.

### Parallel Team Strategy

With multiple developers:

1. **Team completes Setup + Foundational together** (T001-T009)
2. **Once Foundational is done:**
   - **Developer A**: User Story 1 Backend (T010-T014)
   - **Developer B**: User Story 1 Frontend (T015-T027)
   - **Developer C**: User Story 4 Navigation (T044-T049) - can start early, independent
3. **After User Story 1 complete:**
   - **Developer A**: User Story 2 Pagination (T028-T033)
   - **Developer B**: User Story 3 Filtering (T034-T043)
4. **Stories integrate and test independently**

---

## Task Summary

**Total Tasks**: 63

**By Phase**:
- Phase 1 (Setup): 5 tasks
- Phase 2 (Foundational): 4 tasks
- Phase 3 (User Story 1): 21 tasks
- Phase 4 (User Story 2): 6 tasks
- Phase 5 (User Story 3): 10 tasks
- Phase 6 (User Story 4): 6 tasks
- Phase 7 (Polish): 11 tasks

**By User Story**:
- US1 (Browse Authors List): 21 tasks
- US2 (Navigate Large Lists): 6 tasks
- US3 (Filter Alphabetically): 10 tasks
- US4 (Navigate Between Pages): 6 tasks

**Parallel Opportunities**: 14 tasks marked [P] can run in parallel with other tasks

**Independent Test Criteria**:
- US1: Navigate to homepage, verify sorted authors list displays
- US2: Scroll through list, verify automatic loading works
- US3: Click letter filter, verify only matching authors show
- US4: Verify navigation bar appears with working links

**Suggested MVP Scope**: 
- Phase 1 (Setup): 5 tasks
- Phase 2 (Foundational): 4 tasks  
- Phase 3 (User Story 1): 21 tasks
- **Total MVP**: 30 tasks

This delivers a functional authors homepage with sorted, paginated list - ready for user validation.

---

## Success Criteria Validation

After completing all tasks, verify these measurable outcomes from spec.md:

- [ ] **SC-001**: Users can view the complete authors list with names, photos, bios, and book counts within 3 seconds of loading the homepage
- [ ] **SC-002**: Users can navigate to any author by letter (A-Z) in a single click
- [ ] **SC-003**: System displays additional authors within 500ms when user scrolls to bottom of current list
- [ ] **SC-004**: Homepage remains responsive and usable with collections containing 10,000+ authors
- [ ] **SC-005**: Navigation bar provides access to all major application sections from any page
- [ ] **SC-006**: 95% of users can find a specific author within 10 seconds using the alphabetical navigation

---

## Notes

- **[P] tasks**: Different files, no dependencies - safe to parallelize
- **[Story] label**: Maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group of related tasks
- Stop at any checkpoint to validate story independently before proceeding
- Tests excluded: Not explicitly requested in spec.md per template guidelines
- Virtual scrolling is mandatory for performance at 10,000+ authors (research.md)
- Cursor-based pagination required for consistent <500ms performance (research.md)
