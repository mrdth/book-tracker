# Hardcover GraphQL API Contracts

**Date**: 2025-11-08  
**Feature**: Book Tracker Application  
**Branch**: 001-book-tracker

## Overview

This document defines the GraphQL queries and mutations used to interact with the Hardcover API (`https://hardcover.app/graphql`). These contracts specify the exact data fields requested from the external API to support the book tracker application's search and import features.

**Note**: Hardcover API schema may evolve. These contracts are based on available documentation and may require adjustment during implementation based on actual API responses.

---

## Authentication

**API Key**: Required for Hardcover API access (configuration TBD during implementation)

**Headers**:
```http
Authorization: Bearer <API_KEY>
Content-Type: application/json
```

**Rate Limiting**: Hardcover API rate limits unknown - implementation must include client-side throttling with exponential backoff (FR-031)

---

## Queries

### 1. Search Books by Title

**Purpose**: Find books matching a title search query (FR-001, FR-002, User Story 1)

**GraphQL Query**:
```graphql
query SearchBooksByTitle($title: String!, $limit: Int!, $offset: Int!) {
  books(
    where: { title: { _ilike: $title } }
    limit: $limit
    offset: $offset
  ) {
    id
    title
    isbn
    description
    release_year
    image
    authors {
      id
      name
      bio
      image
    }
  }
}
```

**Variables**:
```json
{
  "title": "%Gatsby%",
  "limit": 50,
  "offset": 0
}
```

**Field Mapping**:
| Hardcover Field | Local Database Field | Notes |
|----------------|---------------------|-------|
| `id` | `external_id` | Unique book identifier |
| `title` | `title` | Book title |
| `isbn` | `isbn` | ISBN identifier (may be null) |
| `description` | `description` | Book synopsis |
| `release_year` | `publication_date` | Year only, format as ISO 8601 date |
| `image` | `cover_url` | URL to book cover image |
| `authors[].id` | `authors.external_id` | Author unique identifier |
| `authors[].name` | `authors.name` | Author full name |
| `authors[].bio` | `authors.bio` | Author biography |
| `authors[].image` | `authors.photo_url` | Author photo URL |

**Response Example**:
```json
{
  "data": {
    "books": [
      {
        "id": "12345",
        "title": "The Great Gatsby",
        "isbn": "9780743273565",
        "description": "The story of the mysteriously wealthy Jay Gatsby...",
        "release_year": 1925,
        "image": "https://hardcover.app/covers/12345.jpg",
        "authors": [
          {
            "id": "67890",
            "name": "F. Scott Fitzgerald",
            "bio": "Francis Scott Key Fitzgerald was an American novelist...",
            "image": "https://hardcover.app/authors/67890.jpg"
          }
        ]
      }
    ]
  }
}
```

**Error Handling**:
- Empty results: Return empty array
- Invalid query: Return GraphQL error with message
- Rate limit exceeded: Retry with exponential backoff

---

### 2. Search Books by ISBN

**Purpose**: Find a book by exact ISBN match (FR-001, FR-002, User Story 4)

**GraphQL Query**:
```graphql
query SearchBooksByISBN($isbn: String!) {
  books(where: { isbn: { _eq: $isbn } }) {
    id
    title
    isbn
    description
    release_year
    image
    authors {
      id
      name
      bio
      image
    }
  }
}
```

**Variables**:
```json
{
  "isbn": "9780743273565"
}
```

**Field Mapping**: Same as Search Books by Title

**Response Example**: Same structure as Search Books by Title, typically single result

---

### 3. Search Authors by Name

**Purpose**: Find authors matching a name search query (FR-001, FR-002, User Story 2)

**GraphQL Query**:
```graphql
query SearchAuthorsByName($name: String!, $limit: Int!, $offset: Int!) {
  authors(
    where: { name: { _ilike: $name } }
    limit: $limit
    offset: $offset
  ) {
    id
    name
    bio
    image
    books_aggregate {
      aggregate {
        count
      }
    }
  }
}
```

