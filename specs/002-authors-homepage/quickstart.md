# Quickstart: Authors Homepage

**Feature**: Authors Homepage  
**Branch**: `002-authors-homepage`  
**Date**: 2025-11-11

## Overview

This quickstart guide provides step-by-step instructions for implementing the Authors Homepage feature. Follow these steps sequentially to build a paginated, filterable list of authors with efficient infinite scroll and alphabetical navigation.

---

## Prerequisites

Before starting, ensure you have:

- ✅ Node.js 20.19+ installed
- ✅ Repository cloned and dependencies installed (`npm install`)
- ✅ Database initialized (`npm run db:migrate -w backend`)
- ✅ Feature branch created: `git checkout -b 002-authors-homepage`
- ✅ Read the following documents:
  - [spec.md](./spec.md) - Feature specification
  - [plan.md](./plan.md) - Implementation plan
  - [research.md](./research.md) - Technical research
  - [data-model.md](./data-model.md) - Data model
  - [contracts/authors-list-api.md](./contracts/authors-list-api.md) - API contract

---

## Phase 1: Database Schema Updates

### Step 1.1: Create Migration File

Create `backend/src/db/migrations/003_add_author_sort_name.sql`:

```sql
-- Add sort_name column for efficient author name sorting
ALTER TABLE authors ADD COLUMN sort_name TEXT;

-- Create case-insensitive index on sort_name
CREATE INDEX IF NOT EXISTS idx_authors_sort_name 
ON authors(sort_name COLLATE NOCASE);
```

### Step 1.2: Create Name Parser Utility

Create `backend/src/utils/nameParser.ts`:

```typescript
/**
 * Generate sort name from full author name
 * 
 * Examples:
 * - "Agatha Christie" -> "Christie, Agatha"
 * - "J.K. Rowling" -> "Rowling, J.K."
 * - "Madonna" -> "Madonna"
 */
export function generateSortName(fullName: string): string {
  const trimmed = fullName.trim();
  const lastSpaceIndex = trimmed.lastIndexOf(' ');
  
  // Single name (e.g., "Madonna")
  if (lastSpaceIndex === -1) {
    return trimmed;
  }
  
  // Split on last space: "Agatha Christie" -> "Christie, Agatha"
  const firstName = trimmed.substring(0, lastSpaceIndex);
  const lastName = trimmed.substring(lastSpaceIndex + 1);
  
  return `${lastName}, ${firstName}`;
}
```

### Step 1.3: Backfill Existing Authors

Create `backend/src/db/backfillSortNames.ts`:

```typescript
import { getDatabase } from './connection.js';
import { generateSortName } from '../utils/nameParser.js';

export function backfillSortNames(): void {
  const db = getDatabase();
  
  console.log('Backfilling sort_name for existing authors...');
  
  const authors = db.prepare('SELECT id, name FROM authors WHERE sort_name IS NULL').all() as Array<{ id: number; name: string }>;
  
  if (authors.length === 0) {
    console.log('No authors to backfill.');
    return;
  }
  
  const updateStmt = db.prepare('UPDATE authors SET sort_name = ? WHERE id = ?');
  
  db.transaction(() => {
    for (const author of authors) {
      const sortName = generateSortName(author.name);
      updateStmt.run(sortName, author.id);
    }
  })();
  
  console.log(`✓ Backfilled sort_name for ${authors.length} authors`);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  backfillSortNames();
}
```

### Step 1.4: Run Migration

```bash
npm run db:migrate -w backend
node --loader ts-node/esm backend/src/db/backfillSortNames.ts
```

**Verify**:
```bash
npm run db:schema -w backend
# Should show sort_name column in authors table
```

---

## Phase 2: Backend API Implementation

### Step 2.1: Update AuthorModel

Update `backend/src/models/Author.ts` to handle `sort_name`:

```typescript
import { generateSortName } from '../utils/nameParser.js';

// Add sort_name to Author interface
export interface Author {
  id: number;
  externalId: string;
  name: string;
  sortName: string;  // ← NEW
  bio: string | null;
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

// Update create method
create(input: CreateAuthorInput): Author {
  const sortName = generateSortName(input.name);
  
  const stmt = this.db.prepare(`
    INSERT INTO authors (external_id, name, bio, photo_url, sort_name)
    VALUES (?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    input.externalId,
    input.name,
    input.bio ?? null,
    input.photoUrl ?? null,
    sortName
  );

  return this.findById(result.lastInsertRowid as number)!;
}

