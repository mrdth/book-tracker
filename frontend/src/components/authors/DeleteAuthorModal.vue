<script setup lang="ts">
import { ref, computed } from 'vue';
import type { AuthorWithBooks } from '@shared/types/author';

interface Props {
  author: AuthorWithBooks | null;
  open: boolean;
  soleAuthoredBookCount: number;
  coAuthoredBookCount: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  confirm: [];
}>();

const isDeleting = ref(false);

const handleClose = () => {
  if (isDeleting.value) return;
  emit('close');
};

const handleConfirm = () => {
  if (isDeleting.value || !props.author) return;
  isDeleting.value = true;
  emit('confirm');
};

const formatBookCount = (count: number): string => {
  return count === 1 ? '1 book' : `${count} books`;
};

const deletionMessage = computed(() => {
  if (!props.author) return '';

  const totalBooks = props.soleAuthoredBookCount + props.coAuthoredBookCount;

  if (totalBooks === 0) {
    return `${props.author.name} will be deleted. Only the author record will be removed.`;
  }

  let message = `${props.author.name} will be deleted.`;

  if (props.soleAuthoredBookCount > 0) {
    message += ` ${formatBookCount(props.soleAuthoredBookCount)} will be permanently deleted.`;
  }

  if (props.coAuthoredBookCount > 0) {
    message += ` ${formatBookCount(props.coAuthoredBookCount)} (co-authored) will be preserved.`;
  }

  return message;
});

// Handle Escape key
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    handleClose();
  }
};
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="modal-overlay"
        @click.self="handleClose"
        @keydown="handleKeydown"
      >
        <div
          class="modal-container"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div class="modal-header">
            <h2
              id="modal-title"
              class="modal-title"
            >
              Delete Author
            </h2>
            <button
              class="modal-close-button"
              aria-label="Close modal"
              :disabled="isDeleting"
              @click="handleClose"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="modal-close-icon"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div class="modal-body">
            <div class="warning-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>

            <p class="deletion-message">
              {{ deletionMessage }}
            </p>

            <p class="warning-text">
              This action cannot be undone.
            </p>
          </div>

          <div class="modal-actions">
            <button
              type="button"
              class="modal-cancel-button"
              :disabled="isDeleting"
              @click="handleClose"
            >
              Cancel
            </button>
            <button
              type="button"
              class="modal-delete-button"
              :disabled="isDeleting"
              @click="handleConfirm"
            >
              <svg
                v-if="isDeleting"
                class="button-spinner"
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
              <span>{{ isDeleting ? 'Deleting...' : 'Delete Author' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-container {
  background-color: white;
  border-radius: 0.75rem;
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-width: 28rem;
  width: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.modal-close-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  border: none;
  background: none;
  color: #6b7280;
  cursor: pointer;
  border-radius: 0.375rem;
  transition: all 0.2s;
}

.modal-close-button:hover:not(:disabled) {
  background-color: #f3f4f6;
  color: #111827;
}

.modal-close-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.modal-close-icon {
  width: 1.5rem;
  height: 1.5rem;
}

.modal-body {
  padding: 1.5rem;
  text-align: center;
}

.warning-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  margin: 0 auto 1rem;
  background-color: #fef2f2;
  border-radius: 50%;
  color: #dc2626;
}

.warning-icon svg {
  width: 1.75rem;
  height: 1.75rem;
}

.deletion-message {
  font-size: 0.9375rem;
  color: #374151;
  margin: 0 0 1rem;
  line-height: 1.6;
}

.warning-text {
  font-size: 0.875rem;
  font-weight: 500;
  color: #dc2626;
  margin: 0;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.modal-cancel-button,
.modal-delete-button {
  padding: 0.625rem 1.25rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.modal-cancel-button {
  border: 1px solid #d1d5db;
  background-color: white;
  color: #374151;
}

.modal-cancel-button:hover:not(:disabled) {
  background-color: #f9fafb;
}

.modal-cancel-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.modal-delete-button {
  border: none;
  background-color: #dc2626;
  color: white;
}

.modal-delete-button:hover:not(:disabled) {
  background-color: #b91c1c;
}

.modal-delete-button:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.3);
}

.modal-delete-button:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.button-spinner {
  width: 1rem;
  height: 1rem;
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

/* Modal transition */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.3s ease;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.95);
}

@media (max-width: 640px) {
  .modal-overlay {
    padding: 0;
  }

  .modal-container {
    border-radius: 0;
  }

  .modal-actions {
    flex-direction: column-reverse;
  }

  .modal-cancel-button,
  .modal-delete-button {
    width: 100%;
    justify-content: center;
  }
}
</style>
