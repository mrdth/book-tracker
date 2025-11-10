<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import BookCard from '../components/books/BookCard.vue';
import EditAuthorModal from '../components/authors/EditAuthorModal.vue';
import BulkActionBar from '../components/books/BulkActionBar.vue';
import { apiClient } from '../services/api';
import type { AuthorWithBooks } from '@shared/types/author';
import type { BookSearchResult } from '@shared/types/api';

const route = useRoute();
const router = useRouter();

const author = ref<AuthorWithBooks | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const isEditModalOpen = ref(false);
const isRefreshing = ref(false);
const isBulkMode = ref(false);
const selectedBookIds = ref<Set<number>>(new Set());
const isBulkUpdating = ref(false);

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
    owned: book.owned,
  };
};

const handleEditAuthor = () => {
  isEditModalOpen.value = true;
};

const handleCloseEditModal = () => {
  isEditModalOpen.value = false;
};

const handleSaveAuthor = async (updates: {
  name?: string;
  bio?: string | null;
  photoUrl?: string | null;
}) => {
  if (!authorId.value) return;

  try {
    author.value = await apiClient.updateAuthor(authorId.value, updates);
    isEditModalOpen.value = false;
  } catch (err) {
    console.error('Failed to update author:', err);
    alert(err instanceof Error ? err.message : 'Failed to update author');
  }
};

const handleRefreshBooks = async () => {
  if (!authorId.value || isRefreshing.value) return;

  if (
    !confirm('Refresh books from Hardcover API? This will import any new books by this author.')
  ) {
    return;
  }

  isRefreshing.value = true;
  try {
    await apiClient.refreshAuthorBooks(authorId.value);
    await loadAuthor(); // Reload author to show new books
    alert('Books refreshed successfully!');
  } catch (err) {
    console.error('Failed to refresh books:', err);
    alert(err instanceof Error ? err.message : 'Failed to refresh books');
  } finally {
    isRefreshing.value = false;
  }
};

const toggleBulkMode = () => {
  isBulkMode.value = !isBulkMode.value;
  if (!isBulkMode.value) {
    selectedBookIds.value.clear();
  }
};

const handleSelectAll = () => {
  if (!author.value) return;
  selectedBookIds.value = new Set(author.value.books.map((b) => b.id));
};

const handleDeselectAll = () => {
  selectedBookIds.value.clear();
};

const toggleBookSelection = (bookId: number) => {
  if (selectedBookIds.value.has(bookId)) {
    selectedBookIds.value.delete(bookId);
  } else {
    selectedBookIds.value.add(bookId);
  }
  // Trigger reactivity
  selectedBookIds.value = new Set(selectedBookIds.value);
};

const isAllSelected = computed(() => {
  if (!author.value || author.value.books.length === 0) return false;
  return author.value.books.every((book) => selectedBookIds.value.has(book.id));
});

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

