# Data Model: Author Deletion

**Feature**: 003-author-deletion  
**Date**: 2025-11-15

## Overview

This document defines the data model changes and database operations required for the Author Deletion feature. The feature introduces a permanent author deletion operation with intelligent handling of sole-authored vs co-authored books.

## Existing Schema

No schema changes required. The feature leverages existing database structure:

```sql
-- Authors table (existing)
CREATE TABLE IF NOT EXISTS authors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sort_name TEXT,
  bio TEXT,
  photo_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK(length(name) > 0)
);

-- Books table (existing)
CREATE TABLE IF NOT EXISTS books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  isbn TEXT,
  description TEXT,
  publication_date TEXT,
  cover_url TEXT,
  owned INTEGER NOT NULL DEFAULT 0,
  owned_source TEXT NOT NULL DEFAULT 'none',
  deleted INTEGER NOT NULL DEFAULT 0,  -- Soft delete flag (not used for this feature)
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK(length(title) > 0),
  CHECK(owned IN (0, 1)),
  CHECK(deleted IN (0, 1)),
  CHECK(owned_source IN ('none', 'filesystem', 'manual'))
);

-- BookAuthor junction table (existing)
CREATE TABLE IF NOT EXISTS book_authors (
  book_id INTEGER NOT NULL,
  author_id INTEGER NOT NULL,
  author_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (book_id, author_id),
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE,
  CHECK(author_order >= 0)
);
```

**Key Constraints**:
- `ON DELETE CASCADE` on both `book_id` and `author_id` in `book_authors`
- When an author is deleted, all their `book_authors` entries are automatically removed
- Books remain in database after author deletion (requires application logic to handle)

## Data Operations

### Author Deletion Operation

**Deletion Type**: Hard delete (permanent removal from database)

**Rationale**: 
- User explicitly requests permanent removal
- No re-import mechanism for authors (unlike books which can be re-imported from API)
- Simpler than soft delete (no filtering needed throughout app)
- Aligns with user expectation of "remove" from spec

### Book Categorization

Before deletion, books must be categorized by authorship:

**Sole-Authored Books**:
- Books with exactly one author (the one being deleted)
- Action: Permanently delete these books
- Reason: Book has no remaining authors after deletion

**Co-Authored Books**:
- Books with two or more authors
- Action: Preserve book, remove only the deleted author's association
- Reason: Book still has other authors and should remain in library

### Book Categorization Query

```sql
-- Returns book IDs categorized by author count
SELECT
  b.id as book_id,
  COUNT(ba.author_id) as author_count
FROM books b
JOIN book_authors ba ON b.id = ba.book_id
WHERE ba.author_id = ?  -- Parameter: author ID to delete
  AND b.deleted = 0     -- Only active books
GROUP BY b.id, ba.book_id

-- Interpretation:
-- author_count = 1: Sole-authored book (will be deleted)
-- author_count > 1: Co-authored book (will be preserved)
```

**Note**: The GROUP BY includes `ba.book_id` to match the book_authors primary key for proper grouping.

### Deletion Transaction

The deletion operation must be atomic (all-or-nothing):

```typescript
// Pseudo-code for deletion transaction
db.transaction(() => {
  // Step 1: Delete sole-authored books (hard delete)
  for (bookId of soleAuthoredBooks) {
    DELETE FROM books WHERE id = bookId;
    // This also cascades to delete book_authors entries
  }
  
  // Step 2: Delete author record
  DELETE FROM authors WHERE id = authorId;
  // This cascades to delete remaining book_authors entries
  // (those from co-authored books)
});
```

**Transaction Guarantees**:
- If any operation fails, entire transaction rolls back
- No partial deletions possible (satisfies FR-010, SC-002)
- Database maintains referential integrity throughout

## Entity Changes

### Author Model

**New Method**: `delete(id: number): void`
- Hard delete from database
- Note: Method already exists in AuthorModel.ts but marked as unused
- Will be activated and integrated into service layer

### Book Model

**No changes required**
- Existing deletion methods handle hard delete
- Will be reused for sole-authored book cleanup

### BookAuthor Model

**No changes required**
- CASCADE DELETE constraints handle cleanup automatically

## Data Integrity Rules

### Deletion Validation

**Pre-Deletion Checks**:
1. Author must exist (404 if not found)
2. No concurrent bulk operations in progress (prevent race conditions)

**Post-Deletion State**:
1. Author record removed from `authors` table
2. All `book_authors` entries for that author removed (via CASCADE)
3. All sole-authored books removed from `books` table
4. All co-authored books preserved in `books` table
5. No orphaned records in any table

### Concurrent Operation Prevention

**Scenario**: User attempts to delete author while bulk operations are active

**Handling**:
- Frontend: Disable Delete button when `isBulkUpdating === true`
- Backend: Service layer can check for ongoing operations (optional)
- Prevents data race conditions and ensures clean deletion

### Edge Cases

**Author already deleted (404)**:
- Return appropriate error
- Frontend displays error message
- User remains on page (can retry or navigate away)

**Very large book counts (1000+ books)**:
- No artificial timeout (per clarification #3)
- Rely on database transaction performance
- SQLite batch operations are fast enough for expected scale

**User navigates away during deletion**:
- Server continues deletion operation
- Transaction completes or rolls back
- User can verify by checking authors list

## State Transitions

### Author State

```
[Exists] --user clicks Delete--> [Deletion Pending]
         <--user cancels------

[Deletion Pending] --confirm + success--> [Deleted] (removed from DB)
                  --confirm + error------> [Exists] (remains, error shown)
```

### Book States (during author deletion)

**Sole-Authored Book**:
```
[Active, 1 author] --author deleted--> [Deleted] (removed from DB)
```

**Co-Authored Book**:
```
[Active, N authors] --author deleted--> [Active, N-1 authors]
(book remains, one author association removed)
```

## Validation Rules

### Input Validation

**Author ID**:
- Must be a positive integer
- Must exist in database
- Validated before deletion query

### Business Rules

**Deletion Allowed When**:
1. Author exists in database
2. No concurrent bulk operations (frontend-enforced)
3. User confirms deletion in modal

**Deletion Succeeds When**:
- All sole-authored books deleted successfully
- Author record deleted successfully
- All book_authors entries removed (CASCADE)
- Transaction commits without errors

**Deletion Fails When**:
- Database error occurs (disk full, constraint violation, etc.)
- Transaction is rolled back
- No partial changes persist

## Summary

**Schema Changes**: None required  
**New Operations**: Author hard delete with book categorization  
**Data Integrity**: Maintained through transactions and CASCADE constraints  
**Key Innovation**: Intelligent sole vs co-authored book handling at application layer
