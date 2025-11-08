# Data Model: Book Tracker Application

**Date**: 2025-11-08  
**Feature**: Book Tracker Application  
**Branch**: 001-book-tracker

## Overview

This document defines the database schema, entity relationships, validation rules, and state transitions for the book tracker application. The data model supports searching, importing, and managing books and authors with ownership tracking and soft deletion.

---

## Entities

### Book

Represents a published work imported from the Hardcover API or created by the user.

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Internal database ID |
| `external_id` | TEXT | NOT NULL, UNIQUE | Hardcover API book ID |
| `title` | TEXT | NOT NULL | Book title |
| `isbn` | TEXT | NULL | ISBN identifier (optional) |
| `description` | TEXT | NULL | Book description/synopsis |
| `publication_date` | TEXT | NULL | Publication date (ISO 8601 format) |
| `cover_url` | TEXT | NULL | URL to book cover image |
| `owned` | INTEGER | NOT NULL, DEFAULT 0 | Ownership status (0 = not owned, 1 = owned) |
| `owned_source` | TEXT | NOT NULL, DEFAULT 'none' | Source of ownership info: 'none', 'filesystem', 'manual' |
| `deleted` | INTEGER | NOT NULL, DEFAULT 0 | Soft deletion flag (0 = active, 1 = deleted) |
| `created_at` | TEXT | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| `updated_at` | TEXT | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Record last update timestamp |

**Indexes**:
- `idx_books_external_id` on `external_id` (for Hardcover API lookups)
- `idx_books_deleted` on `deleted` (for filtering active books)
- `idx_books_isbn` on `isbn` (for ISBN searches)

**Validation Rules**:
- `title` must not be empty
- `external_id` must be unique across all books (including deleted)
- `owned` must be 0 or 1
- `deleted` must be 0 or 1
- `owned_source` must be one of: 'none', 'filesystem', 'manual'
- If `owned_source` is 'manual', then `owned` must be 1
- `publication_date` must be valid ISO 8601 format if provided

**State Transitions**:

```
Initial State → Active (deleted=0)
Active → Deleted (deleted=1, user action)
Active → Owned (owned=0→1, filesystem scan or manual)
Owned → Not Owned (owned=1→0, only if owned_source='filesystem' and file removed)
Manual Ownership → Always Owned (owned_source='manual' overrides filesystem)
```

**Business Rules**:
- Books marked as deleted (FR-023) are never physically removed from the database (FR-022)
- Deleted books must not be re-imported during author updates (FR-024)
- Deleted books must appear in search results with "Deleted" indicator (FR-024)
- Manual ownership (`owned_source='manual'`) takes precedence over filesystem detection (FR-011)
- Duplicate prevention: Same book (by `external_id`) cannot be imported twice (FR-028)

---

### Author

Represents a book author with biographical information.

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Internal database ID |
| `external_id` | TEXT | NOT NULL, UNIQUE | Hardcover API author ID |
| `name` | TEXT | NOT NULL | Author full name |
| `bio` | TEXT | NULL | Author biographical information |
| `photo_url` | TEXT | NULL | URL to author photo |
| `created_at` | TEXT | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| `updated_at` | TEXT | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Record last update timestamp |

**Indexes**:
- `idx_authors_external_id` on `external_id` (for Hardcover API lookups)
- `idx_authors_name` on `name` (for author name searches)

**Validation Rules**:
- `name` must not be empty
- `external_id` must be unique across all authors

**Business Rules**:
- Authors are created automatically when importing books (FR-007, FR-012)
- Author biographical information can be edited by user (FR-015)
- Authors are never deleted (even if all their books are deleted)

---

### BookAuthor (Association Table)

Represents the many-to-many relationship between books and authors (supports co-authored books).

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `book_id` | INTEGER | NOT NULL, FOREIGN KEY → books(id) | Reference to book |
| `author_id` | INTEGER | NOT NULL, FOREIGN KEY → authors(id) | Reference to author |
| `author_order` | INTEGER | NOT NULL, DEFAULT 0 | Order of author for multi-author books (0-indexed) |

**Primary Key**: Composite (`book_id`, `author_id`)

**Indexes**:
- `idx_bookauthor_book` on `book_id` (for finding authors of a book)
- `idx_bookauthor_author` on `author_id` (for finding books by an author)

**Foreign Key Constraints**:
- `book_id` references `books(id)` ON DELETE CASCADE
- `author_id` references `authors(id)` ON DELETE CASCADE

**Validation Rules**:
- Each (book_id, author_id) pair must be unique
- `author_order` must be non-negative

