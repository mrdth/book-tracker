# Research Document: Author Deletion Feature

**Feature Branch**: `003-author-deletion`  
**Created**: 2025-11-15  
**Research Date**: 2025-11-15

## 1. Database CASCADE DELETE Behavior

### Investigation Results

**File Examined**: `/home/mrdth/Development/VueJS/book-tracker/backend/src/db/schema.sql`

#### CASCADE DELETE Constraints

The `book_authors` junction table has the following foreign key constraints with CASCADE DELETE:

```sql
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

#### Cascade Behavior Analysis

**When an author is deleted:**

1. **Direct Effect**: SQLite automatically removes all `book_authors` entries where `author_id` matches the deleted author
2. **Indirect Effect**: Books themselves are NOT automatically deleted by CASCADE constraints
3. **Orphaned Books**: Books that lose their only author (sole-authored books) will have NO entries in `book_authors` but will still exist in the `books` table

**When a book is deleted:**

1. **Direct Effect**: SQLite automatically removes all `book_authors` entries where `book_id` matches the deleted book
2. **No Impact on Authors**: Author records remain unchanged

### Decision

**Approach Chosen**: Implement application-level deletion logic to handle orphaned books

**Rationale**:
- Database CASCADE DELETE handles the junction table cleanup automatically
- Application must explicitly identify and delete sole-authored books
- Co-authored books must be preserved (they will still have other author associations)
- This requires a two-step process:
  1. Identify books that have only this author (sole-authored)
  2. Delete author (CASCADE removes book_authors entries)
  3. Delete sole-authored books

**Alternative Considered**: Rely solely on database triggers

- **Why rejected**: SQLite triggers cannot easily identify "orphaned" books (books with no remaining authors) after CASCADE DELETE has removed the author. A BEFORE DELETE trigger could work but would require complex SQL logic and make the codebase harder to maintain.

### Code Example from Codebase

Current author deletion method in `/home/mrdth/Development/VueJS/book-tracker/backend/src/models/Author.ts`:

```typescript
/**
 * Delete author (Note: In practice, authors are never deleted per business rules)
 * This method is included for completeness but should not be used in application logic
 */
delete(id: number): void {
  const stmt = this.db.prepare('DELETE FROM authors WHERE id = ?');
  stmt.run(id);
}
```

**Note**: The comment indicates authors were not originally intended to be deleted, but the method exists. We'll need to implement proper deletion logic in `AuthorService`.

---

## 2. Existing Deletion Patterns

### Book Deletion Pattern

**File Examined**: `/home/mrdth/Development/VueJS/book-tracker/backend/src/models/Book.ts`

#### Soft Delete vs Hard Delete

The application uses **soft deletes** for books:

```typescript
/**
 * Mark book as deleted (soft delete)
 */
markDeleted(id: number): Book {
  return this.update(id, { deleted: true });
}
```

Books have a `deleted` flag in the database schema:

```sql
CREATE TABLE IF NOT EXISTS books (
  -- ... other fields ...
  deleted INTEGER NOT NULL DEFAULT 0,
  CHECK(deleted IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_books_deleted ON books(deleted);
```

#### Book Deletion API Pattern

**File Examined**: `/home/mrdth/Development/VueJS/book-tracker/backend/src/api/routes/books.ts`

```typescript
/**
 * PATCH /api/books/:id
 * Update book ownership or deletion status
 */
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  // ... validation ...
  
  // Handle deletion
  if (deleted === true) {
    const book = bookService.deleteBook(bookId);
    logger.info('Book deleted', { bookId, title: book.title });
    return res.status(200).json(book);
  }
  
  // ... other updates ...
});
```

**Service Layer** (`/home/mrdth/Development/VueJS/book-tracker/backend/src/services/BookService.ts`):

```typescript
/**
 * Mark book as deleted (soft delete)
 */
