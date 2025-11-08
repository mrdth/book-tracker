# Research: Book Tracker Application Technology Stack

**Date**: 2025-11-08  
**Feature**: Book Tracker Application  
**Branch**: 001-book-tracker

## Overview

This document resolves all "NEEDS CLARIFICATION" items from plan.md Technical Context section through research of current best practices, library comparisons, and technology recommendations for the book tracker application.

---

## 1. Node.js Minimum Version

### Decision
**Target Node.js 22.x (Active LTS) with minimum requirement of Node.js 20.19+**

### Rationale
- Node.js 22 (codename "Jod") is the current Active LTS version as of November 2025, with support until April 2027
- Vite 6.x requires Node.js 20.19+ or 22.12+ minimum
- Node.js 22 includes native `fs.glob` and `fs.globSync` for filesystem scanning (directly relevant for collection ownership detection)
- ES2022 features are fully supported in Node.js 20+
- TypeScript targeting ES2022 works seamlessly with Node.js 20+
- Express.js and modern TypeScript tooling have no compatibility issues with Node 22

### Alternatives Considered
- **Node.js 20 (Iron)**: Currently in Maintenance LTS, supported until April 2026. Valid choice but shorter support timeline.
- **Node.js 18 (Hydrogen)**: Nearing end of life (April 2025), not recommended for new projects.

### Best Practices
- Set `"engines": { "node": ">=20.19.0" }` in package.json to enforce minimum version
- Use `"type": "module"` in package.json for native ES modules
- Configure TypeScript compiler options:
  ```json
  {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2023"]
  }
  ```

---

## 2. SQLite Library for Node.js

### Decision
**Use `better-sqlite3` for the book tracker application**

### Rationale

**TypeScript Support**: Excellent via `@types/better-sqlite3` (actively maintained, last updated April 2025). Type definitions include generics for bind parameters and results.

**API Design**: Synchronous API is ideal for this use case:
- Book imports are sequential operations (one at a time due to Hardcover API rate limiting)
- No benefit from async overhead for local database operations
- Simpler, more readable code with synchronous calls
- Easier error handling without promise chains

**Performance**: 
- Significantly faster than node-sqlite3 in most benchmarks
- Avoids unnecessary async overhead for serialized operations
- Better memory management with JavaScript garbage collection

**Ease of Use**:
- Straightforward API: `db.prepare(sql).run(params)`, `db.prepare(sql).get(params)`, `db.prepare(sql).all(params)`
- Prepared statements are first-class citizens
- Transactions are simple: `db.transaction(() => { ... })()`

**Active Maintenance**: 
- Actively maintained by WiseLibs
- Requires Node.js v14.21.1+ (well below the Node 20.19+ target)
- Large community, extensive documentation

### Alternatives Considered

**node-sqlite3 (sqlite3)**: 
- Asynchronous API with callbacks/promises
- More popular but performance disadvantages
- Unnecessary complexity for single-user, serialized operations
- Better suited for applications with heavy concurrent async patterns

**Prisma ORM**: 
- Full-featured ORM with excellent TypeScript support
- Overkill for this project's simple data model (books, authors, relationships)
- Violates "Simplicity First" constitution principle - adds migration tooling, schema files, code generation
- Harder to debug, more abstraction layers

**SQL.js**: 
- SQLite compiled to WebAssembly
- Designed for browser use, not ideal for Node.js backend

### Best Practices

**Installation**:
```bash
npm install better-sqlite3
npm install --save-dev @types/better-sqlite3
```

**TypeScript Usage Pattern**:
```typescript
import Database from 'better-sqlite3';
import type BetterSqlite3 from 'better-sqlite3';

const db: BetterSqlite3.Database = new Database('books.db');

// Prepared statements with type safety
interface BookRow {
  id: number;
  title: string;
  author_id: number;
}

const stmt = db.prepare<BookRow>('SELECT * FROM books WHERE author_id = ?');
const books = stmt.all(authorId);
```