// Update update method
update(id: number, input: UpdateAuthorInput): Author {
  const updates: string[] = [];
  const values: any[] = [];

  if (input.name !== undefined) {
    updates.push('name = ?');
    values.push(input.name);
    updates.push('sort_name = ?');
    values.push(generateSortName(input.name));
  }

  // ... rest of update logic
}

// Update findAll to use sort_name
findAll(limit: number = 50, offset: number = 0): Author[] {
  const stmt = this.db.prepare(`
    SELECT
      id,
      external_id as externalId,
      name,
      sort_name as sortName,
      bio,
      photo_url as photoUrl,
      created_at as createdAt,
      updated_at as updatedAt
    FROM authors
    ORDER BY sort_name COLLATE NOCASE ASC
    LIMIT ? OFFSET ?
  `);

  return stmt.all(limit, offset) as Author[];
}
```

### Step 2.2: Create Authors List Endpoint

Update `backend/src/api/routes/authors.ts`:

```typescript
/**
 * POST /api/authors/list
 * Get paginated authors list with cursor-based pagination
 */
router.post('/list', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cursor, letterFilter, limit = 50 } = req.body;

    // Validation
    if (letterFilter) {
      const upperFilter = String(letterFilter).toUpperCase();
      if (!/^[A-Z]$/.test(upperFilter)) {
        throw errors.validationError('letterFilter must be a single letter A-Z');
      }
    }

    if (cursor) {
      if (!cursor.name || typeof cursor.id !== 'number') {
        throw errors.validationError('cursor must include both name (string) and id (number)');
      }
    }

    const cappedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);

    // Build query
    let query = `
      SELECT 
        a.id,
        a.external_id as externalId,
        a.name,
        a.sort_name as sortName,
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

    const db = getDatabase();
    const stmt = db.prepare(query);
    const authors = stmt.all(...params);

    logger.info('API response: Authors list retrieved', {
      count: authors.length,
      letterFilter: letterFilter || null,
      hasCursor: !!cursor,
    });

    res.json({ 
      authors,
      hasMore: authors.length === cappedLimit
    });
  } catch (error) {
    next(error);
  }
});
```

### Step 2.3: Test Backend

```bash
# Start backend dev server
npm run dev -w backend

# In another terminal, test the endpoint
curl -X POST http://localhost:3000/api/authors/list \
  -H "Content-Type: application/json" \
  -d '{"cursor": null, "letterFilter": null, "limit": 10}'
```

**Expected**: JSON response with first 10 authors sorted by last name.

---

## Phase 3: Frontend Dependencies

### Step 3.1: Install Required Packages

```bash
npm install @vueuse/core -w frontend
npm install vue-virtual-scroller@next -w frontend
```

### Step 3.2: Verify Installation

Check `frontend/package.json`:
```json
{
  "dependencies": {
    "@vueuse/core": "^11.x.x",
    "vue-virtual-scroller": "^2.x.x"
  }
}
```

---

## Phase 4: Frontend Composables

### Step 4.1: Create useAuthorsList Composable

Create `frontend/src/composables/useAuthorsList.ts`:

```typescript
import { ref, watch, type Ref } from 'vue';

interface PaginationCursor {
  name: string;
  id: number;
}

interface Author {
  id: number;
  externalId: string;
  name: string;
  sortName: string;
  bio: string | null;
  photoUrl: string | null;
  bookCount: number;
  createdAt: string;
  updatedAt: string;
}

interface UseAuthorsListReturn {
  authors: Ref<Author[]>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  hasMore: Ref<boolean>;
  loadMore: () => Promise<void>;
  reset: () => void;
}

export function useAuthorsList(letterFilter?: Ref<string | null>): UseAuthorsListReturn {
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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.authors.length < 50) {
        hasMore.value = false;
      }

      authors.value.push(...data.authors);

      // Update cursor for next page
      if (data.authors.length > 0) {
        const last = data.authors[data.authors.length - 1];
        cursor.value = { name: last.sortName, id: last.id };
      }
    } catch (e) {
      error.value = e as Error;
      console.error('Failed to load authors:', e);
    } finally {
      loading.value = false;
    }
  };

  const reset = () => {
    authors.value = [];
    cursor.value = null;
    hasMore.value = true;
    error.value = null;
  };

  // Reset and reload when filter changes
  watch(letterFilter, () => {
    reset();
    loadMore();
  }, { immediate: true });

  return { authors, loading, error, hasMore, loadMore, reset };
}
```

