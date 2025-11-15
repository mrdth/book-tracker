# API Contract: Author Deletion

**Feature**: 003-author-deletion  
**Date**: 2025-11-15  
**API Version**: 1.0

## Overview

This contract defines the REST API endpoint for permanently deleting an author and their associated books from the system.

## Endpoint

### Delete Author

**DELETE** `/api/authors/:id`

Permanently removes an author from the database. Sole-authored books are deleted, co-authored books are preserved with the author association removed.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | The internal author ID |

#### Request

**Headers**:
```
Content-Type: application/json
```

**Body**: None

**Example Request**:
```http
DELETE /api/authors/42 HTTP/1.1
Host: localhost:3001
Content-Type: application/json
```

#### Response

##### Success Response (200 OK)

Returned when the author and their books are successfully deleted.

**Body**:
```json
{
  "message": "Author deleted successfully",
  "deletedAuthorId": 42,
  "deletedBooksCount": 15,
  "preservedBooksCount": 3
}
```

**Response Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `message` | string | Success confirmation message |
| `deletedAuthorId` | integer | ID of the deleted author |
| `deletedBooksCount` | integer | Number of sole-authored books that were deleted |
| `preservedBooksCount` | integer | Number of co-authored books that were preserved (author association removed) |

**Example**:
```json
{
  "message": "Author deleted successfully",
  "deletedAuthorId": 42,
  "deletedBooksCount": 15,
  "preservedBooksCount": 3
}
```

##### Error Responses

###### 404 Not Found

Returned when the author does not exist.

**Body**:
```json
{
  "error": "Not Found",
  "message": "Author with id 42 not found",
  "statusCode": 404
}
```

###### 400 Bad Request

Returned when the author ID parameter is invalid.

**Body**:
```json
{
  "error": "Bad Request",
  "message": "Invalid author ID",
  "statusCode": 400
}
```

###### 500 Internal Server Error

Returned when a database error occurs during deletion.

**Body**:
```json
{
  "error": "Internal Server Error",
  "message": "Failed to delete author: <error details>",
  "statusCode": 500
}
```

## Business Logic

### Deletion Process

1. **Validate author ID**: Must be a positive integer
2. **Verify author exists**: Return 404 if not found
3. **Categorize books**:
   - Sole-authored: Books with only this author
   - Co-authored: Books with this author + other authors
4. **Execute transaction**:
   - Delete all sole-authored books
   - Delete author record (CASCADE removes book_authors entries)
5. **Return counts**: Books deleted vs preserved

### Book Categorization Logic

**Sole-Authored Book**:
- Book has exactly one entry in `book_authors` for this author
- Action: DELETE from `books` table
- Result: Book and all associations removed

**Co-Authored Book**:
- Book has multiple entries in `book_authors` including this author
- Action: DELETE from `book_authors` for this author only (via CASCADE)
- Result: Book remains, author association removed

### Transaction Guarantees

- **Atomicity**: All deletions succeed or none do (no partial deletions)
- **Consistency**: Referential integrity maintained via CASCADE constraints
- **Isolation**: Transaction prevents concurrent modification
- **Durability**: Changes committed to database before response sent

## Frontend Integration

### API Client Method

```typescript
async deleteAuthor(authorId: number): Promise<{
  message: string;
  deletedAuthorId: number;
  deletedBooksCount: number;
  preservedBooksCount: number;
}> {
  const response = await fetch(`${this.baseURL}/api/authors/${authorId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete author');
  }

  return response.json();
}
```

### Usage Example

```typescript
try {
  const result = await apiClient.deleteAuthor(42);
  console.log(`Deleted ${result.deletedBooksCount} books, preserved ${result.preservedBooksCount}`);
  router.push('/authors'); // Redirect to authors list
} catch (error) {
  console.error('Delete failed:', error);
  alert(error.message); // Show error to user
}
```

## Service Layer Contract

### AuthorService.deleteAuthor()

```typescript
/**
 * Delete an author and their associated books
 * 
 * Sole-authored books are permanently deleted.
 * Co-authored books are preserved with author association removed.
 * Operation is atomic - all changes succeed or all are rolled back.
 * 
 * @param authorId - The internal author ID to delete
 * @returns Deletion summary with counts
 * @throws Error if author not found or database operation fails
 */