**Transaction Pattern**:
```typescript
const insertMany = db.transaction((books: Book[]) => {
  const insert = db.prepare('INSERT INTO books (title, author_id) VALUES (?, ?)');
  for (const book of books) {
    insert.run(book.title, book.authorId);
  }
});

insertMany(booksArray); // Atomic transaction
```

---

## 3. GraphQL Client Library

### Decision
**Use `graphql-request` for both Node.js backend and Vue 3 frontend**

### Rationale

**Perfect Fit for Requirements**:
- Simplicity: Only need simple queries/mutations to Hardcover API (search books, get author details)
- No caching needed: Application caches in SQLite, not GraphQL client layer
- No subscriptions: Hardcover API doesn't offer real-time subscriptions
- No complex state management: Vue components display data fetched from Express backend

**TypeScript Support**: 
- Written in TypeScript with first-class type support
- Works excellently with GraphQL Code Generator for typed queries
- Simple type inference for query results

**Bundle Size** (Critical for Frontend):
- 13.2 KB minified + gzipped (vs Apollo Client's 33.9 KB, urql's 12 KB)
- Minimal impact on frontend performance
- No heavy dependencies

**Ease of Use**:
```typescript
import { GraphQLClient } from 'graphql-request';

const client = new GraphQLClient('https://hardcover.app/graphql');

const query = `
  query SearchBooks($title: String!) {
    books(title: $title) {
      id
      title
      author { name }
    }
  }
`;

const data = await client.request(query, { title: 'Gatsby' });
```

**Rate Limiting Capability**: 
- Lightweight client makes it easy to wrap with custom rate limiting logic (FR-031 requirement)
- Full control over request layer for implementing exponential backoff
- No built-in client-side rate limiting in Apollo/urql/graphql-request (all require custom implementation)

**Works in Both Environments**:
- Same API for Node.js backend and browser frontend
- Share query definitions between projects via `shared/` directory

### Alternatives Considered

**Apollo Client**:
- **Rejected**: Massive overkill (33.9 KB bundle size)
- Normalized caching not needed (SQLite handles caching)
- Complex API for simple use case
- Local state management features unused
- Steeper learning curve

**urql**:
- **Good alternative**: Lightweight (12 KB), modern, extensible
- **Rejected because**: Still more complex than needed
- Plugin system unused for this simple case
- Document caching unnecessary (fetch once, store in SQLite)

**Villus** (Vue-specific):
- **Rejected**: Only works in Vue, not Node.js backend
- Need a client for both environments
- Smaller (4 KB) but incompatible with Express backend

### Best Practices

**Installation**:
```bash
npm install graphql graphql-request
npm install --save-dev @graphql-codegen/cli @graphql-codegen/typescript
```

**Rate Limiting Wrapper** (Backend):
```typescript
import { GraphQLClient } from 'graphql-request';
import pLimit from 'p-limit';

class RateLimitedHardcoverClient {
  private client: GraphQLClient;
  private limiter = pLimit(1); // 1 concurrent request
  private lastRequest = 0;
  private minInterval = 1000; // 1 second between requests

  async request<T>(query: string, variables?: any): Promise<T> {
    return this.limiter(async () => {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequest;
      if (timeSinceLastRequest < this.minInterval) {
        await new Promise(resolve => 
          setTimeout(resolve, this.minInterval - timeSinceLastRequest)
        );
      }
      this.lastRequest = Date.now();
      return this.client.request<T>(query, variables);
    });
  }
}
```

**Shared Query Definitions** (`shared/queries/hardcover.ts`):
```typescript
export const SEARCH_BOOKS_BY_TITLE = `
  query SearchBooksByTitle($title: String!, $limit: Int!) {
    books(where: { title: { _ilike: $title } }, limit: $limit) {
      id
      title
      isbn
      description
      publication_date
      cover_url
      authors {
        id
        name
        bio
      }
    }
  }
