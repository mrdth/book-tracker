# Tasks: Author Deletion

**Input**: Design documents from `/specs/003-author-deletion/`  
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/author-deletion-api.md

**Total Tasks**: 42 (T001-T041 + T006.5)

**Tests**: Not explicitly requested in spec - tasks focus on implementation only

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`
- Backend: TypeScript with Express, better-sqlite3
- Frontend: Vue 3 with TypeScript

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure (already complete - no tasks needed)

All infrastructure already exists:
- ✅ Backend API routes pattern established
- ✅ Frontend page and component structure in place
- ✅ Database schema with CASCADE DELETE constraints
- ✅ Error handling middleware
- ✅ Logger infrastructure

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core enhancements that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T001 [P] Add `getBookDeletionInfo()` method to `backend/src/models/Author.ts` that returns categorization of books by authorship (sole vs co-authored) with book IDs and counts
- [X] T002 [P] Enhance `delete()` method in `backend/src/models/Author.ts` to support hard delete operation (method exists but marked unused)
- [X] T003 [P] Add `deleteAuthor()` method to `backend/src/services/AuthorService.ts` that implements atomic deletion with transaction handling for author and sole-authored books

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Delete Author with Confirmation (Priority: P1) 🎯 MVP

**Goal**: Enable users to permanently delete an author and their books (sole-authored books deleted, co-authored books preserved) with atomic operation guarantee

**Independent Test**: Navigate to author page → click Delete button → confirm → verify author and sole-authored books removed from database, co-authored books preserved → verify redirect to authors list

### Backend Implementation for User Story 1

- [X] T004 [US1] Implement DELETE `/api/authors/:id` endpoint in `backend/src/api/routes/authors.ts` that validates author ID, calls `AuthorService.deleteAuthor()`, and returns deletion summary (deleted/preserved counts)
- [X] T005 [US1] Add error handling in DELETE endpoint for 404 (author not found) and 500 (database errors) scenarios in `backend/src/api/routes/authors.ts`
- [X] T006 [US1] Add INFO logging for deletion requests and results in `AuthorService.deleteAuthor()` method in `backend/src/services/AuthorService.ts`
- [X] T006.5 [US1] Add GET `/api/authors/:id/deletion-info` endpoint in `backend/src/api/routes/authors.ts` that queries book categorization using `AuthorModel.getBookDeletionInfo()` and returns `{soleAuthoredBookCount: number, coAuthoredBookCount: number}` for confirmation modal display

### Frontend Implementation for User Story 1

- [X] T007 [P] [US1] Create `DeleteAuthorModal.vue` component in `frontend/src/components/authors/` following EditAuthorModal pattern with the following interface:
  - **Props**: `author: Author | null`, `open: boolean`, `soleAuthoredBookCount: number`, `coAuthoredBookCount: number`
  - **Emits**: `@close` (when user cancels or closes modal), `@confirm` (when user confirms deletion)
  - **Structure**: Modal dialog with author name display, book count breakdown, destructive confirm button ("Delete Author"), cancel button, loading state support, Escape key handler, click-outside-to-close
- [X] T008 [P] [US1] Implement modal UI in `DeleteAuthorModal.vue` with author name display, book counts, confirm/cancel buttons, and loading state
- [X] T009 [P] [US1] Add `deleteAuthor(authorId: number)` method to `frontend/src/services/api.ts` that calls DELETE endpoint and returns deletion result
  - **Method Signature**: `async deleteAuthor(authorId: number): Promise<{message: string, deletedAuthorId: number, deletedBooksCount: number, preservedBooksCount: number}>`
  - **Error Handling**: Throws Error with `message` property on failure (HTTP 4xx/5xx), including parsed error message from API response or generic "Failed to delete author" fallback
  - **Implementation**: Calls `DELETE /api/authors/:id`, validates response, extracts counts from JSON body
- [X] T010 [US1] Add Delete button to `frontend/src/pages/AuthorPage.vue` in header actions section after Edit and Update buttons with destructive styling (red color)
- [X] T011 [US1] Add state management in `AuthorPage.vue` for modal visibility (`isDeleteModalOpen` ref) and deletion in progress (`isDeleting` ref)
- [X] T012 [US1] Implement `handleDeleteClick()` in `AuthorPage.vue` that fetches book categorization and opens DeleteAuthorModal with counts
- [X] T013 [US1] Implement `handleDeleteConfirm()` in `AuthorPage.vue` that calls `apiClient.deleteAuthor()`, handles success (redirect to /authors), and handles errors (display message, stay on page)
- [X] T014 [US1] Add loading state to Delete button in `AuthorPage.vue` showing spinner during deletion operation (disabled while `isDeleting === true`)
- [X] T015 [US1] Implement redirect to authors list page using `router.push('/authors')` on successful deletion in `AuthorPage.vue`

**Checkpoint**: At this point, User Story 1 should be fully functional - users can delete authors with confirmation, see proper feedback, and get redirected

---

## Phase 4: User Story 2 - Clear Deletion Feedback (Priority: P2)

**Goal**: Provide rich confirmation messaging showing exact deletion impact (author name, sole-authored book count, co-authored book count) with proper singular/plural grammar

**Independent Test**: Click Delete on author with mixed books → verify modal shows author name, correct counts ("1 book" vs "2 books"), and explains co-authored book handling

### Implementation for User Story 2

- [X] T016 [P] [US2] Add grammar helper function `formatBookCount()` in `DeleteAuthorModal.vue` that returns proper singular/plural text (e.g., "1 book", "2 books", "0 books")
- [X] T017 [US2] Update `DeleteAuthorModal.vue` to display detailed message explaining what will be deleted vs preserved: "{author name} will be deleted. {N} book(s) will be deleted. {M} co-authored book(s) will be preserved."
- [X] T018 [US2] Add conditional rendering in `DeleteAuthorModal.vue` to show different message when author has 0 books: "Only the author will be deleted"
- [X] T019 [US2] Enhance `getBookDeletionInfo()` response in `backend/src/models/Author.ts` to include exact book counts for accurate UI display
- [X] T020 [US2] Update `handleDeleteClick()` in `AuthorPage.vue` to pass accurate counts to DeleteAuthorModal based on API response

**Checkpoint**: At this point, User Stories 1 AND 2 both work - users get clear, grammatically correct information before deletion

---

## Phase 5: User Story 3 - Graceful Error Handling (Priority: P3)

**Goal**: Display clear error messages when deletion fails, keep user on page, ensure no partial deletions through transaction rollback

**Independent Test**: Simulate database error during deletion → verify error message displayed, user remains on author page, no data changed in database

### Implementation for User Story 3

- [X] T021 [P] [US3] Add comprehensive error handling in `AuthorService.deleteAuthor()` in `backend/src/services/AuthorService.ts` that wraps deletion in try-catch and logs ERROR level messages for failures
- [X] T022 [P] [US3] Ensure transaction rollback on any error in `AuthorService.deleteAuthor()` using better-sqlite3 transaction API to prevent partial deletions
- [X] T023 [US3] Update DELETE endpoint error handling in `backend/src/api/routes/authors.ts` to return appropriate HTTP status codes (404 for not found, 500 for database errors) with clear error messages
- [ ] T024 [US3] Add error state management in `DeleteAuthorModal.vue` with `errorMessage` ref to display deletion failures
- [X] T025 [US3] Update `handleDeleteConfirm()` in `AuthorPage.vue` to catch errors from `apiClient.deleteAuthor()` and display error message while keeping user on current page
- [ ] T026 [US3] Add error message display UI in `DeleteAuthorModal.vue` with red text styling and dismiss capability
- [X] T027 [US3] Handle network errors separately in `frontend/src/services/api.ts` `deleteAuthor()` method to show "Network error, please try again" for connection failures

**Checkpoint**: All user stories should now be independently functional with robust error handling

---

## Phase 6: Cross-Cutting Enhancements

**Purpose**: Additional requirements that affect multiple user stories

### Concurrent Operation Prevention

- [X] T028 [P] Update `AuthorPage.vue` to disable Delete button when `isBulkUpdating === true` or `isRefreshing === true` to prevent concurrent operations
- [ ] T029 [P] Add computed property `deleteDisabled` in `AuthorPage.vue` that returns `true` when deletion should be blocked (bulk operations active, deletion in progress)
- [ ] T030 Add tooltip or disabled button styling in `AuthorPage.vue` to show "Delete unavailable during bulk operations" when button is disabled due to concurrent operations

### Button Styling

- [X] T031 Update Delete button styling in `AuthorPage.vue` to use destructive color scheme (red background, matching existing action-button--danger or similar class pattern)
- [X] T032 Position Delete button in `AuthorPage.vue` header actions after Edit and Update buttons in the same button group

---

## Phase 7: Polish & Validation

**Purpose**: Final touches and validation

- [ ] T033 Test deletion of author with 5 sole-authored books → verify all deleted, redirect occurs
- [ ] T034 Test deletion of author with 3 sole-authored + 2 co-authored books → verify sole books deleted, co-authored books preserved
- [ ] T035 Test deletion of author with 0 books → verify author deleted, redirect occurs
- [ ] T036 Test cancellation from modal → verify no API call made, modal closes, page unchanged
- [ ] T037 Test Delete button disabled during bulk operations → verify button disabled, tooltip shown
- [ ] T038 [P] Test error scenario (simulate 404) → verify error message shown, user stays on page
- [ ] T039 [P] Verify proper singular/plural grammar in confirmation messages ("1 book" vs "2 books")
- [ ] T040 Run full quickstart.md validation scenarios
- [ ] T041 Verify Delete button uses red/destructive styling per FR-002

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Already complete - no tasks
- **Foundational (Phase 2)**: Must complete T001-T003 - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed) or sequentially by priority
- **Cross-Cutting (Phase 6)**: Can start after US1 complete
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Foundational (T001-T003) - No dependencies on other stories
- **User Story 2 (P2)**: Depends on US1 (builds on DeleteAuthorModal from T007-T008) - Enhances messaging
- **User Story 3 (P3)**: Depends on US1 (enhances error handling from T004-T015) - Can start after US1 backend complete

### Within Each User Story

**User Story 1**:
- Backend tasks (T004-T006) can start immediately after Foundational
- Frontend modal (T007-T009) can run in parallel with backend
- Frontend page integration (T010-T015) depends on modal (T007-T008) and API method (T009)

**User Story 2**:
- All tasks can run in parallel except T020 which depends on T019

**User Story 3**:
- Backend error handling (T021-T023) can run in parallel
- Frontend error handling (T024-T027) can run in parallel
- Frontend depends on backend error responses being implemented

### Parallel Opportunities

**Foundational Phase (after Phase 1)**:
- T001, T002, T003 can all run in parallel (different methods/files)

**User Story 1 - Backend**:
- T004 (endpoint), T005 (error handling), T006 (logging) can be tackled sequentially in same file

**User Story 1 - Frontend**:
```bash
# Parallel batch 1:
Task T007: Create DeleteAuthorModal.vue component
Task T008: Implement modal UI
Task T009: Add deleteAuthor() to api.ts

