<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  selectedCount: number;
  totalCount: number;
  allSelected: boolean;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const emit = defineEmits<{
  selectAll: [];
  deselectAll: [];
  markAsOwned: [];
  markAsNotOwned: [];
  deleteSelected: [];
  cancel: [];
}>();

const handleToggleSelectAll = () => {
  if (props.allSelected) {
    emit('deselectAll');
  } else {
    emit('selectAll');
  }
};

const handleMarkAsOwned = () => {
  if (props.selectedCount === 0 || props.loading) return;
  emit('markAsOwned');
};

const handleMarkAsNotOwned = () => {
  if (props.selectedCount === 0 || props.loading) return;
  emit('markAsNotOwned');
};

const handleDelete = () => {
  if (props.selectedCount === 0 || props.loading) return;
  emit('deleteSelected');
};

const handleCancel = () => {
  emit('cancel');
};

const selectionText = computed(() => {
  if (props.selectedCount === 0) {
    return 'No books selected';
  }
  if (props.selectedCount === 1) {
    return '1 book selected';
  }
  return `${props.selectedCount} books selected`;
});

const canPerformActions = computed(() => {
  return props.selectedCount > 0 && !props.loading;
});
</script>

<template>
  <div class="bulk-action-bar">
    <div class="bulk-action-bar__content">
      <div class="bulk-action-bar__selection">
        <label class="checkbox-label">
          <input
            type="checkbox"
            class="checkbox-input"
            :checked="allSelected"
            :indeterminate="selectedCount > 0 && !allSelected"
            :disabled="loading"
            @change="handleToggleSelectAll"
          />
          <span class="checkbox-text">{{ selectionText }}</span>
        </label>
      </div>

      <div class="bulk-action-bar__actions">
        <button
          :disabled="!canPerformActions"
          class="action-button action-button--primary"
          title="Mark selected books as owned"
          @click="handleMarkAsOwned"
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
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span class="action-text">Mark as Owned</span>
        </button>

        <button
          :disabled="!canPerformActions"
          class="action-button action-button--secondary"
          title="Mark selected books as not owned"
          @click="handleMarkAsNotOwned"
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
              d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span class="action-text">Mark as Not Owned</span>
        </button>

        <button
          :disabled="!canPerformActions"
          class="action-button action-button--danger"
          title="Delete selected books"
          @click="handleDelete"
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
              d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
            />
          </svg>
          <span class="action-text">Delete</span>
        </button>

        <button
          class="action-button action-button--cancel"
          title="Exit bulk action mode"
          :disabled="loading"
          @click="handleCancel"
        >
          <span class="action-text">Cancel</span>
        </button>
      </div>
    </div>

    <div v-if="loading" class="bulk-action-bar__loading">
      <svg
        class="loading-spinner"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span>Processing...</span>
    </div>
  </div>
</template>

<style scoped>
.bulk-action-bar {
  position: sticky;
  top: 80px;
  z-index: 10;
  background-color: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  padding: 1rem;
  margin-bottom: 1rem;
  box-shadow:
    0 1px 3px 0 rgba(0, 0, 0, 0.1),
    0 1px 2px 0 rgba(0, 0, 0, 0.06);
}

.bulk-action-bar__content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.bulk-action-bar__selection {
  flex-shrink: 0;
}

.checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  cursor: pointer;
  user-select: none;
}

.checkbox-input {
  width: 1.125rem;
  height: 1.125rem;
  cursor: pointer;
  accent-color: #3b82f6;
}

.checkbox-input:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.checkbox-text {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.bulk-action-bar__actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.action-button {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.875rem;
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
  background-color: #10b981;
  color: white;
}

.action-button--primary:hover:not(:disabled) {
  background-color: #059669;
}

.action-button--primary:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.3);
}

.action-button--secondary {
  background-color: #6b7280;
  color: white;
}

.action-button--secondary:hover:not(:disabled) {
  background-color: #4b5563;
}

.action-button--secondary:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(107, 114, 128, 0.3);
}

.action-button--danger {
  background-color: #ef4444;
  color: white;
}

.action-button--danger:hover:not(:disabled) {
  background-color: #dc2626;
}

.action-button--danger:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.3);
}

.action-button--cancel {
  background-color: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.action-button--cancel:hover:not(:disabled) {
  background-color: #f9fafb;
}

.action-button--cancel:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(209, 213, 219, 0.3);
}

.action-icon {
  width: 1.125rem;
  height: 1.125rem;
}

.action-text {
  display: inline;
}

.bulk-action-bar__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid #d1d5db;
  font-size: 0.875rem;
  color: #6b7280;
}

.loading-spinner {
  width: 1.25rem;
  height: 1.25rem;
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

@media (max-width: 768px) {
  .bulk-action-bar__content {
    flex-direction: column;
    align-items: stretch;
  }

  .bulk-action-bar__actions {
    justify-content: stretch;
  }

  .action-button {
    flex: 1;
    justify-content: center;
  }

  .action-text {
    display: none;
  }
}

@media (max-width: 640px) {
  .action-button {
    padding: 0.625rem;
  }

  .bulk-action-bar__actions {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }

  .action-button--cancel {
    grid-column: 1 / -1;
  }
}
</style>