`;
```

---

## 4. Vue 3 API Style

### Decision
**Use Composition API with `<script setup>` syntax for all Vue 3 components**

### Rationale

**Industry Direction (2025)**:
- By 2025, the Vue ecosystem has fully embraced Composition API
- Most modern libraries, plugins, and documentation are Composition-first
- Vue official docs recommend Composition API for new projects
- `<script setup>` syntax is mature with excellent IDE support

**TypeScript Integration** (Critical for this project):
- Superior type inference with Composition API
- Options API requires extensive type annotations and has weaker typing
- `<script setup>` provides automatic type inference for props, emits, refs
- Better IDE autocomplete and type checking

**Code Organization**:
- Group logic by feature, not by option type
- Easier to extract reusable logic into composables
- More maintainable as components grow

**Reusability**:
- Composables are the modern pattern for sharing logic (replaces mixins)
- Example: `useBookSearch()`, `useOwnershipStatus()`, `useHardcoverApi()`
- Clean separation of concerns

**Performance**:
- Composition API produces smaller bundles than Options API
- More efficient for tree-shaking unused code

**Project Size**: 
- Medium-complexity app (search, import, manage books/authors)
- Composition API scales better as features grow
- Easier to refactor and test

### Alternatives Considered

**Options API**:
- **Valid for**: Small projects, teams new to Vue, maintaining legacy code
- **Rejected because**: 
  - Weaker TypeScript support (critical requirement)
  - Less scalable for the feature set
  - Against 2025 ecosystem direction
  - Harder to share logic between components

**Mixed Approach** (both APIs):
- **Rejected**: Inconsistency makes codebase harder to understand
- Team members must know both styles
- No benefit for greenfield project

### Best Practices

**Component Structure** (Composition API + `<script setup>`):
```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { Book } from '@/shared/types/book';
import { useBookSearch } from '@/composables/useBookSearch';

// Props with automatic type inference
interface Props {
  authorId: number;
  showDeleted?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showDeleted: false
});

// Emits with type safety
const emit = defineEmits<{
  bookSelected: [book: Book];
  importComplete: [];
}>();

// Composable usage
const { books, loading, error, searchBooks } = useBookSearch();

// Local state
const selectedBooks = ref<Book[]>([]);

// Computed properties
const visibleBooks = computed(() => 
  props.showDeleted ? books.value : books.value.filter(b => !b.deleted)
);

// Methods
const handleImport = async (book: Book) => {
  // Import logic
  emit('importComplete');
};

onMounted(() => {
  searchBooks({ authorId: props.authorId });
});
</script>

<template>
  <div class="book-list">
    <div v-if="loading">Loading...</div>
    <div v-else-if="error">Error: {{ error.message }}</div>
    <div v-else>
      <BookCard
        v-for="book in visibleBooks"
        :key="book.id"
        :book="book"
        @import="handleImport"
      />
    </div>
  </div>
</template>
```

**Composable Pattern** (`composables/useBookSearch.ts`):
```typescript
import { ref, type Ref } from 'vue';
import type { Book } from '@/shared/types/book';
import { apiClient } from '@/services/api';

interface UseBookSearchReturn {
  books: Ref<Book[]>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  searchBooks: (params: SearchParams) => Promise<void>;
}

export function useBookSearch(): UseBookSearchReturn {
  const books = ref<Book[]>([]);
  const loading = ref(false);
  const error = ref<Error | null>(null);

  const searchBooks = async (params: SearchParams) => {
    loading.value = true;
    error.value = null;
    try {
      books.value = await apiClient.searchBooks(params);
    } catch (e) {
      error.value = e as Error;
    } finally {
      loading.value = false;
    }
  };

  return { books, loading, error, searchBooks };
}
```

