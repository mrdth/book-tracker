<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import SearchBar from '../components/common/SearchBar.vue';
import BookCard from '../components/books/BookCard.vue';
import AuthorCard from '../components/authors/AuthorCard.vue';
import OwnershipScanPanel from '../components/common/OwnershipScanPanel.vue';
import { useBookSearch } from '../composables/useBookSearch';
import type { BookSearchResult, AuthorSearchResult } from '@shared/types/api';

const router = useRouter();

const {
  results,
  loading,
  error,
  hasResults,
  hasSearched,
  hasMore,
  search,
  loadMore,
  importBook,
  importAuthor,
} = useBookSearch();

const importError = ref<string | null>(null);

const handleSearch = async (query: string, type: 'title' | 'author' | 'isbn') => {
  importError.value = null;
  await search(query, type, 1);
};

const handleBookImport = async (externalId: string) => {
  importError.value = null;
  try {
    await importBook(externalId);
  } catch (err) {
    importError.value = err instanceof Error ? err.message : 'Failed to import book';
  }
};

const handleAuthorImport = async (externalId: string) => {
  importError.value = null;
  try {
    await importAuthor(externalId);
  } catch (err) {
    importError.value = err instanceof Error ? err.message : 'Failed to import author';
  }
};

const handleAuthorView = async (externalId: string) => {
  // Navigate to author page using external ID
  router.push(`/authors/external/${externalId}`);
};

const handleLoadMore = async () => {
  await loadMore();
};

const isBookResult = (result: (typeof results.value)[number]): result is BookSearchResult => {
  return result.type === 'book';
};

const isAuthorResult = (result: (typeof results.value)[number]): result is AuthorSearchResult => {
  return result.type === 'author';
};
</script>

<template>
  <div class="search-page">
    <div class="search-page__container">
      <!-- Header -->
      <header class="search-page__header">
        <h1 class="search-page__title">Book Tracker</h1>
        <p class="search-page__subtitle">
          Search for books by title, author, or ISBN and add them to your library
        </p>
      </header>

      <!-- Search Bar -->
      <div class="search-page__search">
        <SearchBar @search="handleSearch" :disabled="loading" />
      </div>

      <!-- Ownership Scanner -->
      <div class="search-page__ownership">
        <OwnershipScanPanel />
      </div>

      <!-- Import Error -->
      <div v-if="importError" class="search-page__error search-page__error--import">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          class="search-page__error-icon"
        >
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
            clip-rule="evenodd"
          />
        </svg>
        <p class="search-page__error-text">{{ importError }}</p>
        <button
          @click="importError = null"
          class="search-page__error-dismiss"
          aria-label="Dismiss error"
        >
          ×
        </button>
      </div>

      <!-- Search Error -->
      <div v-if="error" class="search-page__error">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          class="search-page__error-icon"
        >
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
            clip-rule="evenodd"
          />
        </svg>
        <p class="search-page__error-text">{{ error }}</p>
      </div>

      <!-- Loading State -->
      <div v-if="loading && !hasResults" class="search-page__loading">
        <svg
          class="search-page__spinner"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <p class="search-page__loading-text">Searching...</p>
      </div>

      <!-- Empty State (No Results) -->
      <div v-else-if="hasSearched && !hasResults && !loading" class="search-page__empty">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="search-page__empty-icon"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
        <p class="search-page__empty-text">No results found</p>
        <p class="search-page__empty-hint">Try adjusting your search query or search type</p>
      </div>

      <!-- Results -->
      <div v-else-if="hasResults" class="search-page__results">
        <div class="search-page__results-header">
          <h2 class="search-page__results-title">
            {{ results.length }} result{{ results.length !== 1 ? 's' : '' }}
          </h2>
        </div>

        <div class="search-page__results-list">
          <template v-for="result in results" :key="result.externalId">
            <!-- Book Results -->
            <BookCard
              v-if="isBookResult(result)"
              :book="result"
              :loading="loading"
              @import="handleBookImport"
            />

            <!-- Author Results -->
            <AuthorCard
              v-else-if="isAuthorResult(result)"
              :author="result"
              :loading="loading"
              @import="handleAuthorImport"
              @view="handleAuthorView"
            />
          </template>
        </div>

        <!-- Load More Button -->
        <div v-if="hasMore" class="search-page__load-more">
          <button @click="handleLoadMore" :disabled="loading" class="search-page__load-more-button">
            <svg
              v-if="!loading"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="search-page__load-more-icon"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3"
              />
            </svg>
            <span>{{ loading ? 'Loading...' : 'Load More' }}</span>
          </button>
        </div>
      </div>

      <!-- Initial State -->
      <div v-else class="search-page__initial">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="search-page__initial-icon"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
          />
        </svg>
        <p class="search-page__initial-text">Search for books to get started</p>
        <p class="search-page__initial-hint">Enter a book title, author name, or ISBN above</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-page {
  min-height: 100vh;
  background-color: #f9fafb;
  padding: 2rem 1rem;
}

.search-page__container {
  max-width: 56rem;
  margin: 0 auto;
}

.search-page__header {
  text-align: center;
  margin-bottom: 2rem;
}

.search-page__title {
  font-size: 2.25rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.5rem 0;
}

.search-page__subtitle {
  font-size: 1.125rem;
  color: #6b7280;
  margin: 0;
}

.search-page__search {
  margin-bottom: 2rem;
}

.search-page__ownership {
  margin-bottom: 2rem;
}

.search-page__error {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  margin-bottom: 1.5rem;
  background-color: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 0.5rem;
  color: #991b1b;
}

.search-page__error--import {
  background-color: #fef3c7;
  border-color: #fde68a;
  color: #92400e;
}

.search-page__error-icon {
  width: 1.5rem;
  height: 1.5rem;
  flex-shrink: 0;
}

.search-page__error-text {
  flex: 1;
  margin: 0;
  font-size: 0.875rem;
  font-weight: 500;
}

.search-page__error-dismiss {
  background: none;
  border: none;
  font-size: 1.5rem;
  font-weight: 700;
  color: currentColor;
  cursor: pointer;
  padding: 0;
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.25rem;
  transition: background-color 0.2s;
}

.search-page__error-dismiss:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

.search-page__loading,
.search-page__empty,
.search-page__initial {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.search-page__spinner {
  width: 3rem;
  height: 3rem;
  color: #3b82f6;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.search-page__loading-text {
  margin-top: 1rem;
  font-size: 1.125rem;
  color: #6b7280;
}

.search-page__empty-icon,
.search-page__initial-icon {
  width: 4rem;
  height: 4rem;
  color: #9ca3af;
  margin-bottom: 1rem;
}

.search-page__empty-text,
.search-page__initial-text {
  font-size: 1.25rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 0.5rem 0;
}

.search-page__empty-hint,
.search-page__initial-hint {
  font-size: 1rem;
  color: #6b7280;
  margin: 0;
}

.search-page__results {
  margin-top: 2rem;
}

.search-page__results-header {
  margin-bottom: 1.5rem;
}

.search-page__results-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.search-page__results-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.search-page__load-more {
  display: flex;
  justify-content: center;
  margin-top: 2rem;
}

.search-page__load-more-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 2rem;
  background-color: white;
  color: #3b82f6;
  border: 1px solid #3b82f6;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.search-page__load-more-button:hover:not(:disabled) {
  background-color: #3b82f6;
  color: white;
}

.search-page__load-more-button:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}

.search-page__load-more-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.search-page__load-more-icon {
  width: 1.25rem;
  height: 1.25rem;
}
</style>
