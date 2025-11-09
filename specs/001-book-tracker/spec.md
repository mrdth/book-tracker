# Feature Specification: Book Tracker Application

**Feature Branch**: `001-book-tracker`
**Created**: 2025-11-08
**Status**: Draft
**Input**: User description: "Build a book tracker application. A user can search for an author, title, or ISBN. Searches will be performed using the Hardcover graphql API..."

## Clarifications

### Session 2025-11-08

- Q: Application access model (single-user vs multi-user)? → A: Single-user only (one person per installation, no user accounts)
- Q: Filesystem collection root path configuration? → A: provided via .env file
- Q: API rate limiting strategy for bulk operations? → A: Implement client-side rate limiting with exponential backoff
- Q: Logging and observability level? → A: Log API calls, errors, import operations, and user actions
- Q: Database storage type? → A: Local embedded database (SQLite)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Search and Import Books by Title (Priority: P1)

A reader wants to quickly find and add a specific book to their personal collection database. They search by the book's title, see matching results from the external book database, and import the book's details along with its author information.

**Why this priority**: This is the most common use case - users typically know the book title they want to track. This represents the core value proposition: finding and cataloging specific books.

**Independent Test**: Can be fully tested by searching for any book title (e.g., "The Great Gatsby"), viewing search results, selecting a book to import, and verifying the book and author appear in the local database with ownership status from filesystem check.

**Acceptance Scenarios**:

1. **Given** the user enters a book title in the search field, **When** they submit the search, **Then** a list of matching books with basic details (title, author, publish date, cover) is displayed
2. **Given** search results are displayed, **When** the results include books already in the database, **Then** those books display a clear visual indicator showing their status ("Already Imported" or "Deleted")
3. **Given** search results are displayed, **When** the user selects "Import" on a book, **Then** the book details are saved to the database and the author is imported if not already present
4. **Given** the user imports a book, **When** the system checks the filesystem collection, **Then** the book's ownership status is correctly identified by matching author name and book title against directory structure (case-insensitive)
5. **Given** a book is in the database with ownership status "not owned", **When** the user manually marks it as owned, **Then** the ownership status is updated and persists regardless of filesystem status
6. **Given** a book's author doesn't exist in the database, **When** importing the book, **Then** the author is created with available information from the external API, but their other books are not imported
7. **Given** a book's author already exists in the database, **When** importing the book, **Then** the book is associated with the existing author record

---

### User Story 2 - Search and Import Author with Complete Bibliography (Priority: P2)

A reader discovers a new author and wants to add all their books to the database at once to track which ones they've read or want to read. They search by author name, review the author's profile, and import the complete bibliography.

**Why this priority**: This is valuable for users building their collection systematically or discovering new authors, but less urgent than single-book lookup. It provides bulk import efficiency.

**Independent Test**: Can be fully tested by searching for an author name (e.g., "Agatha Christie"), viewing the list of matching authors, selecting one to import, and verifying all their books are added to the database with filesystem ownership status checked for each.

**Acceptance Scenarios**:

1. **Given** the user enters an author name in the search field, **When** they submit the search, **Then** a list of matching authors with basic information is displayed
2. **Given** search results show multiple authors, **When** the user selects "Import books" for an author, **Then** the author and all their books are imported into the database
3. **Given** books are imported for an author, **When** the system checks the filesystem, **Then** each book's ownership status is determined by matching author name and book title against directory structure (case-insensitive)
4. **Given** some of the author's books already exist in the database (including deleted ones), **When** importing the author's books, **Then** existing books are not duplicated and deleted books are not re-imported

---

### User Story 3 - Manage Author Profiles and Update Bibliographies (Priority: P3)

A reader wants to maintain accurate author information and keep bibliographies current as new books are published. They view an author's page, edit biographical information, and refresh the book list from the external API.

**Why this priority**: This is a maintenance/curation feature that enhances data quality but isn't essential for basic tracking functionality. It supports long-term collection management.

**Independent Test**: Can be fully tested by viewing any author page in the database, editing their bio, saving changes, clicking "Update from API" to import new books, and verifying both changes persist and new books appear.

**Acceptance Scenarios**:

1. **Given** the user navigates to an author's page, **When** the page loads, **Then** the author's bio and a list of their non-deleted books are displayed
2. **Given** an author page is displayed, **When** the user clicks "Edit", **Then** they can modify the author's biographical information and save changes
3. **Given** the user is viewing an author page, **When** they select "Update from API", **Then** the system fetches the latest book list and imports any new books not already in the database
4. **Given** the update process finds books that were previously deleted, **When** importing new books, **Then** deleted books remain deleted and are not re-imported
5. **Given** the user is viewing an author's book list, **When** they enable bulk action mode, **Then** checkboxes appear next to each book allowing multi-selection
6. **Given** bulk action mode is enabled and multiple books are selected, **When** the user chooses "Mark as Owned", **Then** all selected books are marked as owned simultaneously
7. **Given** bulk action mode is enabled and multiple books are selected, **When** the user chooses "Delete", **Then** all selected books are marked as deleted simultaneously