**State Management**:
- For simple shared state, use composables with `ref()` and `computed()`
- If complexity grows, consider Pinia (modern Vue store, replaces Vuex)
- Start simple - don't add Pinia until needed (YAGNI principle)

---

## 5. Integration Testing Approach

### Decision
**Multi-layer testing strategy with Vitest:**
1. **Unit tests**: Component logic and services (Vitest)
2. **Integration tests**: API endpoints with SuperTest (Vitest + SuperTest)
3. **Component integration tests**: Vue components with API mocking (Vitest + Vue Test Utils + MSW)
4. **User story validation**: End-to-end acceptance tests (Vitest + SuperTest + in-memory DB)

### Rationale

**Vitest Benefits**:
- Native ESM and TypeScript support (matches build tooling)
- Shares Vite configuration with build process
- Blazing fast with parallel execution and HMR for tests
- Built by Vue/Vite team - excellent Vue 3 integration
- Single testing framework for frontend and backend (consistency)

**Testing Vue Components**:
- **Vue Test Utils** + **Vitest**: Official Vue testing library
- **Mock Service Worker (MSW)**: Intercept HTTP requests at service worker level
  - More realistic than mocking fetch/axios
  - Same mocks work in browser and Node.js
  - No application code changes needed

**Testing Express Endpoints**:
- **SuperTest**: Industry standard for HTTP assertion testing
- Works seamlessly with Vitest (despite being designed for Mocha)
- Provides expressive API: `request(app).get('/api/books').expect(200)`
- Allows testing without starting a real server

**User Story Validation**:
- Use in-memory SQLite database (`:memory:`) for fast, isolated tests
- SuperTest for API calls
- Assertions validate acceptance criteria from spec.md
- Each user story becomes one or more integration tests

### Alternatives Considered

**Playwright/Cypress** (E2E frameworks):
- **Rejected**: Overkill for single-user desktop app
- Slower test execution
- Requires running full browser + server
- Unnecessary complexity when SuperTest + MSW cover integration needs

**Jest**:
- **Rejected**: Vitest is faster, better ESM support, Vite integration
- Jest requires more configuration for TypeScript/ESM
- Vitest has feature parity for this use case

**Manual mocking** (without MSW):
- **Rejected**: More brittle, harder to maintain
- MSW provides better developer experience
- Same mocks reusable across unit/integration tests

### Best Practices

**Test Organization**:

```
backend/tests/
├── setup.ts                 # Global test setup (in-memory DB)
├── unit/                    # Fast isolated tests
│   ├── services/
│   │   ├── HardcoverClient.test.ts
│   │   ├── OwnershipScanner.test.ts
│   │   └── ImportService.test.ts
│   └── models/
│       ├── Book.test.ts
│       └── Author.test.ts
├── integration/             # API endpoint tests with SuperTest
│   ├── search.test.ts
│   ├── books.test.ts
│   └── authors.test.ts
└── user-stories/            # Acceptance criteria validation
    ├── us1-search-import-title.test.ts
    ├── us2-import-author-bibliography.test.ts
    └── us3-manage-author-profiles.test.ts

frontend/tests/
├── setup.ts                 # Global setup (MSW server)
├── mocks/
│   └── server.ts           # MSW request handlers
├── unit/                    # Component logic tests
│   ├── composables/
│   │   └── useBookSearch.test.ts
│   └── utils/
│       └── formatDate.test.ts
└── integration/             # Component + API integration
    ├── SearchBar.test.ts
    ├── BookCard.test.ts
    └── AuthorPage.test.ts
```

**Backend API Endpoint Testing Example**:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { testDb } from '../setup';