deleteBook(bookId: number): BookWithAuthors {
  logger.info('Marking book as deleted', { bookId });

  const book = this.bookModel.findById(bookId);
  if (!book) {
    throw errors.notFoundError('Book not found', { bookId });
  }

  if (book.deleted) {
    logger.warn('Book already deleted', { bookId });
  }

  const updated = this.bookModel.markDeleted(bookId);

  logger.info('Book marked as deleted', { bookId, title: updated.title });

  return this.getBookWithAuthors(bookId);
}
```

### Frontend Deletion Pattern

**File Examined**: `/home/mrdth/Development/VueJS/book-tracker/frontend/src/pages/AuthorPage.vue`

#### Current Book Deletion Flow

```typescript
const handleDeleteBook = async (bookId: number) => {
  if (!confirm('Delete this book? It will be marked as deleted but not permanently removed.')) {
    return;
  }

  try {
    await apiClient.updateBook(bookId, { deleted: true });
    await loadAuthor(); // Reload to remove deleted book from list
  } catch (err) {
    console.error('Failed to delete book:', err);
    alert(err instanceof Error ? err.message : 'Failed to delete book');
  }
};
```

**Pattern Observations**:
- Uses browser's native `confirm()` dialog for simple confirmations
- Shows loading state implicitly (API call blocks)
- Reloads data after successful deletion
- Uses `alert()` for error messages

### Decision

**Approach Chosen**: Hard delete for authors (permanent removal from database)

**Rationale**:
1. **Spec Requirement**: User explicitly requested "remove the author, and all of their books from the database" - indicating permanent deletion
2. **Different Use Case**: Books are soft-deleted because they might be re-imported from the Hardcover API. Authors don't have the same re-import concern for individual deletion
3. **Simplicity**: Hard delete avoids maintaining a deleted flag and filtering logic throughout the application
4. **Consistency with Co-authored Books**: Co-authored books truly do lose the author association (not marked as deleted)

**Implementation Pattern**:
- Use `DELETE FROM authors WHERE id = ?` (permanent deletion)
- Leverage CASCADE DELETE to remove `book_authors` entries
- Explicitly delete sole-authored books afterward
- Wrap in transaction for atomicity

**Alternative Considered**: Soft delete for authors (add `deleted` flag)

**Why Rejected**:
- Adds complexity to all author queries (must filter `deleted = 0`)
- User's request clearly indicates permanent removal
- No business case for keeping deleted authors (unlike books which may be re-imported)
- Would require schema migration to add `deleted` column

---

## 3. Confirmation Modal Patterns

### Existing Modal Pattern

**File Examined**: `/home/mrdth/Development/VueJS/book-tracker/frontend/src/components/authors/EditAuthorModal.vue`

#### Modal Structure

The `EditAuthorModal` provides a reference implementation for modal dialogs:

**Props Pattern**:
```typescript
interface Props {
  author: AuthorWithBooks | null;
  open: boolean;
}

const props = defineProps<Props>();
```

**Events Pattern**:
```typescript
const emit = defineEmits<{
  close: [];
  save: [updates: { name?: string; bio?: string | null; photoUrl?: string | null }];
}>();
```

**State Management**:
```typescript
const isSaving = ref(false);

const handleClose = () => {
  if (isSaving.value) return;  // Prevent closing during save
  emit('close');
};

