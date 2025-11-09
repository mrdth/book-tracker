<script setup lang="ts">
import { ref } from 'vue';
import StatusBadge from '../common/StatusBadge.vue';
import type { BookSearchResult } from '@shared/types/api';

interface Props {
  book: BookSearchResult;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const emit = defineEmits<{
  import: [externalId: string];
}>();

const isImporting = ref(false);

const handleImport = async () => {
  if (props.book.status !== 'not_imported' || isImporting.value) {
    return;
  }

  isImporting.value = true;
  try {
    emit('import', props.book.externalId);
  } finally {
    // Keep loading state until parent component updates
    setTimeout(() => {
      isImporting.value = false;
    }, 500);
  }
};

const formatPublicationDate = (date: string | null): string => {
  if (!date) return 'Unknown';
  const year = new Date(date).getFullYear();
  return year.toString();
};

const getAuthorNames = (): string => {
  if (props.book.authors.length === 0) return 'Unknown Author';
  if (props.book.authors.length === 1) return props.book.authors[0].name;
  if (props.book.authors.length === 2) {
    return `${props.book.authors[0].name} & ${props.book.authors[1].name}`;
  }
  return `${props.book.authors[0].name} & ${props.book.authors.length - 1} others`;
};

const canImport = (): boolean => {
  return props.book.status === 'not_imported' && !isImporting.value && !props.loading;
};
</script>

<template>
  <div class="book-card">
    <div class="book-card__image-container">
      <img
        v-if="book.coverUrl"
        :src="book.coverUrl"
        :alt="`Cover of ${book.title}`"
        class="book-card__image"
        loading="lazy"
      />
      <div v-else class="book-card__image-placeholder">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="book-card__placeholder-icon"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
          />
        </svg>
      </div>
    </div>

    <div class="book-card__content">
      <div class="book-card__header">
        <h3 class="book-card__title">{{ book.title }}</h3>
        <StatusBadge :status="book.status" size="sm" />
      </div>

      <p class="book-card__author">{{ getAuthorNames() }}</p>

      <div class="book-card__metadata">
        <span v-if="book.isbn" class="book-card__metadata-item">
          ISBN: {{ book.isbn }}
        </span>
        <span class="book-card__metadata-item">
          {{ formatPublicationDate(book.publicationDate) }}
        </span>
      </div>

      <button
        v-if="canImport()"
        @click="handleImport"
        :disabled="isImporting || loading"
        class="book-card__import-button"
        :aria-label="`Import ${book.title}`"
      >
        <svg
          v-if="!isImporting"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="book-card__button-icon"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 4.5v15m7.5-7.5h-15"
          />
        </svg>
        <svg
          v-else
          class="book-card__button-icon book-card__spinner"
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
        <span>{{ isImporting ? 'Importing...' : 'Import' }}</span>
      </button>

      <div v-else-if="book.status === 'deleted'" class="book-card__deleted-message">
        This book was previously deleted
      </div>

      <div v-else-if="book.status === 'imported'" class="book-card__imported-message">
        Already in your library
      </div>
    </div>
  </div>
</template>

<style scoped>
.book-card {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  transition: all 0.2s;
}

.book-card:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.book-card__image-container {
  flex-shrink: 0;
  width: 6rem;
  height: 9rem;
  border-radius: 0.25rem;
  overflow: hidden;
  background-color: #f3f4f6;
}

.book-card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.book-card__image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background-color: #f3f4f6;
  color: #9ca3af;
}

.book-card__placeholder-icon {
  width: 3rem;
  height: 3rem;
}

.book-card__content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
}

.book-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.book-card__title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  line-height: 1.5;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.book-card__author {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.book-card__metadata {
  display: flex;
  gap: 0.75rem;
  font-size: 0.75rem;
  color: #9ca3af;
}

.book-card__metadata-item {
  display: flex;
  align-items: center;
}

.book-card__import-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  align-self: flex-start;
  padding: 0.5rem 1rem;
  margin-top: 0.5rem;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.book-card__import-button:hover:not(:disabled) {
  background-color: #2563eb;
}

.book-card__import-button:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}

.book-card__import-button:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.book-card__button-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.book-card__spinner {
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

.book-card__deleted-message,
.book-card__imported-message {
  padding: 0.5rem;
  margin-top: 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  text-align: center;
}

.book-card__deleted-message {
  background-color: #fee2e2;
  color: #991b1b;
}

.book-card__imported-message {
  background-color: #d1fae5;
  color: #065f46;
}

@media (max-width: 640px) {
  .book-card {
    flex-direction: column;
  }

  .book-card__image-container {
    width: 100%;
    height: 12rem;
  }
}
</style>