describe('POST /api/search', () => {
  beforeEach(() => {
    // Insert test data
    testDb.prepare('INSERT INTO authors (id, name) VALUES (?, ?)').run(1, 'F. Scott Fitzgerald');
    testDb.prepare('INSERT INTO books (id, title, author_id) VALUES (?, ?, ?)').run(1, 'The Great Gatsby', 1);
  });

  it('should return books matching title search', async () => {
    const response = await request(app)
      .post('/api/search')
      .send({ query: 'Gatsby', type: 'title' })
      .expect(200)
      .expect('Content-Type', /json/);

    expect(response.body.results).toHaveLength(1);
    expect(response.body.results[0].title).toBe('The Great Gatsby');
  });
});
```

**Vue Component Testing with MSW**:

```typescript
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import SearchBar from '@/components/SearchBar.vue';
import { nextTick } from 'vue';

describe('SearchBar', () => {
  it('should display search results after query', async () => {
    const wrapper = mount(SearchBar);
    
    // User types in search
    await wrapper.find('input').setValue('Gatsby');
    await wrapper.find('form').trigger('submit');
    
    // Wait for async API call (mocked by MSW)
    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Verify results rendered
    expect(wrapper.text()).toContain('The Great Gatsby');
  });
});
```

---

## 6. Filesystem Scanning Performance

### Decision
**Use native `fs.glob` from Node.js 22 with asynchronous iteration for large collections**

### Rationale

**Native Support in Node.js 22**:
- Built-in `fs.glob(pattern)` and `fs.globSync(pattern)` since Node.js v22.0.0
- No external dependencies needed
- Simple one-liner: `fs.globSync("{COLLECTION_ROOT}/*/*/*/")`
- Maintained by Node.js core team

**Performance** (for this use case):
- Asynchronous version prevents blocking during scan
- For thousands of directories, async iteration yields control back to event loop
- Pattern `{COLLECTION_ROOT}/*/*/*/` is simple (fixed depth, no complex wildcards)
- Native implementation is optimized for common patterns

**Pattern Match Simplicity**:
- Pattern is straightforward: `{COLLECTION_ROOT}/Author name/Book title (ID)/`
- Fixed depth (3 levels)
- No need for complex glob features
- Native fs.glob handles this efficiently

**When to Use fast-glob Instead**:
- If performance testing shows native fs.glob is too slow for the collection size
- If advanced glob features not supported by native implementation are needed
- If more control over concurrency is required (fast-glob has `concurrency` option)

### Alternatives Considered

**fast-glob**:
- **Pros**: 10-20% faster than most glob libraries, concurrency control, more features
- **Cons**: External dependency, potential compatibility differences
- **Keep as fallback**: If native fs.glob proves insufficient during testing

**Manual recursion with fs.readdir**:
- **Rejected**: More complex to implement correctly
- Native glob is cleaner and less error-prone
- Performance similar to manual recursion for simple patterns

**Synchronous vs Asynchronous**:
- Use **async** for scanning thousands of directories (prevents blocking)
- Use **sync** only if needed during server startup for small collections

### Best Practices

**Asynchronous Pattern** (Recommended):

```typescript
import { glob } from 'fs/promises';
import path from 'path';

async function scanCollectionForOwnership(
  collectionRoot: string
): Promise<Map<string, boolean>> {
  const pattern = path.join(collectionRoot, '*/*/*/');
  const ownershipMap = new Map<string, boolean>();

  // Async iteration - doesn't block event loop
  for await (const dirPath of glob(pattern)) {
    // Parse directory structure: "{root}/Author name/Book title (ID)/"
    const parts = dirPath.split(path.sep);
    const bookDirName = parts[parts.length - 2]; // "Book title (ID)"
    
    // Extract ID from directory name
    const idMatch = bookDirName.match(/\(([^)]+)\)$/);
    if (idMatch) {
      const bookId = idMatch[1];
      ownershipMap.set(bookId, true);
    }
  }

  return ownershipMap;
}

// Usage
const ownership = await scanCollectionForOwnership(process.env.COLLECTION_ROOT);
console.log(`Found ${ownership.size} owned books in filesystem`);
```

**Error Handling and Validation**:

```typescript
import { glob } from 'fs/promises';
import { access, constants } from 'fs/promises';
import path from 'path';