const handleSave = async () => {
  if (isSaving.value || !props.author) return;
  // ... validation ...
  isSaving.value = true;
  emit('save', updates);
};
```

**Keyboard Handling**:
```typescript
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    handleClose();
  }
};
```

#### Styling Structure

- Uses `<Teleport to="body">` for portal rendering
- Modal overlay with click-outside-to-close
- Transition animations (`modal-enter-active`, `modal-leave-active`)
- Responsive design with mobile adaptations
- Consistent button styling (cancel vs action buttons)

#### Key Features

1. **Disabled State**: Buttons disabled during async operations (`isSaving`)
2. **Loading Feedback**: Spinner icon shown during save
3. **Click Outside**: Modal closes when clicking overlay
4. **Escape Key**: Closes modal with keyboard
5. **Form Validation**: Validates before allowing save
6. **Mobile Responsive**: Adjusts layout for small screens

### Decision

**Approach Chosen**: Create `DeleteAuthorModal.vue` following the same pattern as `EditAuthorModal.vue`

**Rationale**:
- Maintains UI consistency across the application
- Users already familiar with this modal interaction pattern
- Reuses existing styles and transitions
- Provides better UX than browser's native `confirm()` dialog
- Allows for rich content (author name, book counts, detailed messaging)

**Props for DeleteAuthorModal**:
```typescript
interface Props {
  author: AuthorWithBooks | null;
  open: boolean;
  soleAuthoredBookCount: number;
  coAuthoredBookCount: number;
}
```

**Events**:
```typescript
const emit = defineEmits<{
  close: [];
  confirm: [];
}>();
```

**Alternative Considered**: Use native `confirm()` dialog (like current book deletion)

**Why Rejected**:
- Cannot show rich formatting (author name, book counts)
- Doesn't match EditAuthorModal pattern
- Less accessible and customizable
- Cannot prevent closing during async operation
- Spec requires detailed confirmation messaging (FR-004)

---

## 4. Concurrent Operation Handling

### Current Bulk Update Pattern

**File Examined**: `/home/mrdth/Development/VueJS/book-tracker/frontend/src/pages/AuthorPage.vue`

#### Bulk Update State Management

```typescript
const isBulkMode = ref(false);
const selectedBookIds = ref<Set<number>>(new Set());
const isBulkUpdating = ref(false);
```

#### Concurrent Operation Prevention

```typescript
const handleBulkMarkAsOwned = async () => {
  if (selectedBookIds.value.size === 0 || isBulkUpdating.value) return;

  if (!confirm(`Mark ${selectedBookIds.value.size} book(s) as owned?`)) {
    return;
  }

  isBulkUpdating.value = true;
  try {
    await apiClient.bulkUpdateBooks({
      bookIds: Array.from(selectedBookIds.value),
      owned: true,
    });
    await loadAuthor();
    selectedBookIds.value.clear();
  } catch (err) {
    console.error('Failed to bulk update books:', err);
    alert(err instanceof Error ? err.message : 'Failed to update books');
  } finally {
    isBulkUpdating.value = false;
  }
};
```

#### UI Feedback

**BulkActionBar Component** (`/home/mrdth/Development/VueJS/book-tracker/frontend/src/components/books/BulkActionBar.vue`):

```typescript
interface Props {
  selectedCount: number;
  totalCount: number;
  allSelected: boolean;
  loading?: boolean;  // Passed from parent's isBulkUpdating
}

const canPerformActions = computed(() => {
  return props.selectedCount > 0 && !props.loading;
});
```

Buttons are disabled during bulk operations:
```vue
<button
  :disabled="!canPerformActions"
  class="action-button action-button--primary"
  @click="handleMarkAsOwned"
>
```

### Decision

**Approach Chosen**: Disable Delete button when `isBulkUpdating` is true, with visual feedback

**Rationale**:
- Follows existing pattern used throughout the application
- Prevents race conditions between deletion and bulk updates
- Provides clear visual feedback (disabled button state)
- No additional state management required
- User understands why action is unavailable

**Implementation**:
```typescript
const isDeleteDisabled = computed(() => {
  return isBulkUpdating.value || isRefreshing.value;
});
```

```vue
<button
  :disabled="isDeleteDisabled"
  class="action-button action-button--danger"
  title="Delete author and their books"
  @click="handleDeleteAuthor"
>
```

**Alternative Considered**: Allow concurrent operations and handle conflicts server-side

**Why Rejected**:
- Increases complexity on backend
- Could lead to confusing user experience (deletion during bulk update)
- Spec explicitly requires prevention (FR-017: "MUST disable the Delete button when bulk operations are in progress")
- Existing codebase pattern already solves this problem

---

## 5. Co-authored Book Identification

### Database Query Approach

#### Identifying Sole-Authored vs Co-Authored Books

**Query to find sole-authored books for a specific author**:

```sql
SELECT b.id, b.title
FROM books b
JOIN book_authors ba ON b.id = ba.book_id
WHERE ba.author_id = ?
  AND b.deleted = 0