deleteAuthor(authorId: number): {
  deletedAuthorId: number;
  deletedBooksCount: number;
  preservedBooksCount: number;
}
```

### Implementation Requirements

1. **Validate input**: Verify authorId is a positive integer
2. **Check existence**: Throw error if author not found
3. **Query book categorization**:
   ```sql
   SELECT b.id, COUNT(ba.author_id) as author_count
   FROM books b
   JOIN book_authors ba ON b.id = ba.book_id
   WHERE ba.author_id = ?
   GROUP BY b.id, ba.book_id
   ```
4. **Categorize results**:
   - `author_count === 1`: Add to soleAuthoredBooks array
   - `author_count > 1`: Add to coAuthoredBooks array (tracked for counts only)
5. **Execute transaction**:
   ```typescript
   db.transaction(() => {
     // Delete sole-authored books
     for (const bookId of soleAuthoredBooks) {
       bookModel.delete(bookId); // Hard delete
     }
     // Delete author (CASCADE handles book_authors cleanup)
     authorModel.delete(authorId); // Hard delete
   })();
   ```
6. **Return summary**: Counts of deleted and preserved books

## Error Handling

### Error Scenarios

| Scenario | HTTP Status | Error Message | Frontend Action |
|----------|-------------|---------------|-----------------|
| Author not found | 404 | "Author with id {id} not found" | Show error, stay on page |
| Invalid author ID | 400 | "Invalid author ID" | Show error, stay on page |
| Database error | 500 | "Failed to delete author: {details}" | Show error, stay on page |
| Transaction rollback | 500 | "Failed to delete author: transaction failed" | Show error, stay on page |

### Partial Deletion Prevention

**Guaranteed by transaction**:
- If sole-authored book deletion fails → rollback, author remains
- If author deletion fails → rollback, books remain
- No scenario results in partial deletion

**Validation**:
- Transaction SUCCESS: author deleted, correct books deleted/preserved
- Transaction FAILURE: nothing changed, error returned

## Testing Contract

### Contract Test Cases

**Test 1: Delete author with sole-authored books only**
```typescript
Given: Author with id=1, 5 sole-authored books
When: DELETE /api/authors/1
Then: 
  - Status: 200
  - Response: { deletedBooksCount: 5, preservedBooksCount: 0 }
  - Database: author removed, 5 books removed
```

**Test 2: Delete author with co-authored books only**
```typescript
Given: Author with id=2, 3 co-authored books
When: DELETE /api/authors/2
Then:
  - Status: 200
  - Response: { deletedBooksCount: 0, preservedBooksCount: 3 }
  - Database: author removed, 3 books remain, book_authors entries removed
```

**Test 3: Delete author with mixed books**
```typescript
Given: Author with id=3, 4 sole-authored books, 2 co-authored books
When: DELETE /api/authors/3
Then:
  - Status: 200
  - Response: { deletedBooksCount: 4, preservedBooksCount: 2 }
  - Database: author removed, 4 books removed, 2 books remain
```

**Test 4: Delete non-existent author**
```typescript
Given: No author with id=999
When: DELETE /api/authors/999
Then:
  - Status: 404
  - Response: { error: "Not Found", message: "Author with id 999 not found" }
  - Database: unchanged
```

**Test 5: Transaction rollback on error**
```typescript
Given: Author with id=4, database constraint violation triggered
When: DELETE /api/authors/4
Then:
  - Status: 500
  - Response: { error: "Internal Server Error", message: "..." }
  - Database: unchanged (transaction rolled back)
```

**Test 6: Invalid author ID**
```typescript
Given: Request with invalid ID
When: DELETE /api/authors/abc
Then:
  - Status: 400
  - Response: { error: "Bad Request", message: "Invalid author ID" }
```

### Integration Test Cases

**Frontend Integration Tests**:
1. Click Delete → shows confirmation modal with correct counts
2. Confirm deletion → shows loading state → redirects on success
3. Cancel deletion → closes modal, no API call
4. Delete fails → shows error message, stays on page
5. Bulk operation active → Delete button disabled

## Versioning

**Current Version**: 1.0  
**Stability**: Draft  
**Breaking Changes**: None (new endpoint)

## Notes

- **No soft delete**: Authors are permanently removed (hard delete)
- **No undo**: Deletion is permanent, user must confirm via modal
- **No logging**: Per clarification #2, deletion events are not logged
- **No auth**: Assumes existing session/auth middleware handles authorization
- **Performance**: No timeout limits, relies on database transaction performance
- **Concurrency**: Frontend prevents concurrent operations via UI state