# Sequential batch 2 (after batch 1):
Task T010: Add Delete button to AuthorPage.vue
Task T011: Add state management
Task T012: Implement handleDeleteClick()
Task T013: Implement handleDeleteConfirm()
Task T014: Add loading state
Task T015: Implement redirect
```

**User Story 2**:
```bash
# Parallel:
Task T016: Grammar helper function
Task T017: Update modal message
Task T018: Conditional rendering
Task T019: Enhance backend response
# Then:
Task T020: Update handleDeleteClick() (depends on T019)
```

**User Story 3**:
```bash
# Parallel batch 1 (backend):
Task T021: Error handling in service
Task T022: Transaction rollback
Task T023: Endpoint error handling

# Parallel batch 2 (frontend):
Task T024: Error state in modal
Task T025: Error handling in page
Task T026: Error UI in modal
Task T027: Network error handling
```

**Cross-Cutting**:
```bash
# All can run in parallel:
Task T028: Disable button logic
Task T029: Computed property
Task T030: Tooltip/styling
Task T031: Destructive styling
Task T032: Button positioning
```

---

## Parallel Example: User Story 1 Frontend

```bash
# Launch all independent frontend components for US1:
Task: "Create DeleteAuthorModal.vue component in frontend/src/components/authors/"
Task: "Implement modal UI in DeleteAuthorModal.vue"
Task: "Add deleteAuthor(authorId) method to frontend/src/services/api.ts"