GROUP BY b.id
HAVING COUNT(ba.author_id) = 1
```

**Query to find co-authored books for a specific author**:

```sql
SELECT b.id, b.title
FROM books b
JOIN book_authors ba ON b.id = ba.book_id
WHERE ba.author_id = ?
  AND b.deleted = 0
GROUP BY b.id
HAVING COUNT(ba.author_id) > 1
```

**Query to count both categories**:

```sql
SELECT 
  SUM(CASE WHEN author_count = 1 THEN 1 ELSE 0 END) as soleAuthoredCount,
  SUM(CASE WHEN author_count > 1 THEN 1 ELSE 0 END) as coAuthoredCount
FROM (
  SELECT b.id, COUNT(ba.author_id) as author_count
  FROM books b
  JOIN book_authors ba ON b.id = ba.book_id
  WHERE ba.author_id = ?
    AND b.deleted = 0
  GROUP BY b.id
)
```

### Decision

**Approach Chosen**: Implement `getBookDeletionInfo` method in `AuthorService` to categorize books before deletion

**Implementation**:

```typescript
/**
 * Get information about books that will be affected by author deletion
 * Returns counts and IDs of sole-authored vs co-authored books
 */
getBookDeletionInfo(authorId: number): {
  soleAuthoredBooks: number[];
  soleAuthoredCount: number;
  coAuthoredBooks: number[];
  coAuthoredCount: number;
} {
  const stmt = this.db.prepare(`
    SELECT 
      b.id,
      COUNT(ba.author_id) as authorCount
    FROM books b
    JOIN book_authors ba ON b.id = ba.book_id
    WHERE ba.author_id = ?
      AND b.deleted = 0
    GROUP BY b.id
  `);

  const results = stmt.all(authorId) as { id: number; authorCount: number }[];
  
  const soleAuthoredBooks: number[] = [];
  const coAuthoredBooks: number[] = [];
  
  for (const result of results) {
    if (result.authorCount === 1) {
      soleAuthoredBooks.push(result.id);
    } else {
      coAuthoredBooks.push(result.id);
    }
  }
  
  return {
    soleAuthoredBooks,
    soleAuthoredCount: soleAuthoredBooks.length,
    coAuthoredBooks,
    coAuthoredCount: coAuthoredBooks.length,
  };
}
```

**Rationale**:
- Single query fetches all books with author counts
- Application-level filtering is simple and readable
- Returns both counts (for UI) and IDs (for deletion)
- Excludes already-deleted books (`b.deleted = 0`)
- Efficient: one query instead of two separate queries

**Alternative Considered**: Use two separate queries (one for sole-authored, one for co-authored)

**Why Rejected**:
- Less efficient (two queries instead of one)
- More code to maintain
- GROUP BY with HAVING is standard SQL pattern
- Single query is easier to test and debug

---

## Summary of Decisions

### 1. Database CASCADE DELETE
- **Decision**: Rely on CASCADE DELETE for junction table cleanup, implement application-level logic for orphaned books
- **Rationale**: Database handles referential integrity, application ensures business logic (sole vs co-authored)

### 2. Deletion Type
- **Decision**: Hard delete (permanent removal)
- **Rationale**: Matches user request, no re-import concern, simpler implementation

### 3. API Pattern
- **Decision**: `DELETE /api/authors/:id` endpoint following REST conventions
- **Rationale**: Consistent with existing API design, standard HTTP method for deletion

### 4. Confirmation Modal
- **Decision**: Create `DeleteAuthorModal.vue` component matching `EditAuthorModal.vue` pattern
- **Rationale**: Consistent UI, rich messaging, better UX than native confirm()

### 5. Concurrent Operations
- **Decision**: Disable Delete button when `isBulkUpdating` is true
- **Rationale**: Follows existing pattern, prevents race conditions, clear user feedback

### 6. Book Categorization
- **Decision**: Single SQL query with GROUP BY to identify sole vs co-authored books
- **Rationale**: Efficient, returns both counts and IDs, easy to maintain

### 7. Transaction Handling
- **Decision**: Wrap deletion in database transaction (all-or-nothing)
- **Rationale**: Ensures atomicity, prevents partial deletions, maintains data integrity

### 8. Error Handling
- **Decision**: Keep user on author page with error message on failure
- **Rationale**: Allows retry, consistent with existing error handling patterns

### 9. Success Handling
- **Decision**: Redirect to authors list page after successful deletion
- **Rationale**: Author page no longer valid, matches user expectations

### 10. Loading State
- **Decision**: Disable Delete button and show loading indicator during deletion
- **Rationale**: Prevents duplicate requests, provides feedback, matches existing patterns

---

## Key Code Locations

### Backend
- **Database Schema**: `/home/mrdth/Development/VueJS/book-tracker/backend/src/db/schema.sql`
- **Author Model**: `/home/mrdth/Development/VueJS/book-tracker/backend/src/models/Author.ts`
- **Book Model**: `/home/mrdth/Development/VueJS/book-tracker/backend/src/models/Book.ts`
- **BookAuthor Model**: `/home/mrdth/Development/VueJS/book-tracker/backend/src/models/BookAuthor.ts`
- **Author Service**: `/home/mrdth/Development/VueJS/book-tracker/backend/src/services/AuthorService.ts`
- **Author Routes**: `/home/mrdth/Development/VueJS/book-tracker/backend/src/api/routes/authors.ts`

### Frontend
- **Author Page**: `/home/mrdth/Development/VueJS/book-tracker/frontend/src/pages/AuthorPage.vue`
- **Edit Modal**: `/home/mrdth/Development/VueJS/book-tracker/frontend/src/components/authors/EditAuthorModal.vue`
- **Bulk Action Bar**: `/home/mrdth/Development/VueJS/book-tracker/frontend/src/components/books/BulkActionBar.vue`

---

## Implementation Notes

### Deletion Flow

1. **Frontend**:
   - User clicks Delete button
   - `DeleteAuthorModal` opens with author name and book counts
   - User confirms or cancels
   - On confirm, call `apiClient.deleteAuthor(authorId)`
   - Show loading state
   - On success: redirect to `/authors`
   - On error: show error message, stay on page

2. **Backend**:
   - Receive `DELETE /api/authors/:id` request
   - Validate author exists
   - Get book deletion info (sole vs co-authored)
   - Begin transaction:
     - Delete sole-authored books (hard delete)
     - Delete author (CASCADE removes book_authors)
   - Commit transaction
   - Return success response

### Edge Cases Handled

1. **Author already deleted**: Return 404 error
2. **Author with 0 books**: Delete author only
3. **Author with only co-authored books**: Delete author, preserve all books
4. **Author with only sole-authored books**: Delete author and all books
5. **Mixed authorship**: Delete author, delete sole-authored, preserve co-authored
6. **Concurrent bulk operation**: Disable Delete button
7. **Network/database error**: Show error, no partial deletion
8. **Very large book count**: Rely on database performance (no timeout)

---

## Testing Strategy

### Unit Tests
- Test SQL queries for book categorization
- Test transaction rollback on error
- Test CASCADE DELETE behavior

### Integration Tests
- Test full deletion flow (author + books)
- Test co-authored book preservation
- Test error handling and rollback
- Test concurrent operation prevention

### Contract Tests
- Test `DELETE /api/authors/:id` endpoint
- Test 404 for non-existent author
- Test 200 for successful deletion
- Test response format

### E2E Tests
- Test UI deletion flow with confirmation
- Test redirect after deletion
- Test error message display
- Test disabled state during bulk operations
