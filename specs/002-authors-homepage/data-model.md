# Data Model: Authors Homepage

**Feature**: Authors Homepage  
**Branch**: `002-authors-homepage`  
**Date**: 2025-11-11  
**Spec**: [spec.md](./spec.md)  
**Plan**: [plan.md](./plan.md)  
**Research**: [research.md](./research.md)

## Overview

This document defines the data model for the Authors Homepage feature. The feature primarily uses the existing `authors` table with a new `sort_name` column to support efficient name-based sorting. No new tables are required; the feature leverages existing relationships between authors and books.

---

## Entity: Author

### Description

Represents a book author with biographical information and photo. Authors are imported from the Hardcover API and stored locally for efficient querying and display.

### Schema

**Table**: `authors`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Internal unique identifier |
| `external_id` | TEXT | NOT NULL UNIQUE | Hardcover API author ID |
| `name` | TEXT | NOT NULL, length > 0 | Full author name for display (e.g., "Agatha Christie") |
| `sort_name` | TEXT | NULL (initially) | Pre-computed sort key (e.g., "Christie, Agatha") **[NEW]** |
| `bio` | TEXT | NULL | Author biography/description |
| `photo_url` | TEXT | NULL | URL to author photo |
| `created_at` | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| `updated_at` | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

**Indexes**:
- `idx_authors_external_id` ON `external_id` (existing)
- `idx_authors_name` ON `name` (existing)
- `idx_authors_sort_name` ON `sort_name COLLATE NOCASE` **[NEW]**

**Triggers**:
- `update_authors_timestamp` - Updates `updated_at` on row modification (existing)

### New Column: sort_name

**Purpose**: Pre-computed sort key for efficient "last name, first name" alphabetical ordering.

**Format**: `"LastName, FirstName"` (e.g., "Christie, Agatha")

**Generation Logic**:
```typescript
function generateSortName(fullName: string): string {
  const trimmed = fullName.trim();
  const lastSpaceIndex = trimmed.lastIndexOf(' ');
  
  if (lastSpaceIndex === -1) {
    return trimmed; // Single name: "Madonna" -> "Madonna"
  }
  
  const firstName = trimmed.substring(0, lastSpaceIndex);
  const lastName = trimmed.substring(lastSpaceIndex + 1);
  
  return `${lastName}, ${firstName}`;
}
```

**Examples**:
- "Agatha Christie" → "Christie, Agatha"
- "J.K. Rowling" → "Rowling, J.K."
- "Stephen King" → "King, Stephen"
- "Madonna" → "Madonna"

**Limitations**: Simple last-word heuristic covers ~90% of Western names. Edge cases like "Ursula K. Le Guin" may parse as "Guin, Ursula K. Le" and require manual correction in future updates.

### Relationships

- **One-to-Many with Book**: An author can have multiple books
  - Via junction table: `book_authors`
  - Relationship: `authors.id` ← `book_authors.author_id`
  
### Business Rules

- **Uniqueness**: `external_id` must be unique (enforced by UNIQUE constraint)
- **Required fields**: `external_id` and `name` are mandatory
- **Name validation**: `name` must have length > 0 (CHECK constraint)
- **Photo handling**: Missing photos displayed as default circular placeholder (UI layer)
- **Bio truncation**: Biographies truncated at 300 characters in UI (FR-012)
- **Never deleted**: Authors are never deleted per existing business rules (soft delete via book deletion only)

### Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| `name` | NOT NULL, length > 0 | "Author name is required" |
| `external_id` | NOT NULL, UNIQUE | "External ID is required and must be unique" |
| `bio` | Optional, any length | N/A |
| `photo_url` | Optional, valid URL format | "Invalid photo URL format" |

---

## Derived Entity: AuthorWithBooks

### Description

Extended author object that includes the author's book collection and counts. This is a **computed view**, not a database table—it's constructed at query time by joining `authors` with `book_authors` and `books` tables.

### TypeScript Interface

```typescript
interface AuthorWithBooks {
  // Base author fields
  id: number;
  externalId: string;
  name: string;
  bio: string | null;
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
  
  // Computed fields
  books: Book[];              // Array of associated books
  activeBookCount: number;    // Count of non-deleted books
  totalBookCount: number;     // Total books including deleted
}
```