# Then integrate into AuthorPage.vue sequentially:
Task: "Add Delete button to frontend/src/pages/AuthorPage.vue"
Task: "Add state management in AuthorPage.vue"
Task: "Implement handleDeleteClick() in AuthorPage.vue"
Task: "Implement handleDeleteConfirm() in AuthorPage.vue"
Task: "Add loading state to Delete button"
Task: "Implement redirect on success"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational (T001-T003) → Backend deletion logic ready
2. Complete Phase 3: User Story 1 (T004-T015) → Core deletion feature working
3. **STOP and VALIDATE**: Test deletion end-to-end with different author types
4. Deploy/demo if ready - basic deletion feature is usable

### Incremental Delivery

1. Complete Foundational → Deletion logic ready
2. Add User Story 1 → Test independently → **MVP Deploy/Demo!**
3. Add User Story 2 → Enhanced messaging → Deploy/Demo
4. Add User Story 3 → Error handling → Deploy/Demo
5. Add Cross-Cutting → Concurrent prevention → Deploy/Demo
6. Polish → Production ready

### Parallel Team Strategy

With multiple developers:

1. Team completes Foundational together (T001-T003)
2. Once Foundational is done:
   - **Developer A**: Backend for US1 (T004-T006)
   - **Developer B**: Frontend modal for US1 (T007-T009)
   - **Developer C**: Can start on US2 frontend prep (T016-T018)
3. After US1 backend + modal done:
   - **Developer A**: US1 page integration (T010-T015)
   - **Developer B**: US2 completion (T019-T020)
   - **Developer C**: US3 backend (T021-T023)
4. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files or methods, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- No tests explicitly requested - focus on implementation
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Backend transaction ensures atomicity (no partial deletions possible)
- Frontend prevents concurrent operations via UI state
- MVP = Foundational + User Story 1 (T001-T015)
