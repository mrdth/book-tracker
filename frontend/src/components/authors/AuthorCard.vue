<script setup lang="ts">
import { ref } from 'vue';
import type { AuthorSearchResult } from '@shared/types/api';

interface Props {
  author: AuthorSearchResult;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const emit = defineEmits<{
  import: [externalId: string];
  view: [externalId: string];
}>();

const isImporting = ref(false);

const handleImport = async () => {
  if (props.author.status !== 'not_imported' || isImporting.value) {
    return;
  }

  isImporting.value = true;
  try {
    emit('import', props.author.externalId);
  } finally {
    // Keep loading state until parent component updates
     
    setTimeout(() => {
      isImporting.value = false;
    }, 500);
  }
};

const handleView = () => {
  emit('view', props.author.externalId);
};

const canImport = (): boolean => {
  return props.author.status === 'not_imported' && !isImporting.value && !props.loading;
};

const canView = (): boolean => {
  return props.author.status === 'imported';
};

const formatBookCount = (): string => {
  const count = props.author.bookCount;
  if (count === 0) return 'No books';
  if (count === 1) return '1 book';
  return `${count} books`;
};

const truncateBio = (bio: string | null): string => {
  if (!bio) return '';
  const maxLength = 150;
  if (bio.length <= maxLength) return bio;
  return bio.substring(0, maxLength).trim() + '...';
};
</script>

<template>
  <div class="author-card">
    <div class="author-card__image-container">
      <img
        v-if="author.photoUrl"
        :src="author.photoUrl"
        :alt="`Photo of ${author.name}`"
        class="author-card__image"
        loading="lazy"
      >
      <div
        v-else
        class="author-card__image-placeholder"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="author-card__placeholder-icon"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
          />
        </svg>
      </div>
    </div>

    <div class="author-card__content">
      <div class="author-card__header">
        <h3 class="author-card__name">
          {{ author.name }}
        </h3>
        <span class="author-card__book-count">{{ formatBookCount() }}</span>
      </div>

      <p
        v-if="author.bio"
        class="author-card__bio"
      >
        {{ truncateBio(author.bio) }}
      </p>

      <div class="author-card__actions">
        <button
          v-if="canImport()"
          :disabled="isImporting || loading"
          class="author-card__import-button"
          :aria-label="`Import all books by ${author.name}`"
          @click="handleImport"
        >
          <svg
            v-if="!isImporting"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="author-card__button-icon"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
            />
          </svg>
          <svg
            v-else
            class="author-card__button-icon author-card__spinner"
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
          <span>{{ isImporting ? 'Importing all books...' : 'Import all books' }}</span>
        </button>

        <button
          v-if="canView()"
          class="author-card__view-button"
          :aria-label="`View ${author.name}'s profile`"
          @click="handleView"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="author-card__button-icon"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span>View author</span>
        </button>
      </div>

      <div
        v-if="author.status === 'imported'"
        class="author-card__imported-badge"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="author-card__badge-icon"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>In your library</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.author-card {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  transition: all 0.2s;
}

.author-card:hover {
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.author-card__image-container {
  flex-shrink: 0;
  width: 6rem;
  height: 6rem;
  border-radius: 50%;
  overflow: hidden;
  background-color: #f3f4f6;
}

.author-card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.author-card__image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background-color: #f3f4f6;
  color: #9ca3af;
}

.author-card__placeholder-icon {
  width: 3rem;
  height: 3rem;
}

.author-card__content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
}

.author-card__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
}

.author-card__name {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  line-height: 1.5;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.author-card__book-count {
  flex-shrink: 0;
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

.author-card__bio {
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.5;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.author-card__actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.author-card__import-button,
.author-card__view-button {
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

.author-card__import-button {
  background-color: #3b82f6;
  color: white;
}

.author-card__import-button:hover:not(:disabled) {
  background-color: #2563eb;
}

.author-card__import-button:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}

.author-card__import-button:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.author-card__view-button {
  background-color: #f3f4f6;
  color: #374151;
}

.author-card__view-button:hover {
  background-color: #e5e7eb;
}

.author-card__view-button:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(156, 163, 175, 0.3);
}

.author-card__button-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.author-card__spinner {
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

.author-card__imported-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  align-self: flex-start;
  padding: 0.25rem 0.75rem;
  background-color: #d1fae5;
  color: #065f46;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.author-card__badge-icon {
  width: 1rem;
  height: 1rem;
}

@media (max-width: 640px) {
  .author-card {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .author-card__header {
    flex-direction: column;
    gap: 0.25rem;
  }

  .author-card__actions {
    flex-direction: column;
    width: 100%;
  }

  .author-card__import-button,
  .author-card__view-button {
    width: 100%;
    justify-content: center;
  }
}
</style>