---

## Phase 5: Frontend Components

### Step 5.1: Create AlphabetFilter Component

Create `frontend/src/components/authors/AlphabetFilter.vue`:

```vue
<template>
  <div class="alphabet-filter flex flex-wrap gap-2 justify-center p-4">
    <button
      @click="selectLetter(null)"
      class="filter-button"
      :class="{ active: selectedLetter === null }"
    >
      All
    </button>
    <button
      v-for="letter in alphabet"
      :key="letter"
      @click="selectLetter(letter)"
      class="filter-button"
      :class="{ active: selectedLetter === letter }"
    >
      {{ letter }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const selectedLetter = defineModel<string | null>({ default: null });

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const selectLetter = (letter: string | null) => {
  selectedLetter.value = letter;
};
</script>

<style scoped>
.filter-button {
  @apply px-3 py-1 text-sm font-medium border border-gray-300 rounded hover:bg-gray-100 transition-colors;
}

.filter-button.active {
  @apply bg-blue-600 text-white border-blue-600 hover:bg-blue-700;
}
</style>
```

### Step 5.2: Update/Create AuthorCard Component

Update or create `frontend/src/components/authors/AuthorCard.vue`:

```vue
<template>
  <div class="author-card flex items-start gap-4 p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors">
    <!-- Author Photo -->
    <div class="author-photo flex-shrink-0">
      <img
        v-if="author.photoUrl"
        :src="author.photoUrl"
        :alt="`Photo of ${author.name}`"
        class="w-16 h-16 rounded-full object-cover"
      />
      <div
        v-else
        class="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold text-xl"
      >
        {{ initials }}
      </div>
    </div>

    <!-- Author Info -->
    <div class="author-info flex-1 min-w-0">
      <h3 class="text-lg font-semibold text-gray-900 mb-1">
        {{ author.name }}
      </h3>
      
      <p class="text-sm text-gray-600 mb-2">
        {{ author.bookCount }} {{ author.bookCount === 1 ? 'book' : 'books' }} collected
      </p>

      <p v-if="bio" class="text-sm text-gray-700 line-clamp-3">
        {{ bio }}
      </p>
      <p v-else class="text-sm text-gray-500 italic">
        No biography available
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Author {
  id: number;
  name: string;
  bio: string | null;
  photoUrl: string | null;
  bookCount: number;
}

const props = defineProps<{
  author: Author;
}>();

const initials = computed(() => {
  const nameParts = props.author.name.split(' ');
  if (nameParts.length === 1) {
    return nameParts[0].charAt(0).toUpperCase();
  }
  return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
});

const bio = computed(() => {
  if (!props.author.bio) return null;
  if (props.author.bio.length <= 300) return props.author.bio;
  return props.author.bio.substring(0, 300) + '...';
});
</script>

<style scoped>
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
```

### Step 5.3: Create AuthorsHomePage

Create `frontend/src/pages/AuthorsHomePage.vue`:

