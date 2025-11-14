import { ref, watch, type Ref } from 'vue';
import type {
  AuthorListItem,
  AuthorsCursor,
  AuthorsListRequest,
  AuthorsListResponse,
} from '@shared/types/author';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface UseAuthorsListReturn {
  authors: Ref<AuthorListItem[]>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  hasMore: Ref<boolean>;
  loadMore: () => Promise<void>;
  reset: () => void;
}

/**
 * Composable for managing paginated authors list with cursor-based pagination
 *
 * @param letterFilter - Optional reactive letter filter (A-Z)
 * @returns Authors list state and pagination controls
 */
export function useAuthorsList(letterFilter?: Ref<string | null>): UseAuthorsListReturn {
  const authors = ref<AuthorListItem[]>([]);
  const loading = ref(false);
  const error = ref<Error | null>(null);
  const hasMore = ref(true);
  const cursor = ref<AuthorsCursor | null>(null);

  /**
   * Load more authors from the API
   * Appends results to existing authors array
   */
  const loadMore = async () => {
    if (loading.value || !hasMore.value) {
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const requestBody: AuthorsListRequest = {
        cursor: cursor.value,
        letterFilter: letterFilter?.value || null,
        limit: 50,
      };

      const response = await fetch(`${API_BASE_URL}/authors/list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data: AuthorsListResponse = await response.json();

      // Append new authors to the list
      authors.value.push(...data.authors);

      // Update hasMore flag
      hasMore.value = data.hasMore;

      // Update cursor for next page
      if (data.authors.length > 0) {
        const lastAuthor = data.authors[data.authors.length - 1];
        cursor.value = {
          name: lastAuthor.sortName || lastAuthor.name,
          id: lastAuthor.id,
        };
      }
    } catch (e) {
      error.value = e as Error;
      console.error('Failed to load authors:', e);
    } finally {
      loading.value = false;
    }
  };

  /**
   * Reset the authors list and pagination state
   * Used when changing filters or refreshing the list
   */
  const reset = () => {
    authors.value = [];
    cursor.value = null;
    hasMore.value = true;
    error.value = null;
  };

  // Watch for filter changes and reset pagination
  if (letterFilter) {
    watch(letterFilter, () => {
      reset();
      // Automatically load first page when filter changes
      loadMore();
    });
  }

  return {
    authors,
    loading,
    error,
    hasMore,
    loadMore,
    reset,
  };
}
