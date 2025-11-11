# API Contract: Authors List Endpoint

**Feature**: Authors Homepage  
**Branch**: `002-authors-homepage`  
**Date**: 2025-11-11  
**Endpoint**: `POST /api/authors/list`

## Overview

This endpoint provides paginated access to the authors list with optional alphabetical filtering. It supports cursor-based pagination for consistent performance at scale (10,000+ authors) and returns authors sorted by last name, then first name.

---

## Request

### HTTP Method

```
POST /api/authors/list
```

### Headers

```
Content-Type: application/json
```

### Request Body Schema

```typescript
interface AuthorsListRequest {
  cursor?: {
    name: string;    // Last sort_name from previous page
    id: number;      // Last author ID from previous page
  } | null;
  letterFilter?: string | null;  // Single letter A-Z for filtering
  limit?: number;                 // Number of results (default: 50, max: 100)
}
```

### Request Body Examples

**Example 1: First page (no filter)**
```json
{
  "cursor": null,
  "letterFilter": null,
  "limit": 50
}
```

**Example 2: Next page (continuing pagination)**
```json
{
  "cursor": {
    "name": "Christie, Agatha",
    "id": 123
  },
  "letterFilter": null,
  "limit": 50
}
```

**Example 3: First page with letter filter**
```json
{
  "cursor": null,
  "letterFilter": "M",
  "limit": 50
}
```

**Example 4: Next page with letter filter**
```json
{
  "cursor": {
    "name": "Martin, George R.R.",
    "id": 456
  },
  "letterFilter": "M",
  "limit": 50
}
```

### Field Validation

| Field | Required | Type | Constraints | Default |
|-------|----------|------|-------------|---------|
| `cursor` | No | Object \| null | Must include both `name` (string) and `id` (number) if provided | null |
| `cursor.name` | If cursor provided | string | Non-empty string | N/A |
| `cursor.id` | If cursor provided | number | Positive integer | N/A |
| `letterFilter` | No | string \| null | Single uppercase letter A-Z | null |
| `limit` | No | number | Integer between 1 and 100 | 50 |

### Validation Rules

1. **cursor**: If provided, must be an object with both `name` and `id` properties
   - Error if only one property is provided
   - Error if `id` is not a positive integer
   - Error if `name` is empty string

2. **letterFilter**: If provided, must be a single uppercase letter A-Z
   - Automatically convert lowercase to uppercase
   - Error if multiple characters
   - Error if not a letter

3. **limit**: If provided, must be between 1 and 100
   - Values > 100 capped at 100
   - Values < 1 default to 50
   - Non-integer values rounded down

### Error Responses (400 Bad Request)

```json
{
  "error": "Invalid request",
  "message": "letterFilter must be a single letter A-Z",
  "code": "VALIDATION_ERROR"
}
```

```json
{
  "error": "Invalid request",
  "message": "cursor must include both name and id properties",
  "code": "VALIDATION_ERROR"
}
```

```json
{
  "error": "Invalid request",
  "message": "limit must be between 1 and 100",
  "code": "VALIDATION_ERROR"
}
```

---

## Response

### Success Response (200 OK)

```typescript
interface AuthorsListResponse {
  authors: AuthorListItem[];
  hasMore?: boolean;  // Optional: indicates if more results exist
}

interface AuthorListItem {
  id: number;
  externalId: string;
  name: string;
  bio: string | null;
  photoUrl: string | null;
  bookCount: number;
  createdAt: string;   // ISO 8601 timestamp
  updatedAt: string;   // ISO 8601 timestamp
}
```

### Response Examples

**Example 1: Successful first page**
```json
{
  "authors": [
    {
      "id": 1,
      "externalId": "12345",
      "name": "Agatha Christie",
      "bio": "Agatha Christie was an English writer known for her 66 detective novels...",
      "photoUrl": "https://example.com/photos/agatha-christie.jpg",
      "bookCount": 66,
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-01-15T10:30:00.000Z"
    },
    {
      "id": 2,
      "externalId": "67890",
      "name": "Stephen King",
      "bio": null,
      "photoUrl": null,
      "bookCount": 80,
      "createdAt": "2025-01-16T14:20:00.000Z",
      "updatedAt": "2025-01-16T14:20:00.000Z"
    }
  ],
  "hasMore": true
}
```

**Example 2: Empty result (no authors found)**
```json
{
  "authors": [],
  "hasMore": false
}
```

**Example 3: Last page (fewer than limit)**
```json
{
  "authors": [
    {
      "id": 9999,
      "externalId": "99999",
      "name": "Zadie Smith",
      "bio": "Zadie Smith is an English novelist, essayist, and short-story writer...",
      "photoUrl": "https://example.com/photos/zadie-smith.jpg",
      "bookCount": 7,
      "createdAt": "2025-02-20T09:15:00.000Z",
      "updatedAt": "2025-02-20T09:15:00.000Z"
    }
  ],
  "hasMore": false
}
```