```vue
<template>
  <div class="authors-homepage">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold text-gray-900 mb-6">Authors</h1>

      <!-- Alphabet Filter -->
      <AlphabetFilter v-model="letterFilter" />

      <!-- Authors List with Virtual Scrolling -->
      <DynamicScroller
        v-if="authors.length > 0"
        :items="authors"
        :min-item-size="120"
        class="authors-scroller"
        @scroll="handleScroll"
      >
        <template #default="{ item, index, active }">
          <DynamicScrollerItem
            :item="item"
            :active="active"
            :size-dependencies="[item.name, item.bookCount]"
            :data-index="index"
          >
            <AuthorCard :author="item" />
          </DynamicScrollerItem>
        </template>
      </DynamicScroller>

      <!-- Loading Indicator -->
      <div v-if="loading" class="text-center py-8">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600"></div>
        <p class="mt-2 text-gray-600">Loading authors...</p>
      </div>

      <!-- Error State -->
      <div v-if="error" class="text-center py-8">
        <p class="text-red-600">{{ error.message }}</p>
        <button
          @click="loadMore"
          class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>

      <!-- Empty State -->
      <div v-if="!loading && !error && authors.length === 0" class="text-center py-12">
        <p class="text-gray-600 text-lg">
          {{ letterFilter ? `No authors found for letter "${letterFilter}"` : 'No authors found' }}
        </p>
      </div>

      <!-- End of List -->
      <div v-if="!hasMore && authors.length > 0 && !loading" class="text-center py-8 text-gray-500">
        No more authors to load
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import { useAuthorsList } from '@/composables/useAuthorsList';
import AuthorCard from '@/components/authors/AuthorCard.vue';
import AlphabetFilter from '@/components/authors/AlphabetFilter.vue';

const letterFilter = ref<string | null>(null);
const { authors, loading, error, hasMore, loadMore } = useAuthorsList(letterFilter);

const handleScroll = (event: { target: HTMLElement }) => {
  const { scrollTop, scrollHeight, clientHeight } = event.target;
  const scrolledToBottom = scrollHeight - scrollTop - clientHeight < 300;
  
  if (scrolledToBottom && !loading.value && hasMore.value) {
    loadMore();
  }
};
</script>

<style scoped>
.authors-scroller {
  height: calc(100vh - 250px);
  overflow-y: auto;
}
</style>
```

---

## Phase 6: Navigation & Routing

### Step 6.1: Update App.vue with Navigation

Update `frontend/src/App.vue`:

```vue
<template>
  <div id="app" class="min-h-screen flex flex-col bg-gray-50">
    <!-- Persistent Navigation Bar -->
    <nav 
      class="bg-white shadow-md" 
      role="navigation" 
      aria-label="Main navigation"
    >
      <div class="max-w-7xl mx-auto px-4">
        <div class="flex h-16 items-center">
          <div class="flex space-x-8">
            <RouterLink 
              to="/" 
              class="nav-link"
              :class="{ active: route.path === '/' }"
              :aria-current="route.path === '/' ? 'page' : undefined"
            >
              Authors
            </RouterLink>
            <RouterLink 
              to="/search" 
              class="nav-link"
              :class="{ active: route.path === '/search' }"
              :aria-current="route.path === '/search' ? 'page' : undefined"
            >
              Search
            </RouterLink>
          </div>
        </div>
      </div>
    </nav>

    <!-- Dynamic Content Area -->
    <main class="flex-1">
      <div class="max-w-7xl mx-auto px-4 py-6">
        <RouterView />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';

const route = useRoute();
</script>

<style scoped>
.nav-link {
  @apply px-3 py-2 text-sm font-medium text-gray-900 hover:text-blue-600 focus-visible:outline-2 focus-visible:outline-blue-600 transition-colors;
}

.nav-link.active {
  @apply text-blue-600 border-b-2 border-blue-600;
}
</style>
```

### Step 6.2: Update Router

Update `frontend/src/router/index.ts`:

```typescript
import { createRouter, createWebHistory } from 'vue-router';
import AuthorsHomePage from '@/pages/AuthorsHomePage.vue';
import SearchPage from '@/pages/SearchPage.vue'; // Existing page

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'authors',
      component: AuthorsHomePage,
    },
    {
      path: '/search',
      name: 'search',
      component: SearchPage,
    },
  ],
});

export default router;
```

---

## Phase 7: Testing

### Step 7.1: Run Tests

```bash
# Backend tests
npm run test -w backend

# Frontend tests
npm run test -w frontend

# Linting
npm run lint
```

### Step 7.2: Manual Testing Checklist

- [ ] Navigate to http://localhost:5173/
- [ ] Verify authors list displays sorted by last name
- [ ] Scroll down to trigger infinite loading
- [ ] Verify loading indicator appears
- [ ] Verify more authors load automatically
- [ ] Click letter "M" in alphabet filter
- [ ] Verify only authors starting with "M" appear
- [ ] Click "All" to clear filter
- [ ] Verify full list reappears
- [ ] Test with empty database (should show "No authors found")
- [ ] Test with 1,000+ authors (performance check)
- [ ] Verify navigation bar appears on all pages
- [ ] Verify "Authors" link is highlighted on homepage
- [ ] Navigate to /search and verify "Search" link is highlighted

---

## Phase 8: Performance Validation