async function scanCollectionWithValidation(
  collectionRoot: string
): Promise<Map<string, boolean>> {
  // Validate collection root exists and is readable
  try {
    await access(collectionRoot, constants.R_OK);
  } catch (error) {
    throw new Error(`Collection root not accessible: ${collectionRoot}`);
  }

  const pattern = path.join(collectionRoot, '*/*/*/');
  const ownershipMap = new Map<string, boolean>();
  const errors: string[] = [];

  try {
    for await (const dirPath of glob(pattern)) {
      try {
        const parts = dirPath.split(path.sep);
        const bookDirName = parts[parts.length - 2];
        
        const idMatch = bookDirName.match(/\(([^)]+)\)$/);
        if (idMatch) {
          ownershipMap.set(idMatch[1], true);
        } else {
          errors.push(`Invalid directory format: ${dirPath}`);
        }
      } catch (error) {
        errors.push(`Error processing ${dirPath}: ${error.message}`);
      }
    }
  } catch (error) {
    throw new Error(`Filesystem scan failed: ${error.message}`);
  }

  if (errors.length > 0) {
    console.warn(`Scan completed with ${errors.length} errors:`, errors);
  }

  return ownershipMap;
}
```

**Caching Strategy** (Optional Optimization):

```typescript
class OwnershipScanner {
  private cache: Map<string, boolean> = new Map();
  private lastScan: number = 0;
  private cacheTTL: number = 60 * 60 * 1000; // 1 hour

  async getOwnership(collectionRoot: string, forceRefresh = false): Promise<Map<string, boolean>> {
    const now = Date.now();
    const cacheExpired = (now - this.lastScan) > this.cacheTTL;

    if (!forceRefresh && !cacheExpired && this.cache.size > 0) {
      return this.cache;
    }

    this.cache = await scanCollectionForOwnership(collectionRoot);
    this.lastScan = now;
    return this.cache;
  }

  isOwned(bookId: string): boolean {
    return this.cache.get(bookId) ?? false;
  }

  invalidateCache(): void {
    this.cache.clear();
    this.lastScan = 0;
  }
}
```

---

## Summary of Decisions

| Question | Recommendation | Key Rationale |
|----------|---------------|---------------|
| **Node.js Version** | Node.js 22.x (min 20.19+) | Current Active LTS, native fs.glob, Vite requirement |
| **SQLite Library** | better-sqlite3 | Synchronous API perfect for single-user app, superior performance, excellent TypeScript support |
| **GraphQL Client** | graphql-request | Lightweight (13.2 KB), simple API, works in Node.js + browser, easy rate limiting implementation |
| **Vue 3 API Style** | Composition API with `<script setup>` | Superior TypeScript integration, industry direction, better scalability and code reuse |
| **Integration Testing** | Vitest + SuperTest + Vue Test Utils + MSW | Unified testing framework, excellent TypeScript/ESM support, MSW for realistic mocking |
| **Filesystem Scanning** | Native `fs.glob` (Node.js 22) | Built-in, zero dependencies, adequate performance for simple patterns, fallback to fast-glob if needed |

---

## Constitution Alignment

All recommendations align with the project's constitution principles:

- **Simplicity First**: Standard tools, minimal dependencies, no premature optimization (better-sqlite3 over Prisma, graphql-request over Apollo)
- **User-Centric Design**: Fast search/import performance, reliable ownership detection (native fs.glob async iteration)
- **Observable & Debuggable**: Synchronous database operations easier to debug, structured logging support
- **Incremental Development**: Each technology choice supports independent feature testing (Vitest for all tests, SuperTest for API validation)
- **Data Integrity & Privacy**: Local-only storage (SQLite), single-user model, no external dependencies for core data operations

---

## Action Items

Update plan.md Technical Context section to resolve all "NEEDS CLARIFICATION" items with the decisions above.
