import { ref, computed, type Ref } from 'vue';
import { apiClient } from '../services/api';
import type {
  SearchRequest,
  SearchResponse,
  BookSearchResult,
  AuthorSearchResult,
} from '@shared/types/api';

export interface UseBookSearchReturn {
  // State
  results: Ref<Array<BookSearchResult | AuthorSearchResult>>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  page: Ref<number>;
  hasMore: Ref<boolean>;
  searchQuery: Ref<string>;
  searchType: Ref<'title' | 'author' | 'isbn'>;

  // Computed
  hasResults: Ref<boolean>;
  hasSearched: Ref<boolean>;

  // Methods
  search: (query: string, type: 'title' | 'author' | 'isbn', pageNum?: number) => Promise<void>;
  loadMore: () => Promise<void>;
  importBook: (externalId: string) => Promise<void>;
  importAuthor: (externalId: string) => Promise<void>;
  reset: () => void;
}

export function useBookSearch(): UseBookSearchReturn {
  // State
  const results = ref<Array<BookSearchResult | AuthorSearchResult>>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const page = ref(1);
  const hasMore = ref(false);
  const searchQuery = ref('');
  const searchType = ref<'title' | 'author' | 'isbn'>('title');
  const hasSearched = ref(false);

  // Computed
  const hasResults = computed(() => results.value.length > 0);

  /**
   * Perform search
   */
  const search = async (
    query: string,
    type: 'title' | 'author' | 'isbn',
    pageNum: number = 1
  ): Promise<void> => {
    if (!query.trim()) {
      error.value = 'Search query cannot be empty';
      return;
    }

    loading.value = true;
    error.value = null;
    searchQuery.value = query;
    searchType.value = type;
    page.value = pageNum;

    try {
      const request: SearchRequest = {
        query: query.trim(),
        type,
        page: pageNum,
      };

      const response: SearchResponse = await apiClient.search(request);

      // Replace results for first page, append for pagination
      if (pageNum === 1) {
        results.value = response.results;
      } else {
        results.value = [...results.value, ...response.results];
      }

      hasMore.value = response.pagination.hasMore;
      hasSearched.value = true;

      console.log(`Search completed: ${response.results.length} results found`);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to perform search';
      console.error('Search error:', err);

      // Reset results on error for first page
      if (pageNum === 1) {
        results.value = [];
        hasMore.value = false;
      }
    } finally {
      loading.value = false;
    }
  };

  /**
   * Load more results (pagination)
   */
  const loadMore = async (): Promise<void> => {
    if (!hasMore.value || loading.value || !searchQuery.value) {
      return;
    }

    await search(searchQuery.value, searchType.value, page.value + 1);
  };

  /**
   * Import a book
   */
  const importBook = async (externalId: string): Promise<void> => {
    try {
      console.log(`Importing book: ${externalId}`);

      await apiClient.importBook({ externalId });

      // Update the book status in results
      const index = results.value.findIndex(
        (result) => result.type === 'book' && result.externalId === externalId
      );

      if (index !== -1) {
        const book = results.value[index] as BookSearchResult;
        results.value[index] = {
          ...book,
          status: 'imported',
        };
      }

      console.log(`Book imported successfully: ${externalId}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import book';
      console.error('Import error:', err);
      throw new Error(errorMessage);
    }
  };

  /**
   * Import an author with all their books
   */
  const importAuthor = async (externalId: string): Promise<void> => {
    try {
      console.log(`Importing author: ${externalId}`);

      await apiClient.importAuthor({ externalId });

      // Update the author status in results
      const index = results.value.findIndex(
        (result) => result.type === 'author' && result.externalId === externalId
      );

      if (index !== -1) {
        const author = results.value[index] as AuthorSearchResult;
        results.value[index] = {
          ...author,
          status: 'imported',
        };
      }

      console.log(`Author imported successfully: ${externalId}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import author';
      console.error('Import error:', err);
      throw new Error(errorMessage);
    }
  };

  /**
   * Reset search state
   */
  const reset = (): void => {
    results.value = [];
    loading.value = false;
    error.value = null;
    page.value = 1;
    hasMore.value = false;
    searchQuery.value = '';
    searchType.value = 'title';
    hasSearched.value = false;
  };

  return {
    // State
    results,
    loading,
    error,
    page,
    hasMore,
    searchQuery,
    searchType,

    // Computed
    hasResults,
    hasSearched,

    // Methods
    search,
    loadMore,
    importBook,
    importAuthor,
    reset,
  };
}
