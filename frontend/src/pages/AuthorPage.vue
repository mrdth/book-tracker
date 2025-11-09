<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import BookCard from '../components/books/BookCard.vue';
import { apiClient } from '../services/api';
import type { AuthorWithBooks } from '@shared/types/author';
import type { BookSearchResult } from '@shared/types/api';

const route = useRoute();
const router = useRouter();

const author = ref<AuthorWithBooks | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

const authorId = computed(() => {
  const id = route.params.id;
  return typeof id === 'string' ? parseInt(id, 10) : null;
});

const loadAuthor = async () => {
  if (!authorId.value) {
    error.value = 'Invalid author ID';
    loading.value = false;
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    author.value = await apiClient.getAuthor(authorId.value);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load author';
    console.error('Failed to load author:', err);
  } finally {
    loading.value = false;
  }
};

const handleBack = () => {
  router.back();
};

const formatBookCount = (count: number): string => {
  if (count === 0) return 'No books';
  if (count === 1) return '1 book';
  return `${count} books`;
};

const convertBookToSearchResult = (book: AuthorWithBooks['books'][number]): BookSearchResult => {
  return {
    type: 'book',
    externalId: book.externalId,
    title: book.title,
    isbn: book.isbn,
    publicationDate: book.publicationDate,
    coverUrl: book.coverUrl,
    authors: [],
    status: book.deleted ? 'deleted' : 'imported',
  };
};

onMounted(() => {
  loadAuthor();
});
</script>

<template>
  <div class="author-page">
    <div class="author-page__container">
      <!-- Back Button -->
      <button @click="handleBack" class="author-page__back-button">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="author-page__back-icon"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
          />
        </svg>
        <span>Back</span>
      </button>

      <!-- Loading State -->
      <div v-if="loading" class="author-page__loading">
        <svg
          class="author-page__spinner"
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
        <p class="author-page__loading-text">Loading author...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="author-page__error">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          class="author-page__error-icon"
        >
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
            clip-rule="evenodd"
          />
        </svg>
        <p class="author-page__error-text">{{ error }}</p>
      </div>

      <!-- Author Content -->
      <div v-else-if="author" class="author-page__content">
        <!-- Author Header -->
        <header class="author-page__header">
          <div class="author-page__header-content">
            <div class="author-page__photo-container">
              <img
                v-if="author.photoUrl"
                :src="author.photoUrl"
                :alt="`Photo of ${author.name}`"
                class="author-page__photo"
              />
              <div v-else class="author-page__photo-placeholder">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  class="author-page__photo-icon"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                  />
                </svg>
              </div>
            </div>

            <div class="author-page__header-info">
              <h1 class="author-page__name">{{ author.name }}</h1>
              <p class="author-page__book-count">
                {{ formatBookCount(author.activeBookCount) }}
                <span
                  v-if="author.totalBookCount > author.activeBookCount"
                  class="author-page__deleted-count"
                >
                  ({{ author.totalBookCount - author.activeBookCount }} deleted)
                </span>
              </p>
            </div>
          </div>

          <div v-if="author.bio" class="author-page__bio">
            <h2 class="author-page__bio-title">Biography</h2>
            <p class="author-page__bio-text">{{ author.bio }}</p>
          </div>
        </header>

        <!-- Books Section -->
        <section class="author-page__books">
          <h2 class="author-page__books-title">Books</h2>

          <div v-if="author.books.length === 0" class="author-page__no-books">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="author-page__no-books-icon"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
              />
            </svg>
            <p class="author-page__no-books-text">No books in your library</p>
          </div>

          <div v-else class="author-page__books-list">
            <BookCard
              v-for="book in author.books"
              :key="book.id"
              :book="convertBookToSearchResult(book)"
            />
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.author-page {
  min-height: 100vh;
  background-color: #f9fafb;
  padding: 2rem 1rem;
}

.author-page__container {
  max-width: 56rem;
  margin: 0 auto;
}

.author-page__back-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  margin-bottom: 2rem;
  background-color: white;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.author-page__back-button:hover {
  background-color: #f9fafb;
  border-color: #9ca3af;
}

.author-page__back-button:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(156, 163, 175, 0.3);
}

.author-page__back-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.author-page__loading,
.author-page__error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.author-page__spinner {
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

.author-page__loading-text {
  margin-top: 1rem;
  font-size: 1.125rem;
  color: #6b7280;
}

.author-page__error {
  padding: 2rem;
  background-color: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 0.5rem;
  color: #991b1b;
}

.author-page__error-icon {
  width: 3rem;
  height: 3rem;
  margin-bottom: 1rem;
}

.author-page__error-text {
  font-size: 1.125rem;
  font-weight: 500;
  margin: 0;
}

.author-page__content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.author-page__header {
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 2rem;
}

.author-page__header-content {
  display: flex;
  gap: 1.5rem;
  align-items: center;
  margin-bottom: 1.5rem;
}

.author-page__photo-container {
  flex-shrink: 0;
  width: 8rem;
  height: 8rem;
  border-radius: 50%;
  overflow: hidden;
  background-color: #f3f4f6;
}

.author-page__photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.author-page__photo-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background-color: #f3f4f6;
  color: #9ca3af;
}

.author-page__photo-icon {
  width: 4rem;
  height: 4rem;
}

.author-page__header-info {
  flex: 1;
}

.author-page__name {
  font-size: 2rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.5rem 0;
}

.author-page__book-count {
  font-size: 1.125rem;
  color: #6b7280;
  margin: 0;
}

.author-page__deleted-count {
  color: #9ca3af;
  font-size: 0.875rem;
}

.author-page__bio {
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.author-page__bio-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 0.75rem 0;
}

.author-page__bio-text {
  font-size: 1rem;
  line-height: 1.75;
  color: #374151;
  margin: 0;
  white-space: pre-wrap;
}

.author-page__books {
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 2rem;
}

.author-page__books-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 1.5rem 0;
}

.author-page__no-books {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem 1rem;
  text-align: center;
}

.author-page__no-books-icon {
  width: 3rem;
  height: 3rem;
  color: #9ca3af;
  margin-bottom: 0.75rem;
}

.author-page__no-books-text {
  font-size: 1.125rem;
  color: #6b7280;
  margin: 0;
}

.author-page__books-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

@media (max-width: 640px) {
  .author-page__header-content {
    flex-direction: column;
    text-align: center;
  }

  .author-page__name {
    font-size: 1.5rem;
  }
}
</style>