const handleBulkMarkAsNotOwned = async () => {
  if (selectedBookIds.value.size === 0 || isBulkUpdating.value) return;

  if (!confirm(`Mark ${selectedBookIds.value.size} book(s) as not owned?`)) {
    return;
  }

  isBulkUpdating.value = true;
  try {
    await apiClient.bulkUpdateBooks({
      bookIds: Array.from(selectedBookIds.value),
      owned: false,
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

const handleBulkDelete = async () => {
  if (selectedBookIds.value.size === 0 || isBulkUpdating.value) return;

  if (
    !confirm(
      `Delete ${selectedBookIds.value.size} book(s)? They will be marked as deleted but not permanently removed.`
    )
  ) {
    return;
  }

  isBulkUpdating.value = true;
  try {
    await apiClient.bulkUpdateBooks({
      bookIds: Array.from(selectedBookIds.value),
      deleted: true,
    });
    await loadAuthor();
    selectedBookIds.value.clear();
  } catch (err) {
    console.error('Failed to bulk delete books:', err);
    alert(err instanceof Error ? err.message : 'Failed to delete books');
  } finally {
    isBulkUpdating.value = false;
  }
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

            <div class="author-page__header-actions">
              <button
                @click="handleEditAuthor"
                class="action-button action-button--secondary"
                title="Edit author information"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  class="action-icon"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                  />
                </svg>
                <span>Edit</span>
              </button>

              <button
                @click="handleRefreshBooks"
                :disabled="isRefreshing"
                class="action-button action-button--primary"
                title="Refresh books from Hardcover API"
              >
                <svg
                  v-if="!isRefreshing"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  class="action-icon"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                  />
                </svg>
                <svg
                  v-else
                  class="action-icon action-spinner"
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
                <span>{{ isRefreshing ? 'Refreshing...' : 'Update from API' }}</span>
              </button>
            </div>
          </div>

          <div v-if="author.bio" class="author-page__bio">
            <h2 class="author-page__bio-title">Biography</h2>
            <p class="author-page__bio-text">{{ author.bio }}</p>
          </div>
        </header>

        <!-- Books Section -->
        <section class="author-page__books">
          <div class="author-page__books-header">
            <h2 class="author-page__books-title">Books</h2>
            <button
              v-if="author.books.length > 0 && !isBulkMode"
              @click="toggleBulkMode"
              class="action-button action-button--secondary"
              title="Enable bulk actions"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="action-icon"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
                />
              </svg>
              <span>Bulk Actions</span>
            </button>
          </div>

          <BulkActionBar
            v-if="isBulkMode"
            :selected-count="selectedBookIds.size"
            :total-count="author.books.length"
            :all-selected="isAllSelected"
            :loading="isBulkUpdating"
            @select-all="handleSelectAll"
            @deselect-all="handleDeselectAll"
            @mark-as-owned="handleBulkMarkAsOwned"
            @mark-as-not-owned="handleBulkMarkAsNotOwned"
            @delete-selected="handleBulkDelete"
            @cancel="toggleBulkMode"
          />

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
            <div
              v-for="book in author.books"
              :key="book.id"
              class="book-item"
              :class="{ 'book-item--selected': selectedBookIds.has(book.id) }"
            >
              <label v-if="isBulkMode" class="book-item__checkbox">
                <input
                  type="checkbox"
                  :checked="selectedBookIds.has(book.id)"
                  @change="toggleBookSelection(book.id)"
                  class="checkbox-input"
                />
              </label>
              <div class="book-item__content">
                <BookCard :book="convertBookToSearchResult(book)" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>

    <!-- Edit Author Modal -->
    <EditAuthorModal
      :author="author"
      :open="isEditModalOpen"
      @close="handleCloseEditModal"
      @save="handleSaveAuthor"
    />
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
  align-items: flex-start;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
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

.author-page__header-actions {
  display: flex;
  gap: 0.75rem;
  margin-left: auto;
  flex-wrap: wrap;
}

.action-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.action-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.action-button--primary {
  background-color: #3b82f6;
  color: white;
}

.action-button--primary:hover:not(:disabled) {
  background-color: #2563eb;
}

.action-button--primary:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}

.action-button--secondary {
  background-color: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.action-button--secondary:hover:not(:disabled) {
  background-color: #e5e7eb;
}

.action-button--secondary:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(209, 213, 219, 0.3);
}

.action-icon {
  width: 1.125rem;
  height: 1.125rem;
}

.action-spinner {
  animation: spin 1s linear infinite;
}

.author-page__books {
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 2rem;
}

.author-page__books-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.author-page__books-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
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

.book-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.2s;
}

.book-item--selected {
  background-color: #eff6ff;
  border-radius: 0.5rem;
  padding: 0.5rem;
  margin: -0.5rem;
}

.book-item__checkbox {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  cursor: pointer;
  padding-left: 0.5rem;
}

.checkbox-input {
  width: 1.25rem;
  height: 1.25rem;
  cursor: pointer;
  accent-color: #3b82f6;
}

.book-item__content {
  flex: 1;
  min-width: 0;
}

@media (max-width: 640px) {
  .author-page__header-content {
    flex-direction: column;
    text-align: center;
  }

  .author-page__header-actions {
    margin-left: 0;
    width: 100%;
  }

  .action-button {
    flex: 1;
    justify-content: center;
  }

  .author-page__name {
    font-size: 1.5rem;
  }
}
</style>