**Business Rules**:
- Books with multiple authors create multiple BookAuthor records (FR-025)
- `author_order` preserves author listing order from Hardcover API
- When a book is deleted (soft delete), BookAuthor associations remain (for potential restoration)

---

## Relationships

```
Author (1) ←→ (N) BookAuthor (N) ←→ (1) Book

- One Author can have many BookAuthor entries (one per book)
- One Book can have many BookAuthor entries (co-authored books)
- BookAuthor is the junction table for the many-to-many relationship
```

**Cardinality**:
- Author → Books: One-to-Many (via BookAuthor)
- Book → Authors: Many-to-Many (via BookAuthor)

---

## Database Schema (SQLite)

```sql
-- Authors table
CREATE TABLE authors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  bio TEXT,
  photo_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK(length(name) > 0)
);

CREATE INDEX idx_authors_external_id ON authors(external_id);
CREATE INDEX idx_authors_name ON authors(name);

-- Books table
CREATE TABLE books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  isbn TEXT,
  description TEXT,
  publication_date TEXT,
  cover_url TEXT,
  owned INTEGER NOT NULL DEFAULT 0,
  owned_source TEXT NOT NULL DEFAULT 'none',
  deleted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK(length(title) > 0),
  CHECK(owned IN (0, 1)),
  CHECK(deleted IN (0, 1)),
  CHECK(owned_source IN ('none', 'filesystem', 'manual')),
  CHECK(owned_source != 'manual' OR owned = 1)
);

CREATE INDEX idx_books_external_id ON books(external_id);
CREATE INDEX idx_books_deleted ON books(deleted);
CREATE INDEX idx_books_isbn ON books(isbn);

-- BookAuthor junction table
CREATE TABLE book_authors (
  book_id INTEGER NOT NULL,
  author_id INTEGER NOT NULL,
  author_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (book_id, author_id),
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE,
  CHECK(author_order >= 0)
);

CREATE INDEX idx_bookauthor_book ON book_authors(book_id);
CREATE INDEX idx_bookauthor_author ON book_authors(author_id);

-- Trigger to update updated_at timestamp on books
CREATE TRIGGER update_books_timestamp 
AFTER UPDATE ON books
BEGIN
  UPDATE books SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger to update updated_at timestamp on authors
CREATE TRIGGER update_authors_timestamp 
AFTER UPDATE ON authors
BEGIN
  UPDATE authors SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
```

---

## Common Queries

### Find Active Books by Author

```sql
SELECT b.*
FROM books b
JOIN book_authors ba ON b.id = ba.book_id
WHERE ba.author_id = ? AND b.deleted = 0
ORDER BY b.publication_date DESC;
```

### Search Books by Title (Including Deleted Status)

```sql
SELECT 
  b.id,
  b.title,
  b.isbn,
  b.cover_url,
  b.owned,
  b.deleted,
  GROUP_CONCAT(a.name, ', ') AS authors
FROM books b
JOIN book_authors ba ON b.id = ba.book_id
JOIN authors a ON ba.author_id = a.id
WHERE b.title LIKE '%' || ? || '%'
GROUP BY b.id
ORDER BY b.deleted ASC, b.title ASC;
```

### Check if Book Exists (by External ID)

```sql
SELECT id, deleted FROM books WHERE external_id = ?;
```

### Get Author with Book Count

```sql
SELECT 
  a.*,
  COUNT(CASE WHEN b.deleted = 0 THEN 1 END) AS active_book_count,
  COUNT(b.id) AS total_book_count
FROM authors a
LEFT JOIN book_authors ba ON a.id = ba.author_id
LEFT JOIN books b ON ba.book_id = b.id
WHERE a.id = ?
GROUP BY a.id;
```

### Update Ownership Status from Filesystem Scan

```sql
-- Reset filesystem-based ownership
UPDATE books 
SET owned = 0, owned_source = 'none', updated_at = CURRENT_TIMESTAMP
WHERE owned_source = 'filesystem';

-- Set ownership for books found in filesystem
UPDATE books 
SET owned = 1, owned_source = 'filesystem', updated_at = CURRENT_TIMESTAMP
WHERE external_id IN (?, ?, ?, ...);
-- (Parameter list built from filesystem scan results)
```

### Import Book with Author

