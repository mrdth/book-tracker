# Feature Specification: Book Tracker Application

**Feature Branch**: `001-book-tracker`
**Created**: 2025-11-08
**Status**: Draft
**Input**: User description: "Build a book tracker application. A user can search for an author, title, or ISBN. Searches will be performed using the Hardcover graphql API..."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Search and Import Books by Title (Priority: P1)

A reader wants to quickly find and add a specific book to their personal collection database. They search by the book's title, see matching results from the external book database, and import the book's details along with its author information.

**Why this priority**: This is the most common use case - users typically know the book title they want to track. This represents the core value proposition: finding and cataloging specific books.

**Independent Test**: Can be fully tested by searching for any book title (e.g., "The Great Gatsby"), viewing search results, selecting a book to import, and verifying the book and author appear in the local database with ownership status from filesystem check.

**Acceptance Scenarios**:

1. **Given** the user enters a book title in the search field, **When** they submit the search, **Then** a list of matching books with basic details (title, author, publish date, cover) is displayed
2. **Given** search results are displayed, **When** the user selects "Import" on a book, **Then** the book details are saved to the database and the author is imported if not already present
3. **Given** the user imports a book, **When** the system checks the filesystem collection, **Then** the book's ownership status is correctly identified based on the "Author name/Book title (ID)/" directory pattern
4. **Given** a book's author doesn't exist in the database, **When** importing the book, **Then** the author is created with available information from the external API, but their other books are not imported
5. **Given** a book's author already exists in the database, **When** importing the book, **Then** the book is associated with the existing author record

---

### User Story 2 - Search and Import Author with Complete Bibliography (Priority: P2)

A reader discovers a new author and wants to add all their books to the database at once to track which ones they've read or want to read. They search by author name, review the author's profile, and import the complete bibliography.

**Why this priority**: This is valuable for users building their collection systematically or discovering new authors, but less urgent than single-book lookup. It provides bulk import efficiency.

**Independent Test**: Can be fully tested by searching for an author name (e.g., "Agatha Christie"), viewing the list of matching authors, selecting one to import, and verifying all their books are added to the database with filesystem ownership status checked for each.

**Acceptance Scenarios**:

1. **Given** the user enters an author name in the search field, **When** they submit the search, **Then** a list of matching authors with basic information is displayed
2. **Given** search results show multiple authors, **When** the user selects "Import books" for an author, **Then** the author and all their books are imported into the database
3. **Given** books are imported for an author, **When** the system checks the filesystem, **Then** each book's ownership status is determined by matching the "Author name/Book title (ID)/" directory pattern
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

- What happens when the external API is unavailable or returns an error during search or import?
- What happens when the filesystem collection directory structure doesn't match the expected "Author name/Book title (ID)/" pattern?
- What happens when a book has multiple authors (co-authors)?
- What happens when an author's name changes (married name, pseudonym) between imports?
- What happens when the filesystem has multiple books with the same title by the same author but different IDs?
- What happens when searching returns hundreds or thousands of results?
- What happens when a book has no ISBN or multiple ISBNs?
- What happens when the external API data is incomplete (missing author bio, missing book details)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a unified search interface that accepts author name, book title, or ISBN input
- **FR-002**: System MUST query the Hardcover GraphQL API to retrieve search results
- **FR-003**: System MUST display search results in an easily scannable list format with key identifying information (title, author, cover image if available)
- **FR-004**: System MUST provide an "Import" action for each search result (book or author with books)
- **FR-005**: System MUST store imported books with all available metadata (title, author, ISBN, publication date, description, cover URL, etc.)
- **FR-006**: System MUST store imported authors with all available metadata (name, bio, photo URL, etc.)
- **FR-007**: System MUST associate each book with its author(s) in the database
- **FR-008**: System MUST check the filesystem at the path pattern "Author name/Book title (ID)/" to determine if the user owns each imported book
- **FR-009**: System MUST store ownership status for each book based on filesystem check results
- **FR-010**: When importing a single book by title or ISBN, system MUST import the book's author if not already present, but MUST NOT import the author's other books
- **FR-011**: When importing via author search, system MUST import all of the author's books from the API
- **FR-012**: System MUST provide an author detail page displaying bio and list of books
- **FR-013**: System MUST allow users to edit author biographical information on the author detail page
- **FR-014**: System MUST provide an "Update from API" function on author pages to fetch and import new books
- **FR-015**: System MUST allow users to mark books as deleted
- **FR-016**: Books marked as deleted MUST be retained in the database with deleted status
- **FR-017**: Deleted books MUST NOT appear on author pages or in book lists
- **FR-018**: Deleted books MUST NOT be re-imported during author updates or subsequent import operations
- **FR-019**: System MUST handle books with multiple authors by creating associations with all author records
- **FR-020**: System MUST gracefully handle API errors and display user-friendly error messages
- **FR-021**: System MUST handle cases where filesystem directories don't match expected patterns without crashing
- **FR-022**: System MUST prevent duplicate book entries for the same book based on the combination of author name and book title (editions are not tracked separately)
- **FR-023**: System MUST display search results with pagination showing 50 results per page

### Key Entities

- **Book**: Represents a published work with title, author(s), ISBN, publication information, description, cover image reference, ownership status, and deletion status
- **Author**: Represents a book author with name, biographical information, photo reference, and relationships to their books
- **Search Result**: Temporary representation of API query results before import, containing book or author data from external source
- **Ownership Record**: Tracks whether the user owns a physical/digital copy of a book based on filesystem presence

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can find and import a book by title in under 30 seconds (assuming normal API response time)
- **SC-002**: Users can find and import an author's complete bibliography in under 60 seconds
- **SC-003**: 95% of book imports correctly identify ownership status from the filesystem
- **SC-004**: Deleted books never reappear in visible book lists or get re-imported
- **SC-005**: System correctly handles API failures by displaying clear error messages without data corruption
- **SC-006**: Users can edit author information and changes persist across sessions
- **SC-007**: ISBN searches return exact matches within 5 seconds
- **SC-008**: Author page updates fetch and import new books within 30 seconds
- **SC-009**: All search types (author, title, ISBN) provide results in a consistent, easy-to-scan format
- **SC-010**: 90% of users successfully complete their first book import without assistance or errors

## Assumptions

- The Hardcover GraphQL API is documented and accessible with reasonable rate limits
- The Hardcover API returns structured data in a consistent format for books and authors
- The user's book collection on the filesystem follows the "Author name/Book title (ID)/" directory structure reliably
- The external ID in the filesystem directory matches an identifier available from the Hardcover API
- Network connectivity to the Hardcover API is generally available during use
- Users have read/write access to both the local database and the filesystem collection directory
- Book uniqueness is determined by the combination of author name and book title; editions are not tracked as separate entities