### Field Descriptions

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `authors` | Array | No | List of author objects matching the query |
| `authors[].id` | number | No | Internal database ID (unique) |
| `authors[].externalId` | string | No | Hardcover API author ID (unique) |
| `authors[].name` | string | No | Full author name for display (e.g., "Agatha Christie") |
| `authors[].bio` | string | Yes | Author biography (null if not available) |
| `authors[].photoUrl` | string | Yes | URL to author photo (null if not available) |
| `authors[].bookCount` | number | No | Count of non-deleted books by this author |
| `authors[].createdAt` | string | No | ISO 8601 timestamp of record creation |
| `authors[].updatedAt` | string | No | ISO 8601 timestamp of last update |
| `hasMore` | boolean | Yes (optional) | True if more results available, false if last page |

### Sorting Guarantee

Authors are **always sorted by last name, then first name** (case-insensitive):

```
Abel, Adam
Brown, Charlie
Smith, Alice
Smith, Bob
Zeta, Zelda
```

This ordering is guaranteed by the `sort_name` column with `COLLATE NOCASE` sorting.

---

## Error Responses

### 400 Bad Request

Invalid request parameters.

```json
{
  "error": "Invalid request",
  "message": "letterFilter must be a single letter A-Z",
  "code": "VALIDATION_ERROR"
}
```

**Causes**:
- Invalid cursor format
- Invalid letterFilter (not A-Z)
- Invalid limit (not between 1-100)

### 500 Internal Server Error

Server-side error during query execution.

```json
{
  "error": "Internal server error",
  "message": "Database query failed",
  "code": "INTERNAL_ERROR"
}
```

**Causes**:
- Database connection failure
- Malformed SQL query (implementation bug)
- Unexpected data type in database

---

## Pagination Strategy

### Cursor-Based Pagination

This endpoint uses **cursor-based pagination** instead of offset-based pagination for consistent performance:

**Why cursor-based?**
- Consistent query time (~0.5ms) regardless of page depth
- OFFSET performance degrades linearly (page 200 at 10,000 records: ~20ms vs ~0.5ms)
- Handles data changes gracefully (no duplicate/skipped records)

**How it works:**
1. Client requests first page with `cursor: null`
2. Server returns 50 authors sorted by `sort_name`
3. Client extracts last author's `name` and `id` as cursor
4. Client requests next page with `cursor: { name: "...", id: 123 }`
5. Server returns next 50 authors after that cursor
6. Repeat until `authors.length < limit` (last page)

**Example flow:**

```typescript
// Request 1: First page
POST /api/authors/list
{ "cursor": null, "limit": 50 }

// Response 1: Authors 1-50
{ "authors": [ /* 50 authors */ ] }

// Extract cursor from last author
const lastAuthor = response.authors[response.authors.length - 1];
const cursor = { name: lastAuthor.name, id: lastAuthor.id };

// Request 2: Second page
POST /api/authors/list
{ "cursor": { "name": "Christie, Agatha", "id": 123 }, "limit": 50 }

// Response 2: Authors 51-100
{ "authors": [ /* 50 authors */ ] }

// Continue until authors.length < 50 (last page)
```

### Letter Filtering

When `letterFilter` is provided, only authors whose `sort_name` starts with that letter are returned:

**Example: Filter by "M"**
```
Request: { "letterFilter": "M", "cursor": null }

Returns authors:
- "Martin, George R.R."
- "Morrison, Toni"
- "Murakami, Haruki"

Does NOT return:
- "Christie, Agatha" (starts with C)
- "Rowling, J.K." (starts with R)
```

**Important**: When filter changes, reset cursor to `null`:
```typescript
function applyLetterFilter(letter: string) {
  currentFilter = letter;
  currentCursor = null;  // ← Reset cursor!
  authors.value = [];    // Clear existing list
  loadMore();            // Fetch first page with new filter
}
```

---

## Performance Characteristics

### Expected Response Times

| Scenario | Authors in DB | Page Position | Expected Time |
|----------|---------------|---------------|---------------|
| No filter | 10,000 | Page 1 | < 1ms |
| No filter | 10,000 | Page 200 | < 1ms |
| Filter "M" | 10,000 | Page 1 | < 1ms |
| Filter "M" | 10,000 | Page 50 | < 1ms |

**Note**: Times exclude network latency. Includes database query + JSON serialization.

### Payload Size

| Number of Authors | Avg Bio Length | Payload Size |
|-------------------|----------------|--------------|
| 1 author | 200 chars | ~500 bytes |
| 50 authors | 200 chars | ~25 KB |
| 50 authors | 0 chars (no bio) | ~10 KB |

**Optimization**: Bio field is included in full. Consider truncation at API level if payload size becomes issue (not currently needed per spec).

---

## Usage Examples

### Frontend Integration (TypeScript)