```sql
-- Start transaction
BEGIN TRANSACTION;

-- Check if author exists
SELECT id FROM authors WHERE external_id = ?;

-- If author doesn't exist, insert
INSERT INTO authors (external_id, name, bio, photo_url)
VALUES (?, ?, ?, ?);

-- Get author ID (from select or last insert)
-- Insert book
INSERT INTO books (external_id, title, isbn, description, publication_date, cover_url, owned, owned_source)
VALUES (?, ?, ?, ?, ?, ?, ?, ?);

-- Get book ID from last insert
-- Create association
INSERT INTO book_authors (book_id, author_id, author_order)
VALUES (?, ?, ?);

COMMIT;
```

---

## Validation Business Logic

### Duplicate Book Prevention (FR-028)

Before importing a book:
1. Query `books` table for existing `external_id`
2. If exists and `deleted = 0`: Return error "Book already imported"
3. If exists and `deleted = 1`: Return error "Book was previously deleted, cannot re-import"
4. If not exists: Proceed with import

### Manual Ownership Override (FR-011)

When user manually marks a book as owned:
1. Update `owned = 1`, `owned_source = 'manual'`
2. This overrides any future filesystem scan results (manual always wins)

When filesystem scan runs:
1. Skip books where `owned_source = 'manual'` (do not overwrite)
2. Update only books where `owned_source = 'filesystem'` or `'none'`

### Soft Deletion Rules (FR-021 to FR-024)

When user deletes a book:
1. Update `deleted = 1`
2. Book remains in database with all data intact
3. Book is excluded from author page listings (filter: `deleted = 0`)
4. Book appears in search results with "Deleted" indicator

When importing/updating author books:
1. Check if book exists: `SELECT id, deleted FROM books WHERE external_id = ?`
2. If `deleted = 1`: Skip book, do not re-import or change deleted status
3. If `deleted = 0`: Skip book (already imported)
4. If not exists: Import book

---

## Data Migration Notes

### Initial Schema Setup

When creating a new database:
1. Execute schema SQL in order: authors → books → book_authors
2. Create indexes after table creation
3. Create triggers for timestamp management

### Future Schema Changes

For incremental schema updates:
- Use SQLite `ALTER TABLE` for adding columns (default values required)
- Use transaction-wrapped data migrations for complex changes
- Maintain backward compatibility with existing data
- Document migration scripts in separate `migrations/` directory

---

## Performance Considerations

**Expected Data Volume**:
- Thousands of books per user
- Dozens to hundreds of authors
- Hundreds of thousands of potential BookAuthor associations

**Optimization Strategies**:
1. **Indexes**: All foreign keys and frequently queried fields indexed
2. **Prepared Statements**: Use better-sqlite3 prepared statements for repeated queries
3. **Transactions**: Batch imports wrapped in transactions for atomicity and speed
4. **Pagination**: Limit query results with `LIMIT` and `OFFSET` for large result sets (FR-029: 50 results per page)

**Query Optimization**:
- Use `EXPLAIN QUERY PLAN` to verify index usage
- Avoid `SELECT *` in production code (specify needed columns)
- Use `JOIN` instead of subqueries where possible
- For large imports, use single transaction with batched inserts

---

## Type Definitions (TypeScript)

```typescript
// shared/types/book.ts
export interface Book {
  id: number;
  externalId: string;
  title: string;
  isbn: string | null;
  description: string | null;
  publicationDate: string | null;
  coverUrl: string | null;
  owned: boolean;
  ownedSource: 'none' | 'filesystem' | 'manual';
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// shared/types/author.ts
export interface Author {
  id: number;
  externalId: string;
  name: string;
  bio: string | null;
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

// shared/types/book-author.ts
export interface BookAuthor {
  bookId: number;
  authorId: number;
  authorOrder: number;
}

// Extended types for API responses
export interface BookWithAuthors extends Book {
  authors: Author[];
}

export interface AuthorWithBooks extends Author {
  books: Book[];
  activeBookCount: number;
  totalBookCount: number;
}
```

---

## Constitution Alignment

This data model aligns with the project constitution:

- **Data Integrity & Privacy**: 
  - Soft deletion prevents data loss (FR-022, FR-024)
  - Foreign key constraints ensure referential integrity
  - Unique constraints prevent duplicates (FR-028)
  - Local SQLite storage (no cloud, single-user)

- **Simplicity First**: 
  - Standard relational model (no ORM complexity)
  - Three simple tables with clear relationships
  - No premature optimization (indexes only on essential fields)

- **Observable & Debuggable**: 
  - Timestamp fields for audit trail
  - Explicit state fields (`deleted`, `owned`, `owned_source`)
  - Clear state transitions documented

- **User-Centric Design**: 
  - Manual ownership override respects user intent (FR-011)
  - Soft deletion allows recovery if needed
  - Ownership tracking automated from filesystem