### Step 8.1: Generate Test Data

Create `backend/src/scripts/generateTestAuthors.ts`:

```typescript
import { getDatabase } from '../db/connection.js';
import { generateSortName } from '../utils/nameParser.js';

const firstNames = ['John', 'Jane', 'Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];

function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function generateTestAuthors(count: number) {
  const db = getDatabase();
  
  console.log(`Generating ${count} test authors...`);
  
  const insertStmt = db.prepare(`
    INSERT INTO authors (external_id, name, sort_name, bio, photo_url)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  db.transaction(() => {
    for (let i = 0; i < count; i++) {
      const firstName = randomChoice(firstNames);
      const lastName = randomChoice(lastNames);
      const fullName = `${firstName} ${lastName}`;
      const sortName = generateSortName(fullName);
      
      insertStmt.run(
        `test-${i}-${Date.now()}`,
        fullName,
        sortName,
        `Test biography for ${fullName}`,
        null
      );
      
      if ((i + 1) % 1000 === 0) {
        console.log(`  Generated ${i + 1} authors...`);
      }
    }
  })();
  
  console.log(`✓ Generated ${count} test authors successfully`);
}

// Run with: node --loader ts-node/esm backend/src/scripts/generateTestAuthors.ts 10000
const count = parseInt(process.argv[2], 10) || 100;
generateTestAuthors(count);
```

### Step 8.2: Performance Test

```bash
# Generate 10,000 test authors
node --loader ts-node/esm backend/src/scripts/generateTestAuthors.ts 10000

# Start both services
npm run dev

# Open browser to http://localhost:5173/
# Open DevTools Network tab
# Scroll to page 200 (position ~10,000)
# Verify pagination requests remain < 100ms
```

**Expected**:
- First page load: < 1 second
- Pagination requests: < 100ms each
- Smooth scrolling with no jank
- Memory usage stable (< 100 MB)

---

## Troubleshooting

### Issue: "sort_name column not found"

**Solution**: Run migration and backfill:
```bash
npm run db:migrate -w backend
node --loader ts-node/esm backend/src/db/backfillSortNames.ts
```

### Issue: Virtual scroller not rendering

**Solution**: Ensure `vue-virtual-scroller` CSS is imported:
```typescript
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
```

### Issue: Infinite scroll not triggering

**Solution**: Check scroll container has fixed height:
```css
.authors-scroller {
  height: calc(100vh - 250px); /* Must have explicit height */
}
```

### Issue: Authors not sorted correctly

**Solution**: Verify `sort_name` is populated for all authors:
```sql
SELECT COUNT(*) FROM authors WHERE sort_name IS NULL;
-- Should return 0
```

### Issue: Performance degradation at scale

**Solution**: Verify indexes exist:
```bash
npm run db:schema -w backend
# Should show: idx_authors_sort_name
```

---

## Next Steps

After completing this quickstart:

1. **Review generated artifacts**:
   - Check database has `sort_name` column
   - Verify API endpoint returns sorted authors
   - Confirm frontend displays authors correctly

2. **Run full test suite**:
   ```bash
   npm test && npm run lint
   ```

3. **Create pull request**:
   - Title: "feat: implement authors homepage with pagination and filtering"
   - Link to spec: `specs/002-authors-homepage/spec.md`
   - Include screenshots

4. **Request code review** focusing on:
   - API contract adherence
   - Performance at 10k+ authors
   - Accessibility compliance
   - Error handling

---

## Summary

You have successfully implemented:

✅ Database schema updates with `sort_name` column  
✅ Backend API endpoint with cursor-based pagination  
✅ Frontend composable for state management  
✅ Virtual scrolling for efficient rendering  
✅ Alphabetical filtering (A-Z navigation)  
✅ Persistent navigation bar  
✅ Responsive UI with Tailwind CSS  
✅ Accessibility features (ARIA labels, keyboard navigation)  
✅ Performance optimizations (< 100ms pagination)

**Feature complete!** 🎉

---

## References

- **Spec**: [spec.md](./spec.md)
- **Plan**: [plan.md](./plan.md)
- **Research**: [research.md](./research.md)
- **Data Model**: [data-model.md](./data-model.md)
- **API Contract**: [contracts/authors-list-api.md](./contracts/authors-list-api.md)

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-11  
**Status**: Ready for implementation