### Construction Logic

```typescript
// Pseudo-SQL for illustration
SELECT 
  a.*,
  (SELECT COUNT(*) FROM book_authors ba 
   JOIN books b ON ba.book_id = b.id 
   WHERE ba.author_id = a.id AND b.deleted = 0) as activeBookCount,
  (SELECT COUNT(*) FROM book_authors ba 
   WHERE ba.author_id = a.id) as totalBookCount
FROM authors a
```

**Books array** is populated by separate query:
```typescript
// For each author
const bookIds = book_authors.findByAuthorId(author.id);
const books = bookIds.map(id => books.findById(id)).filter(b => !b.deleted);
```

### Display Requirements (per spec)

For Authors Homepage list view:
- Display: `name`, `photoUrl`, `bio` (truncated), `activeBookCount`
- Do NOT load full `books` array (performance optimization)
- Only fetch book count via subquery

---

## Entity: Book (Existing, Unchanged)

### Description

Represents a book in the user's collection. Referenced by authors homepage to display book counts but not modified by this feature.

### Schema (Reference Only)

**Table**: `books`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY | Internal book ID |
| `external_id` | TEXT | NOT NULL UNIQUE | Hardcover API book ID |
| `title` | TEXT | NOT NULL | Book title |
| `isbn` | TEXT | NULL | ISBN identifier |
| `description` | TEXT | NULL | Book description |
| `publication_date` | TEXT | NULL | Publication date |
| `cover_url` | TEXT | NULL | Book cover image URL |
| `owned` | INTEGER | NOT NULL DEFAULT 0 | Ownership status (0 or 1) |
| `owned_source` | TEXT | NOT NULL DEFAULT 'none' | Source of ownership ('none', 'filesystem', 'manual') |
| `deleted` | INTEGER | NOT NULL DEFAULT 0 | Soft delete flag (0 or 1) |
| `created_at` | TEXT | NOT NULL | Creation timestamp |
| `updated_at` | TEXT | NOT NULL | Update timestamp |

### Usage in Authors Homepage

- **Read-only**: This feature only reads book data (counts), never modifies
- **Count query**: `SELECT COUNT(*) FROM book_authors WHERE author_id = ? AND book_id IN (SELECT id FROM books WHERE deleted = 0)`
- **Performance**: Count is computed via subquery in authors list endpoint

---

## Entity: BookAuthor (Junction Table, Existing, Unchanged)

### Description

Many-to-many junction table linking books to authors. Supports multiple authors per book and multiple books per author.

### Schema (Reference Only)

**Table**: `book_authors`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `book_id` | INTEGER | NOT NULL, FK → books(id) | Book reference |
| `author_id` | INTEGER | NOT NULL, FK → authors(id) | Author reference |
| `author_order` | INTEGER | NOT NULL DEFAULT 0 | Order of author attribution (for co-authors) |

**Primary Key**: `(book_id, author_id)`

**Indexes**:
- `idx_bookauthor_book` ON `book_id`
- `idx_bookauthor_author` ON `author_id`

### Usage in Authors Homepage

- **Read-only**: Used to count books per author
- **Query pattern**: `SELECT COUNT(DISTINCT book_id) FROM book_authors WHERE author_id = ?`

---

## State Transitions

### Author Lifecycle (Existing, No Changes)

```
[Non-existent] 
    ↓ (importAuthor API call)
[Created] 
    ↓ (updateAuthor API call)
[Updated] 
    ↓ (refreshAuthorBooks API call)
[Updated with new books]

Note: Authors are never deleted (only soft-deleted via book deletion)
```

### sort_name Lifecycle (New)

```
[Author Created without sort_name] (existing authors pre-migration)
    ↓ (Run migration 003)
[sort_name computed and stored]
    ↓ (Author name updated via API)
[sort_name recomputed automatically]
```

**Trigger Points** for `sort_name` computation:
1. Migration 003 runs → backfill all existing authors
2. `AuthorModel.create()` → compute on creation
3. `AuthorModel.update()` → recompute if `name` changed

---

## Migration Strategy

### Migration 003: Add sort_name Column