**Variables**:
```json
{
  "name": "%Fitzgerald%",
  "limit": 50,
  "offset": 0
}
```

**Field Mapping**:
| Hardcover Field | Local Database Field | Notes |
|----------------|---------------------|-------|
| `id` | `external_id` | Unique author identifier |
| `name` | `name` | Author full name |
| `bio` | `bio` | Author biography |
| `image` | `photo_url` | Author photo URL |
| `books_aggregate.aggregate.count` | N/A (display only) | Book count for UI display |

**Response Example**:
```json
{
  "data": {
    "authors": [
      {
        "id": "67890",
        "name": "F. Scott Fitzgerald",
        "bio": "Francis Scott Key Fitzgerald was an American novelist...",
        "image": "https://hardcover.app/authors/67890.jpg",
        "books_aggregate": {
          "aggregate": {
            "count": 4
          }
        }
      }
    ]
  }
}
```

---

### 4. Get Author with Complete Bibliography

**Purpose**: Fetch an author and all their books for bulk import (FR-013, User Story 2)

**GraphQL Query**:
```graphql
query GetAuthorWithBooks($authorId: ID!) {
  author(id: $authorId) {
    id
    name
    bio
    image
    books {
      id
      title
      isbn
      description
      release_year
      image
      authors {
        id
        name
      }
    }
  }
}
```

**Variables**:
```json
{
  "authorId": "67890"
}
```

**Field Mapping**: Combines Author and Book field mappings from previous queries

**Response Example**:
```json
{
  "data": {
    "author": {
      "id": "67890",
      "name": "F. Scott Fitzgerald",
      "bio": "Francis Scott Key Fitzgerald was an American novelist...",
      "image": "https://hardcover.app/authors/67890.jpg",
      "books": [
        {
          "id": "12345",
          "title": "The Great Gatsby",
          "isbn": "9780743273565",
          "description": "The story of the mysteriously wealthy Jay Gatsby...",
          "release_year": 1925,
          "image": "https://hardcover.app/covers/12345.jpg",
          "authors": [
            {
              "id": "67890",
              "name": "F. Scott Fitzgerald"
            }
          ]
        },
        {
          "id": "23456",
          "title": "Tender Is the Night",
          "isbn": "9780684801544",
          "description": "A story of Americans living on the French Riviera...",
          "release_year": 1934,
          "image": "https://hardcover.app/covers/23456.jpg",
          "authors": [
            {
              "id": "67890",
              "name": "F. Scott Fitzgerald"
            }
          ]
        }
      ]
    }
  }
}
```

**Business Logic**:
- Iterate through `books` array
- For each book, check if already imported or deleted (skip if so)
- For each book, check filesystem for ownership
- Create book and BookAuthor associations
- Handle co-authored books (multiple authors in `authors` array)

---

### 5. Get Single Book by ID

**Purpose**: Fetch complete book details by Hardcover ID for import (FR-006, FR-012)

**GraphQL Query**:
```graphql
query GetBookById($bookId: ID!) {
  book(id: $bookId) {
    id
    title
    isbn
    description
    release_year
    image
    authors {
      id
      name
      bio
      image
    }
  }
}
```

**Variables**:
```json
{
  "bookId": "12345"
}
```

**Field Mapping**: Same as Search Books by Title

**Response Example**: Same structure as individual book in search results

