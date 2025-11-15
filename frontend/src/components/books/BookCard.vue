<script setup lang="ts">
import { ref } from 'vue';
import StatusBadge from '../common/StatusBadge.vue';
import type { BookSearchResult } from '@shared/types/api';

interface Props {
  book: BookSearchResult;
  bookId?: number; // Internal book ID for ownership toggle (only available when book is imported)
  loading?: boolean;
  showDelete?: boolean; // Show delete button for imported books
  showOwnershipToggle?: boolean; // Show ownership toggle for imported books
  showAuthorName?: boolean; // Show author name for imported books
  showDescription?: boolean; // Show book description
}

const props = withDefaults(defineProps<Props>(), {
  bookId: undefined,
  loading: false,
  showDelete: false,
  showOwnershipToggle: false,
  showAuthorName: true,
  showDescription: false,
});

const emit = defineEmits<{
  import: [externalId: string];
  delete: [externalId: string];
  'update-ownership': [bookId: number, owned: boolean];
}>();

const isImporting = ref(false);
const isDeleting = ref(false);
const showOwnershipDropdown = ref(false);
const descriptionExpanded = ref(false);

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

const handleDelete = async () => {
  if (isDeleting.value) return;

  isDeleting.value = true;
  try {
    emit('delete', props.book.externalId);
  } finally {
    // Keep loading state until parent component updates
    setTimeout(() => {
      isDeleting.value = false;
    }, 500);
  }
};

const canImport = (): boolean => {
  return props.book.status === 'not_imported' && !isImporting.value && !props.loading;
};

const canDelete = (): boolean => {
  return (
    props.showDelete && props.book.status === 'imported' && !isDeleting.value && !props.loading
  );
};

const toggleOwnershipDropdown = () => {
  showOwnershipDropdown.value = !showOwnershipDropdown.value;
};

const closeOwnershipDropdown = () => {
  showOwnershipDropdown.value = false;
};

const handleToggleOwnership = () => {
  if (props.bookId === undefined) return;

  const newOwned = !props.book.owned;
  emit('update-ownership', props.bookId, newOwned);
  closeOwnershipDropdown();
};

const canShowOwnershipToggle = (): boolean => {
  return (
    props.showOwnershipToggle &&
    props.book.status === 'imported' &&
    props.bookId !== undefined &&
    !props.loading
  );
};