---

### User Story 4 - Search Books by ISBN (Priority: P3)

A reader has a book's ISBN (from a physical copy or recommendation) and wants to quickly add it to their collection. They search by ISBN and import the exact book.

**Why this priority**: ISBN search is precise but less common than title search. It's useful for disambiguation but not the primary discovery method for most users.

**Independent Test**: Can be fully tested by entering a valid ISBN (e.g., "978-0-7432-7356-5"), viewing the matching book result, importing it, and verifying it appears in the database with correct ownership status.

**Acceptance Scenarios**:

1. **Given** the user enters an ISBN in the search field, **When** they submit the search, **Then** the exact matching book (or books with that ISBN) is displayed
2. **Given** an ISBN search returns a result, **When** the user imports the book, **Then** the book and its author are saved to the database following the same rules as title search
3. **Given** an ISBN has no matches, **When** the search completes, **Then** a clear "No results found" message is displayed

---

### User Story 5 - Mark Books as Deleted (Priority: P2)

A reader wants to remove a book from their visible collection without losing the record (in case of re-imports). They mark a book as deleted, which hides it from author pages and prevents re-import.

**Why this priority**: Essential for data integrity and preventing clutter from unwanted imports, but secondary to the core search and import functionality.

**Independent Test**: Can be fully tested by viewing any book in the database, clicking "Delete", verifying it no longer appears on the author's page, and confirming it's not re-imported when updating the author's books from the API.

**Acceptance Scenarios**:

1. **Given** the user is viewing a book (on author page or book detail page), **When** they select "Delete", **Then** the book is marked as deleted in the database
2. **Given** a book is marked as deleted, **When** viewing the author's page, **Then** the deleted book does not appear in the book list
3. **Given** a deleted book exists, **When** importing books (via author import or API update), **Then** the deleted book is not re-imported or re-activated
4. **Given** a deleted book exists, **When** searching by title or ISBN, **Then** the deleted book appears in search results with a clear "Deleted" indicator to prevent accidental re-import

---

### Edge Cases

- **External API unavailable or error during search/import**:
  - Retry up to 3 times with exponential backoff (2s, 4s, 8s delays)
  - After retries exhausted, display user-friendly error message: "Unable to connect to Hardcover API. Please check your internet connection and try again."
  - Log error with full stack trace for debugging (FR-032)
  - Allow user to continue using locally cached data

- **Filesystem collection directory structure doesn't match expected pattern**:
  - Expected pattern: `{COLLECTION_ROOT}/Author name/Book title/` or `{COLLECTION_ROOT}/Author name/Book title (any text)/`
  - The ID in parentheses (if present) is for user organization only and is NOT the Hardcover external ID - it should be ignored
  - Ownership matching: Match books by comparing author name + book title from database against filesystem directory names
  - Handle gracefully: Skip directories that don't match 3-level pattern without crashing (FR-027)
  - Follow symlinks to actual directories (treat as regular directories)
  - Case sensitivity: Match case-insensitive for both author and title on all platforms (users may have inconsistent capitalization)
  - Extra subdirectories: Ignore any directories beyond the 3-level pattern
  - Books without parenthetical IDs: Process normally - `Author name/Book title/` is valid

- **Book has multiple authors (co-authors)**:
  - Create BookAuthor associations for all authors (FR-025)
  - Preserve author order from Hardcover API using `author_order` field
  - Display all authors in UI separated by commas

- **Author's name changes between imports**:
  - Match by Hardcover external_id, not name
  - Name updates will create new author record (by design - user can manually merge if needed)

- **Filesystem has multiple books with same title by same author but different IDs**:
  - Each unique ID creates separate ownership record
  - All matching IDs mark the book as owned (filesystem source)

- **Search returns hundreds or thousands of results**:
  - Pagination limits to 25 results per page (FR-029)
  - Display total result count with "Showing 1-25 of 1,234 results"
  - Provide "Load More" or page navigation controls

- **Book has no ISBN or multiple ISBNs**:
  - Store first ISBN if multiple returned from API
  - Store null if no ISBN available (isbn field nullable in schema)
  - Search by ISBN only matches exact ISBN, does not return partial matches

