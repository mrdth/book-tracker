# Feature Specification: Author Deletion

**Feature Branch**: `003-author-deletion`  
**Created**: 2025-11-15  
**Status**: Draft  
**Input**: User description: "I'd like to add a new feature: Author Deletion. When viewing an author page, there should be a 'Delete' button alongside the 'Edit' & 'Update' buttons. Clicking this will prompt for confirmation, and then remove the author, and all of their books from the database"

## Clarifications

### Session 2025-11-15

- Q: When deleting an author who co-authored books with other authors, should those co-authored books be deleted or preserved? → A: Delete only books where this is the sole author; remove author association from co-authored books
- Q: Should deletion events be logged with author details and book counts for audit purposes? → A: No logging required; deletions are permanent without audit trail
- Q: What are the performance and scale limits for author deletion (maximum books, timeouts)? → A: No maximum limit; rely on database performance without explicit timeout
- Q: How should the system handle concurrent delete operations when bulk operations are in progress? → A: Prevent concurrent operations; disable Delete button during bulk operations with informative message
- Q: What styling and placement should the Delete button have? → A: Destructive/danger styling (red) placed after Edit and Update in same button group

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Delete Author with Confirmation (Priority: P1)

A user viewing an author's page wants to permanently remove that author and all their books from their library. They click a clearly visible Delete button (styled as a destructive action), confirm their intention, and the system removes the author. Books solely authored by this author are deleted, while co-authored books remain but have this author's association removed. The user is then redirected to the authors list page.

**Why this priority**: This is the core functionality of the feature - enabling users to remove unwanted authors and their associated books from their library. Without this, the feature has no value.

**Independent Test**: Can be fully tested by navigating to any author page, clicking the Delete button, confirming the action, and verifying that the author and their sole-authored books are removed from the database while co-authored books remain, and the user is redirected to the authors list.

**Acceptance Scenarios**:

1. **Given** a user is viewing an author page with the author having 5 sole-authored books, **When** they click the Delete button and confirm the deletion, **Then** the author and all 5 books are permanently removed from the database and the user is redirected to the authors list page
2. **Given** a user is viewing an author page, **When** they click the Delete button but cancel the confirmation, **Then** no changes are made and the author page remains displayed
3. **Given** a user is viewing an author page for an author with 0 books, **When** they click the Delete button and confirm, **Then** the author is removed from the database and the user is redirected to the authors list page
4. **Given** a user is viewing an author page with 3 sole-authored books and 2 co-authored books, **When** they click the Delete button and confirm, **Then** the author and the 3 sole-authored books are removed, the 2 co-authored books remain with the author association removed, and the user is redirected to the authors list page
5. **Given** a bulk operation is in progress on the author's books, **When** the user attempts to click the Delete button, **Then** the button is disabled and an informative message explains that deletion is unavailable during bulk operations

---

### User Story 2 - Clear Deletion Feedback (Priority: P2)

When a user confirms deletion of an author, the system provides clear confirmation messaging that explains what will be deleted (author name and number of books) before the action is executed.

**Why this priority**: Prevents accidental deletions by ensuring users understand the scope of the deletion action. Important for user experience but secondary to the core delete functionality.

**Independent Test**: Can be tested by clicking the Delete button and verifying that the confirmation dialog displays the author's name and book count before any deletion occurs.

**Acceptance Scenarios**:

1. **Given** a user clicks the Delete button for an author with 10 sole-authored books, **When** the confirmation dialog appears, **Then** it displays the author's name and indicates that 10 books will also be deleted
2. **Given** a user clicks the Delete button for an author with 1 sole-authored book, **When** the confirmation dialog appears, **Then** it uses proper singular grammar (e.g., "1 book" not "1 books")
3. **Given** a user clicks the Delete button for an author with 0 books, **When** the confirmation dialog appears, **Then** it clearly states that only the author will be deleted
4. **Given** a user clicks the Delete button for an author with 3 sole-authored books and 2 co-authored books, **When** the confirmation dialog appears, **Then** it indicates that 3 books will be deleted and 2 co-authored books will be updated to remove the author association

---

### User Story 3 - Graceful Error Handling (Priority: P3)

When deletion fails due to network issues or database errors, the system displays a clear error message, keeps the user on the author page, and does not perform a partial deletion.

**Why this priority**: Ensures data integrity and good user experience during error conditions. Less critical than core functionality but important for production readiness.