**File**: `backend/src/db/migrations/003_add_author_sort_name.sql`

```sql
-- Add sort_name column for efficient author name sorting
ALTER TABLE authors ADD COLUMN sort_name TEXT;

-- Create case-insensitive index on sort_name
CREATE INDEX IF NOT EXISTS idx_authors_sort_name 
ON authors(sort_name COLLATE NOCASE);
```

### Data Backfill Script

**Approach**: Run as part of migration script (TypeScript):

```typescript
// backend/src/db/migrate.ts or separate backfill script
import { getDatabase } from './connection.js';
import { generateSortName } from '../utils/nameParser.js';

export function backfillSortNames(): void {
  const db = getDatabase();
  
  console.log('Backfilling sort_name for existing authors...');
  
  const authors = db.prepare('SELECT id, name FROM authors WHERE sort_name IS NULL').all();
  
  const updateStmt = db.prepare('UPDATE authors SET sort_name = ? WHERE id = ?');
  
  db.transaction(() => {
    for (const author of authors) {
      const sortName = generateSortName(author.name);
      updateStmt.run(sortName, author.id);
    }
  })();
  
  console.log(`✓ Backfilled sort_name for ${authors.length} authors`);
}
```

**Run via**: `npm run db:migrate` (will detect and execute migration 003)

---

## Query Patterns

### Pattern 1: Paginated Authors List (Primary Query)

**Use Case**: Homepage initial load and infinite scroll pagination

**Query**:
```sql
SELECT 
  a.id,
  a.external_id as externalId,
  a.name,
  a.bio,
  a.photo_url as photoUrl,
  a.created_at as createdAt,
  a.updated_at as updatedAt,
  (SELECT COUNT(*) 
   FROM book_authors ba 
   JOIN books b ON ba.book_id = b.id 
   WHERE ba.author_id = a.id AND b.deleted = 0
  ) as bookCount
FROM authors a
WHERE (a.sort_name, a.id) > (?, ?)  -- Cursor-based pagination
ORDER BY a.sort_name COLLATE NOCASE ASC
LIMIT 50;
```

**Parameters**:
- `?` (param 1): `lastSeenSortName` (or NULL for first page)
- `?` (param 2): `lastSeenId` (or NULL for first page)

**Performance**: ~0.5ms (constant time regardless of page depth)

**Index Usage**: `idx_authors_sort_name`

---

### Pattern 2: Filtered Authors List (A-Z Navigation)

**Use Case**: User clicks letter "M" in A-Z filter

**Query**:
```sql
SELECT 
  a.id,
  a.external_id as externalId,
  a.name,
  a.bio,
  a.photo_url as photoUrl,
  a.created_at as createdAt,
  a.updated_at as updatedAt,
  (SELECT COUNT(*) 
   FROM book_authors ba 
   JOIN books b ON ba.book_id = b.id 
   WHERE ba.author_id = a.id AND b.deleted = 0
  ) as bookCount
FROM authors a
WHERE a.sort_name LIKE ? -- Letter filter
  AND (a.sort_name, a.id) > (?, ?)  -- Cursor-based pagination
ORDER BY a.sort_name COLLATE NOCASE ASC
LIMIT 50;
```

**Parameters**:
- `?` (param 1): `'M%'` (letter prefix)
- `?` (param 2): `lastSeenSortName` (or NULL for first page)
- `?` (param 3): `lastSeenId` (or NULL for first page)

**Performance**: ~0.5ms with proper index

**Index Usage**: `idx_authors_sort_name` (supports LIKE prefix matching)

---

### Pattern 3: Count Authors by Letter

**Use Case**: Show count of authors per letter in A-Z navigation (optional enhancement)

**Query**:
```sql
SELECT 
  UPPER(SUBSTR(sort_name, 1, 1)) as letter,
  COUNT(*) as count
FROM authors
GROUP BY letter
ORDER BY letter ASC;
```

**Performance**: ~5-10ms for 10,000 authors (full table scan)

**Note**: This query is optional and can be cached/pre-computed if needed

---

## Performance Characteristics

### Expected Query Performance (at 10,000 authors)