- **External API data is incomplete (missing author bio, missing book details)**:
  - Import available fields, store null for missing fields
  - Display "(No description available)" or similar placeholder in UI
  - Allow user to manually add missing information via edit functionality

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a unified search interface that accepts author name, book title, or ISBN input
- **FR-002**: System MUST query the Hardcover GraphQL API to retrieve search results
- **FR-003**: System MUST display search results in an easily scannable list format with key identifying information (title, author, cover image if available)
- **FR-004**: System MUST display visual status indicators in search results showing if a book is already in the database (with distinct markers for "Already Imported" or "Deleted")
- **FR-005**: System MUST provide an "Import" action for each search result (book or author with books) not already imported
- **FR-006**: System MUST store imported books with all available metadata (title, author, ISBN, publication date, description, cover URL, etc.)
- **FR-007**: System MUST store imported authors with all available metadata (name, bio, photo URL, etc.)
- **FR-008**: System MUST associate each book with its author(s) in the database
- **FR-009**: System MUST check the filesystem at the path pattern "{COLLECTION_ROOT}/Author name/Book title/" to determine if the user owns each imported book by matching author name and book title (case-insensitive), where COLLECTION_ROOT is configured via .env file. Any text in parentheses after the book title is ignored.
- **FR-010**: System MUST store ownership status for each book based on filesystem check results
- **FR-011**: System MUST allow users to manually mark any book as owned, overriding the filesystem-based ownership detection
- **FR-012**: When importing a single book by title or ISBN, system MUST import the book's author if not already present, but MUST NOT import the author's other books
- **FR-013**: When importing via author search, system MUST import all of the author's books from the API
- **FR-014**: System MUST provide an author detail page displaying bio and list of books
- **FR-015**: System MUST allow users to edit author biographical information on the author detail page
- **FR-016**: System MUST provide an "Update from API" function on author pages to fetch and import new books
- **FR-017**: System MUST provide a bulk action mode on author pages that displays selectable checkboxes for each book in the list
- **FR-018**: System MUST allow users to select multiple books simultaneously when bulk action mode is enabled
- **FR-019**: System MUST provide bulk actions to mark multiple selected books as owned in a single operation
- **FR-020**: System MUST provide bulk actions to delete multiple selected books in a single operation
- **FR-021**: System MUST allow users to mark books as deleted
- **FR-022**: Books marked as deleted MUST be retained in the database with deleted status
- **FR-023**: Deleted books MUST NOT appear on author pages or in book lists
- **FR-024**: Deleted books MUST NOT be re-imported during author updates or subsequent import operations
- **FR-025**: System MUST handle books with multiple authors by creating associations with all author records
- **FR-026**: System MUST gracefully handle API errors and display user-friendly error messages
- **FR-031**: System MUST implement client-side rate limiting with exponential backoff when making requests to the Hardcover API to prevent exceeding rate limits during bulk operations
- **FR-027**: System MUST handle cases where filesystem directories don't match expected patterns without crashing
- **FR-028**: System MUST prevent duplicate book entries for the same book based on the combination of author name and book title (editions are not tracked separately)
- **FR-029**: System MUST display search results with pagination showing 25 results per page (balances user scanning behavior with API response time and prevents overwhelming UI)
- **FR-030**: System is designed for single-user operation with no authentication or user account management required
- **FR-032**: System MUST implement structured logging that captures API calls (endpoint, parameters, response status), errors (with stack traces), import operations (book/author imported, counts), and user actions (search, import, edit, delete operations)
- **FR-033**: System MUST use SQLite as the local embedded database for persisting books, authors, and relationships

### Key Entities

- **Book**: Represents a published work with title, author(s), ISBN, publication information, description, cover image reference, ownership status, and deletion status
- **Author**: Represents a book author with name, biographical information, photo reference, and relationships to their books
- **Search Result**: Temporary representation of API query results before import, containing book or author data from external source
- **Ownership Record**: Tracks whether the user owns a physical/digital copy of a book based on filesystem presence

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can find and import a book by title in under 30 seconds (assuming normal API response time)
- **SC-002**: Users can find and import an author's complete bibliography in under 60 seconds (excluding intentional rate limit delays for API compliance)
- **SC-003**: 95% of book imports correctly identify ownership status from the filesystem (validated manually during testing with sample collection; automated validation not required)
- **SC-004**: Deleted books never reappear in visible book lists or get re-imported
- **SC-005**: System correctly handles API failures by displaying clear error messages without data corruption (validated through manual testing of network disconnection scenarios)
- **SC-006**: Users can edit author information and changes persist across sessions
- **SC-007**: ISBN searches return exact matches within 5 seconds
- **SC-008**: Author page updates fetch and import new books within 30 seconds
- **SC-009**: All search types (author, title, ISBN) provide results in a consistent, easy-to-scan format
- **SC-010**: 90% of users successfully complete their first book import without assistance or errors (post-launch user success metric; not validated during development)

## Assumptions

- The Hardcover GraphQL API is documented and accessible with reasonable rate limits
- The Hardcover API returns structured data in a consistent format for books and authors
- The user's book collection on the filesystem follows the "{COLLECTION_ROOT}/Author name/Book title/" directory structure (with optional parenthetical text after title), where COLLECTION_ROOT is specified in .env file
- Author names and book titles in filesystem directories reasonably match the names from Hardcover API (case-insensitive matching handles minor variations)
- Network connectivity to the Hardcover API is generally available during use
- Users have read/write access to both the local database and the filesystem collection directory
- Book uniqueness is determined by the combination of author name and book title; editions are not tracked as separate entities
- Single-user installation with no concurrent access concerns
- SQLite database file is stored locally and backed up by user's standard backup processes