**Independent Test**: Can be tested by simulating a database error during deletion and verifying that an appropriate error message is shown and no partial deletion occurs.

**Acceptance Scenarios**:

1. **Given** a deletion request fails due to a database error, **When** the error occurs, **Then** the user sees an error message, remains on the author page, and no data is deleted
2. **Given** a deletion request is in progress, **When** the network connection is lost, **Then** the system displays a network error message and no partial deletion occurs

---

### Edge Cases

- What happens when attempting to delete an author that has already been deleted by another session? → System should gracefully handle the missing author with an appropriate error message.
- What happens when the author has a very large number of books (e.g., 1000+)? → System relies on database performance; deletion proceeds without artificial timeout limits.
- How does the system handle deletion when the user navigates away during the deletion process? → Deletion operation continues on backend; user can verify completion by returning to authors list.
- What happens if the user has multiple browser tabs open with the same author page and deletes from one? → Other tabs will show error if they attempt actions on the deleted author; refresh will redirect to 404 or authors list.
- What happens when attempting to delete an author while bulk operations on their books are in progress? → Delete button is disabled with informative message; deletion prevented until bulk operations complete.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a Delete button on the author page in the same button group as Edit and Update buttons, positioned after them
- **FR-002**: Delete button MUST use destructive/danger styling (red or warning color scheme) to visually distinguish it from non-destructive actions
- **FR-003**: System MUST display a confirmation dialog when the Delete button is clicked, before any deletion occurs
- **FR-004**: Confirmation dialog MUST clearly state the author's name and the number of books that will be deleted or updated (for co-authored books)
- **FR-005**: System MUST use proper singular/plural grammar in confirmation messages (e.g., "1 book" vs "2 books")
- **FR-006**: System MUST allow users to cancel the deletion from the confirmation dialog without making any changes
- **FR-007**: System MUST permanently remove the author record from the database when deletion is confirmed
- **FR-008**: System MUST permanently remove all books where the deleted author is the sole author
- **FR-009**: System MUST preserve co-authored books (books with multiple authors) and only remove the deleted author's association from the book_authors junction table
- **FR-010**: System MUST perform deletion as an atomic operation (all or nothing - no partial deletions)
- **FR-011**: System MUST redirect users to the authors list page after successful deletion
- **FR-012**: System MUST display a clear error message if deletion fails and keep the user on the author page
- **FR-013**: System MUST show appropriate loading state on the Delete button while deletion is in progress
- **FR-014**: System MUST disable the Delete button during the deletion process to prevent duplicate requests
- **FR-015**: System MUST handle deletion of authors with zero books without errors
- **FR-016**: System MUST NOT impose artificial timeout limits on deletion operations; rely on database transaction performance
- **FR-017**: System MUST disable the Delete button when bulk operations are in progress on the author's books
- **FR-018**: System MUST display an informative message explaining why deletion is unavailable when concurrent bulk operations are detected

### Key Entities *(include if feature involves data)*

- **Author**: Represents a book author with attributes including id, external_id, name, bio, photo_url. Related to books via the book_authors junction table. Deletion removes the author record and cascades to remove all book_authors associations.
- **Book**: Represents a book with attributes including id, external_id, title, isbn, description, cover_url, owned status, deleted flag. Related to authors via the book_authors junction table. Books are permanently removed only if the deleted author was the sole author; co-authored books are preserved.
- **BookAuthor**: Junction table linking books to authors with attributes book_id, author_id, author_order. When an author is deleted, all their book_authors entries are removed. Books with no remaining authors (sole-authored books) are then permanently deleted.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can successfully delete an author and all associated sole-authored books in under 5 seconds for authors with up to 100 books
- **SC-002**: Zero partial deletions occur (either author and all sole-authored books are deleted with co-authored books updated, or nothing is changed)
- **SC-003**: 100% of deletion attempts either complete successfully or fail with a clear error message (no silent failures)
- **SC-004**: Users can cancel the deletion action from the confirmation dialog 100% of the time without any data being modified
- **SC-005**: Confirmation dialogs display the correct author name and accurate counts for books to be deleted vs co-authored books to be updated in 100% of cases
- **SC-006**: Users are successfully redirected to the authors list page within 1 second after deletion completes
- **SC-007**: Deletion operations handle authors with any number of books without artificial performance limits
- **SC-008**: 100% of concurrent operation conflicts are prevented by disabling the Delete button with clear user feedback
- **SC-009**: Delete button is visually distinguishable from non-destructive actions through color/styling in 100% of UI implementations