**Business Logic**:
- Fetch book from Hardcover API
- Create or find existing author(s)
- Import only this book (do not import author's other books per FR-012)
- Check filesystem for ownership
- Create book and BookAuthor associations

---

### 6. Refresh Author Books (Latest Books)

**Purpose**: Get updated book list for an author to detect new publications (FR-016, User Story 3)

**GraphQL Query**:
```graphql
query RefreshAuthorBooks($authorId: ID!) {
  author(id: $authorId) {
    id
    books(order_by: { release_year: desc }) {
      id
      title
      isbn
      description
      release_year
      image
      authors {
        id
        name
      }
    }
  }
}
```

**Variables**:
```json
{
  "authorId": "67890"
}
```

**Field Mapping**: Same as Get Author with Complete Bibliography

**Business Logic**:
- Compare `books` from API with local database by `external_id`
- Skip books that are already imported (by `external_id`)
- Skip books that are marked as deleted (FR-024)
- Import only new books not in local database
- Update ownership status from filesystem scan
- Return summary: new books imported, skipped books with reasons

---

## Data Transformation

### Date Handling

Hardcover returns `release_year` (integer). Transform to ISO 8601 date:

```typescript
function transformReleaseYear(releaseYear: number | null): string | null {
  if (!releaseYear) return null;
  return `${releaseYear}-01-01`; // Default to January 1st of the year
}
```

### Multi-Author Handling

Hardcover returns `authors` array. Create multiple BookAuthor associations:

```typescript
for (const [index, author] of book.authors.entries()) {
  // Find or create author
  const authorId = await findOrCreateAuthor(author);
  
  // Create BookAuthor association
  await createBookAuthor({
    bookId: bookId,
    authorId: authorId,
    authorOrder: index // Preserve order from API
  });
}
```

---

## Error Handling

### GraphQL Errors

**Error Response Format**:
```json
{
  "errors": [
    {
      "message": "Book not found",
      "extensions": {
        "code": "NOT_FOUND"
      }
    }
  ]
}
```

**Error Categories**:
- `NOT_FOUND`: Resource doesn't exist (return 404 to frontend)
- `AUTHENTICATION_ERROR`: Invalid API key (log error, return 500)
- `RATE_LIMIT_EXCEEDED`: Too many requests (exponential backoff retry)
- `VALIDATION_ERROR`: Invalid query parameters (return 400 to frontend)
- `INTERNAL_SERVER_ERROR`: Hardcover API failure (log error, return 500)

### Rate Limiting Strategy (FR-031)

**Implementation**:
```typescript
class RateLimitedHardcoverClient {
  private lastRequest = 0;
  private minInterval = 1000; // 1 second between requests
  private maxRetries = 3;
  private baseBackoff = 2000; // 2 seconds base backoff

  async request<T>(query: string, variables: any): Promise<T> {
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        // Enforce minimum interval
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequest;
        if (timeSinceLastRequest < this.minInterval) {
          await sleep(this.minInterval - timeSinceLastRequest);
        }

        this.lastRequest = Date.now();
        return await this.client.request<T>(query, variables);
      } catch (error) {
        if (error.extensions?.code === 'RATE_LIMIT_EXCEEDED' && attempt < this.maxRetries - 1) {
          const backoff = this.baseBackoff * Math.pow(2, attempt); // Exponential backoff
          console.warn(`Rate limit exceeded, retrying in ${backoff}ms (attempt ${attempt + 1})`);
          await sleep(backoff);
        } else {
          throw error;
        }
      }
    }
  }
}
```

---

## Logging Requirements (FR-032)

### API Call Logging

**Level**: INFO

**Format**:
```typescript
logger.info('Hardcover API request', {
  query: 'SearchBooksByTitle',
  variables: { title: 'Gatsby', limit: 50, offset: 0 },
  timestamp: new Date().toISOString()
});

logger.info('Hardcover API response', {
  query: 'SearchBooksByTitle',
  resultCount: 1,
  duration: 245, // milliseconds
  timestamp: new Date().toISOString()
});
```

### Error Logging

**Level**: ERROR

**Format**:
```typescript
logger.error('Hardcover API error', {
  query: 'SearchBooksByTitle',
  variables: { title: 'Gatsby', limit: 50, offset: 0 },
  error: error.message,
  code: error.extensions?.code,
  stack: error.stack,
  timestamp: new Date().toISOString()
});
```

### Rate Limit Logging

**Level**: WARN

**Format**:
```typescript
logger.warn('Hardcover API rate limit', {
  query: 'GetAuthorWithBooks',
  retryAttempt: 1,
  backoffMs: 2000,
  timestamp: new Date().toISOString()
});
```

---

## Testing

### Mock Responses

For integration and unit tests, create mock GraphQL responses in `backend/tests/mocks/hardcover.ts`:

```typescript
export const mockBookSearchResponse = {
  data: {
    books: [
      {
        id: "test-book-1",
        title: "Test Book Title",
        isbn: "9781234567890",
        description: "Test description",
        release_year: 2020,
        image: "https://example.com/cover.jpg",
        authors: [
          {
            id: "test-author-1",
            name: "Test Author",
            bio: "Test bio",
            image: "https://example.com/author.jpg"
          }
        ]
      }
    ]
  }
};
```

### Contract Tests

Verify actual Hardcover API responses match expected schema:

```typescript
describe('Hardcover API Contract', () => {
  it('should return books matching SearchBooksByTitle schema', async () => {
    const response = await hardcoverClient.request(SEARCH_BOOKS_BY_TITLE, {
      title: 'Gatsby',
      limit: 1,
      offset: 0
    });

    expect(response.data.books).toBeDefined();
    expect(response.data.books[0]).toHaveProperty('id');
    expect(response.data.books[0]).toHaveProperty('title');
    expect(response.data.books[0]).toHaveProperty('authors');
  });
});
```

---

## Shared Query Definitions

Store queries in `shared/queries/hardcover.ts` for reuse across backend and frontend (if frontend calls Hardcover directly):

```typescript
// shared/queries/hardcover.ts
export const SEARCH_BOOKS_BY_TITLE = `
  query SearchBooksByTitle($title: String!, $limit: Int!, $offset: Int!) {
    books(
      where: { title: { _ilike: $title } }
      limit: $limit
      offset: $offset
    ) {
      id
      title
      isbn
      description
      release_year
      image
      authors {
        id
        name
        bio
        image
      }
    }
  }
`;

export const SEARCH_BOOKS_BY_ISBN = `
  query SearchBooksByISBN($isbn: String!) {
    books(where: { isbn: { _eq: $isbn } }) {
      id
      title
      isbn
      description
      release_year
      image
      authors {
        id
        name
        bio
        image
      }
    }
  }
`;

export const SEARCH_AUTHORS_BY_NAME = `
  query SearchAuthorsByName($name: String!, $limit: Int!, $offset: Int!) {
    authors(
      where: { name: { _ilike: $name } }
      limit: $limit
      offset: $offset
    ) {
      id
      name
      bio
      image
      books_aggregate {
        aggregate {
          count
        }
      }
    }
  }
`;

export const GET_AUTHOR_WITH_BOOKS = `
  query GetAuthorWithBooks($authorId: ID!) {
    author(id: $authorId) {
      id
      name
      bio
      image
      books {
        id
        title
        isbn
        description
        release_year
        image
        authors {
          id
          name
        }
      }
    }
  }
`;

export const GET_BOOK_BY_ID = `
  query GetBookById($bookId: ID!) {
    book(id: $bookId) {
      id
      title
      isbn
      description
      release_year
      image
      authors {
        id
        name
        bio
        image
      }
    }
  }
`;

export const REFRESH_AUTHOR_BOOKS = `
  query RefreshAuthorBooks($authorId: ID!) {
    author(id: $authorId) {
      id
      books(order_by: { release_year: desc }) {
        id
        title
        isbn
        description
        release_year
        image
        authors {
          id
          name
        }
      }
    }
  }
`;
```

---

## Constitution Alignment

These API contracts align with the project constitution:

- **Simplicity First**: Direct GraphQL queries, no complex client frameworks (using graphql-request)
- **Observable & Debuggable**: Comprehensive logging of all API interactions, structured error handling
- **User-Centric Design**: Fast search results (minimize API round-trips), clear error messages for API failures
- **Data Integrity**: Rate limiting prevents API quota exhaustion, duplicate checks prevent data corruption