```typescript
// composables/useAuthorsList.ts
import { ref, type Ref } from 'vue';

interface PaginationCursor {
  name: string;
  id: number;
}

interface Author {
  id: number;
  externalId: string;
  name: string;
  bio: string | null;
  photoUrl: string | null;
  bookCount: number;
  createdAt: string;
  updatedAt: string;
}

export function useAuthorsList(letterFilter?: Ref<string | null>) {
  const authors = ref<Author[]>([]);
  const loading = ref(false);
  const error = ref<Error | null>(null);
  const hasMore = ref(true);
  const cursor = ref<PaginationCursor | null>(null);

  const loadMore = async () => {
    if (loading.value || !hasMore.value) return;

    loading.value = true;
    error.value = null;

    try {
      const response = await fetch('/api/authors/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cursor: cursor.value,
          letterFilter: letterFilter?.value || null,
          limit: 50,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to load authors');
      }

      const data = await response.json();

      if (data.authors.length < 50) {
        hasMore.value = false;
      }

      authors.value.push(...data.authors);

      // Update cursor for next page
      if (data.authors.length > 0) {
        const last = data.authors[data.authors.length - 1];
        cursor.value = { name: last.name, id: last.id };
      }
    } catch (e) {
      error.value = e as Error;
      console.error('Failed to load authors:', e);
    } finally {
      loading.value = false;
    }
  };

  // Reset when filter changes
  watch(letterFilter, () => {
    authors.value = [];
    cursor.value = null;
    hasMore.value = true;
    loadMore();
  });

  return { authors, loading, error, hasMore, loadMore };
}
```

### Backend Implementation Reference

```typescript
// backend/src/api/routes/authors.ts
router.post('/list', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cursor, letterFilter, limit = 50 } = req.body;

    // Validation
    if (letterFilter && !/^[A-Z]$/.test(letterFilter.toUpperCase())) {
      throw errors.validationError('letterFilter must be a single letter A-Z');
    }

    if (cursor && (!cursor.name || !cursor.id)) {
      throw errors.validationError('cursor must include both name and id properties');
    }

    const cappedLimit = Math.min(Math.max(limit, 1), 100);

    // Build query
    let query = `
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
      WHERE 1=1
    `;

    const params: any[] = [];

    if (letterFilter) {
      query += ` AND a.sort_name LIKE ?`;
      params.push(`${letterFilter.toUpperCase()}%`);
    }

    if (cursor) {
      query += ` AND (a.sort_name, a.id) > (?, ?)`;
      params.push(cursor.name, cursor.id);
    }

    query += ` ORDER BY a.sort_name COLLATE NOCASE ASC LIMIT ?`;
    params.push(cappedLimit);

    const stmt = db.prepare(query);
    const authors = stmt.all(...params);

    logger.info('API response: Authors list retrieved', {
      count: authors.length,
      letterFilter: letterFilter || null,
      hasCursor: !!cursor,
    });

    res.json({ 
      authors,
      hasMore: authors.length === cappedLimit  // Optional hint
    });
  } catch (error) {
    next(error);
  }
});
```

---

## Testing Contract

### Unit Test Cases

1. **First page (no filter)**
   - Request: `{ cursor: null, letterFilter: null, limit: 50 }`
   - Assert: Returns first 50 authors sorted by `sort_name`

2. **Second page (cursor provided)**
   - Request: `{ cursor: { name: "Christie, Agatha", id: 123 }, limit: 50 }`
   - Assert: Returns next 50 authors after "Christie, Agatha"

3. **Letter filter "M"**
   - Request: `{ cursor: null, letterFilter: "M", limit: 50 }`
   - Assert: All returned authors have `sort_name` starting with "M"

4. **Letter filter with cursor**
   - Request: `{ cursor: { name: "Martin, George", id: 456 }, letterFilter: "M", limit: 50 }`
   - Assert: Returns authors after "Martin, George" whose `sort_name` starts with "M"

5. **Invalid letterFilter**
   - Request: `{ letterFilter: "ABC" }`
   - Assert: 400 Bad Request with validation error

6. **Invalid cursor (missing id)**
   - Request: `{ cursor: { name: "Christie" } }`
   - Assert: 400 Bad Request with validation error

7. **Limit over maximum**
   - Request: `{ limit: 500 }`
   - Assert: Returns at most 100 authors (capped)

8. **Empty result**
   - Request: `{ letterFilter: "X" }` (assuming no authors start with X)
   - Assert: `{ authors: [], hasMore: false }`

### Integration Test Cases

1. **Pagination consistency**
   - Load all pages sequentially
   - Assert: No duplicate authors, no skipped authors, all sorted correctly

2. **Filter changes**
   - Load page 1 with filter "A"
   - Change filter to "B" (reset cursor)
   - Assert: New results start from beginning of "B" authors

3. **Performance at scale**
   - Insert 10,000 test authors
   - Load page 200 (cursor at position 10,000)
   - Assert: Response time < 10ms

4. **Concurrent requests**
   - Issue multiple pagination requests in parallel
   - Assert: Each request returns consistent results

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-11 | Initial contract definition |

---

## References

- **Feature Spec**: [spec.md](../spec.md)
- **Data Model**: [data-model.md](../data-model.md)
- **Research**: [research.md](../research.md) (Section 2: SQL Pagination Strategy)
- **Implementation**: `backend/src/api/routes/authors.ts` (to be created)

---

**Contract Version**: 1.0  
**Last Updated**: 2025-11-11  
**Status**: Draft (pending implementation)