| Query Type | Page Position | Expected Time | Index Used |
|------------|---------------|---------------|------------|
| Paginated list (no filter) | Page 1 | ~0.5ms | idx_authors_sort_name |
| Paginated list (no filter) | Page 200 | ~0.5ms | idx_authors_sort_name |
| Filtered list (letter M) | Page 1 | ~0.5ms | idx_authors_sort_name |
| Count by letter | N/A | ~5-10ms | None (full scan) |

### Memory Footprint

- **Per author record**: ~200-500 bytes (name, bio, URLs)
- **10,000 authors in memory**: ~5 MB
- **Virtual scrolling**: Only ~20 authors rendered at once (~10 KB DOM)

### Scalability Limits

- **Tested scale**: 10,000 authors (per spec SC-004)
- **Expected max**: 50,000 authors before re-architecture needed
- **Bottlenecks**: Book count subquery (mitigate with cached count column if needed)

---

## Data Consistency Rules

### Invariants

1. **Author uniqueness**: No two authors with same `external_id`
2. **Name required**: Every author must have a non-empty `name`
3. **Sort name sync**: `sort_name` must always reflect current `name` value
4. **Book count accuracy**: Book counts must exclude soft-deleted books (`deleted = 1`)

### Consistency Checks

**On Author Update**:
```typescript
// In AuthorModel.update()
if (input.name !== undefined) {
  updates.push('sort_name = ?');
  values.push(generateSortName(input.name));
}
```

**Validation**:
```typescript
// Check for duplicate external_id before insert
if (authorModel.existsByExternalId(externalId)) {
  throw new Error('Author with this external_id already exists');
}
```

---

## Future Enhancements (Out of Scope for This Feature)

1. **Manual sort_name override**: UI to manually correct edge cases (e.g., "Le Guin, Ursula K.")
2. **Cached book counts**: Add `book_count` column to `authors` table (updated via trigger)
3. **Full-text search**: Add FTS5 index on `name` and `bio` for search functionality
4. **International collation**: Use SQLite ICU extension for locale-aware sorting
5. **Author merge**: Handle duplicate authors with different `external_id` values

---

## Testing Considerations

### Data Fixtures

**Minimal test dataset** (for unit tests):
```typescript
const testAuthors = [
  { name: "Agatha Christie", sortName: "Christie, Agatha", bookCount: 66 },
  { name: "Stephen King", sortName: "King, Stephen", bookCount: 80 },
  { name: "J.K. Rowling", sortName: "Rowling, J.K.", bookCount: 14 },
  { name: "Ursula K. Le Guin", sortName: "Guin, Ursula K. Le", bookCount: 23 },
];
```

**Large test dataset** (for performance tests):
```typescript
// Generate 10,000 synthetic authors
function generateTestAuthors(count: number): Author[] {
  const firstNames = ["John", "Jane", "Alice", "Bob", ...];
  const lastNames = ["Smith", "Johnson", "Williams", ...];
  
  return Array.from({ length: count }, (_, i) => ({
    externalId: `test-${i}`,
    name: `${randomChoice(firstNames)} ${randomChoice(lastNames)}`,
    bio: `Test author ${i}`,
    photoUrl: null,
  }));
}
```

### Edge Cases to Test

1. **Empty database**: Homepage shows "No authors found"
2. **Single author**: List displays correctly without pagination
3. **Exactly 50 authors**: No "Load more" after first page
4. **51 authors**: "Load more" appears, second page has 1 author
5. **Letter filter with no matches**: "No authors found for letter Q"
6. **Name edge cases**: Single names, initials, Jr./Sr., international characters
7. **Missing photos**: Default placeholder displayed
8. **Empty bio**: "No biography available" message
9. **Very long bio**: Truncated at 300 characters with ellipsis
10. **Zero books**: "0 books collected" displayed

---

## References

- **Existing schema**: `backend/src/db/schema.sql`
- **Author model**: `backend/src/models/Author.ts`
- **Book model**: `backend/src/models/Book.ts`
- **BookAuthor model**: `backend/src/models/BookAuthor.ts`
- **Spec document**: [spec.md](./spec.md)
- **Research document**: [research.md](./research.md)

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-11  
**Next Phase**: [contracts/](./contracts/) - API contract definitions