const toggleDescription = () => {
  descriptionExpanded.value = !descriptionExpanded.value;
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
        <h3 class="book-card__title">
          {{ book.title }}
        </h3>
        <StatusBadge :status="book.status" size="sm" />
      </div>

      <p v-if="showAuthorName" class="book-card__author">
        {{ getAuthorNames() }}
      </p>

      <div v-if="showDescription && book.description" class="book-card__description-container">
        <p
          :class="[
            'book-card__description',
            { 'book-card__description--truncated': !descriptionExpanded },
          ]"
        >
          {{ book.description }}
        </p>
        <!-- Show Less button when expanded -->
        <button
          v-if="descriptionExpanded"
          class="book-card__description-toggle"
          @click="toggleDescription"
        >
          Show less
        </button>
        <!-- Show More button hint (only visible if text is longer than ~150 chars) -->
        <button
          v-else-if="book.description.length > 150"
          class="book-card__description-toggle"
          @click="toggleDescription"
        >
          Show more
        </button>
      </div>

      <div class="book-card__metadata">
        <span v-if="book.isbn" class="book-card__metadata-item"> ISBN: {{ book.isbn }} </span>
        <span class="book-card__metadata-item">
          {{ formatPublicationDate(book.publicationDate) }}
        </span>
      </div>

      <button
        v-if="canImport()"
        :disabled="isImporting || loading"
        class="book-card__import-button"
        :aria-label="`Import ${book.title}`"
        @click="handleImport"
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
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
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
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span>{{ isImporting ? 'Importing...' : 'Import' }}</span>
      </button>

      <!-- Action buttons row -->
      <div v-if="canDelete() || canShowOwnershipToggle()" class="book-card__actions">
        <button
          v-if="canDelete()"
          :disabled="isDeleting || loading"
          class="book-card__delete-button"
          :aria-label="`Delete ${book.title}`"
          @click="handleDelete"
        >
          <svg
            v-if="!isDeleting"
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
              d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
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
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </button>

        <!-- Ownership dropdown button -->
        <div v-if="canShowOwnershipToggle()" class="book-card__ownership-dropdown">
          <button
            :disabled="loading"
            class="book-card__ownership-button"
            :class="{ 'book-card__ownership-button--owned': book.owned }"
            :aria-label="`Ownership status: ${book.owned ? 'Owned' : 'Not Owned'}`"
            @click="toggleOwnershipDropdown"
          >
            <span>{{ book.owned ? 'Owned' : 'Not Owned' }}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="book-card__dropdown-icon"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M19.5 8.25l-7.5 7.5-7.5-7.5"
              />
            </svg>
          </button>

          <!-- Dropdown menu -->
          <div v-if="showOwnershipDropdown" class="book-card__dropdown-menu">
            <button class="book-card__dropdown-item" @click="handleToggleOwnership">
              {{ book.owned ? 'Mark as Not Owned' : 'Mark as Owned' }}
            </button>
          </div>

          <!-- Backdrop to close dropdown when clicking outside -->
          <div
            v-if="showOwnershipDropdown"
            class="book-card__dropdown-backdrop"
            @click="closeOwnershipDropdown"
          />
        </div>
      </div>

      <div v-else-if="book.status === 'deleted'" class="book-card__deleted-message">
        This book was previously deleted
      </div>

      <div
        v-else-if="book.owned && !showDelete && !showOwnershipToggle"
        class="book-card__imported-message"
      >
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
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
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

.book-card__description-container {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.book-card__description {
  font-size: 0.875rem;
  color: #4b5563;
  margin: 0;
  line-height: 1.5;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.book-card__description--truncated {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.book-card__description-toggle {
  align-self: flex-start;
  background: none;
  border: none;
  color: #3b82f6;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0;
  transition: color 0.2s;
}

.book-card__description-toggle:hover {
  color: #2563eb;
}

.book-card__description-toggle:focus {
  outline: none;
  text-decoration: underline;
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

.book-card__actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.book-card__import-button,
.book-card__delete-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.book-card__import-button {
  align-self: flex-start;
  margin-top: 0.5rem;
}

.book-card__import-button {
  background-color: #3b82f6;
  color: white;
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

.book-card__delete-button {
  background-color: #ef4444;
  color: white;
}

.book-card__delete-button:hover:not(:disabled) {
  background-color: #dc2626;
}

.book-card__delete-button:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.3);
}

.book-card__delete-button:disabled {
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

.book-card__ownership-dropdown {
  position: relative;
  margin-left: auto;
}

.book-card__ownership-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  background-color: #f3f4f6;
  color: #374151;
}

.book-card__ownership-button--owned {
  background-color: #d1fae5;
  color: #065f46;
  border-color: #10b981;
}

.book-card__ownership-button:hover:not(:disabled) {
  background-color: #e5e7eb;
}

.book-card__ownership-button--owned:hover:not(:disabled) {
  background-color: #a7f3d0;
}

.book-card__ownership-button:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}

.book-card__ownership-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.book-card__dropdown-icon {
  width: 1rem;
  height: 1rem;
}

.book-card__dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.25rem;
  min-width: 12rem;
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05);
  z-index: 50;
}

.book-card__dropdown-item {
  display: block;
  width: 100%;
  padding: 0.625rem 1rem;
  text-align: left;
  font-size: 0.875rem;
  color: #374151;
  background-color: transparent;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s;
}

.book-card__dropdown-item:hover {
  background-color: #f3f4f6;
}

.book-card__dropdown-item:focus {
  outline: none;
  background-color: #e5e7eb;
}

.book-card__dropdown-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 40;
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
