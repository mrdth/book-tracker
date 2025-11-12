<script setup lang="ts">
import { ref, watch } from 'vue';
import type { AuthorWithBooks } from '@shared/types/author';

interface Props {
  author: AuthorWithBooks | null;
  open: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  save: [updates: { name?: string; bio?: string | null; photoUrl?: string | null }];
}>();

const name = ref('');
const bio = ref('');
const photoUrl = ref('');
const isSaving = ref(false);

// Reset form when author changes
watch(
  () => props.author,
  (newAuthor) => {
    if (newAuthor) {
      name.value = newAuthor.name;
      bio.value = newAuthor.bio ?? '';
      photoUrl.value = newAuthor.photoUrl ?? '';
    }
  },
  { immediate: true }
);

const handleClose = () => {
  if (isSaving.value) return;
  emit('close');
};

const handleSave = async () => {
  if (isSaving.value || !props.author) return;

  const updates: { name?: string; bio?: string | null; photoUrl?: string | null } = {};

  // Only include changed fields
  if (name.value !== props.author.name) {
    updates.name = name.value;
  }

  if (bio.value !== (props.author.bio ?? '')) {
    updates.bio = bio.value || null;
  }

  if (photoUrl.value !== (props.author.photoUrl ?? '')) {
    updates.photoUrl = photoUrl.value || null;
  }

  // Don't emit if nothing changed
  if (Object.keys(updates).length === 0) {
    handleClose();
    return;
  }

  isSaving.value = true;
  emit('save', updates);
};

const isNameValid = () => {
  return name.value.trim().length > 0;
};

const canSave = () => {
  return isNameValid() && !isSaving.value;
};

// Handle Escape key
// eslint-disable-next-line no-undef
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    handleClose();
  }
};
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="modal-overlay" @click.self="handleClose" @keydown="handleKeydown">
        <div class="modal-container" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div class="modal-header">
            <h2 id="modal-title" class="modal-title">Edit Author</h2>
            <button
              @click="handleClose"
              class="modal-close-button"
              aria-label="Close modal"
              :disabled="isSaving"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="modal-close-icon"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form @submit.prevent="handleSave" class="modal-form">
            <div class="form-group">
              <label for="author-name" class="form-label">Name *</label>
              <input
                id="author-name"
                v-model="name"
                type="text"
                class="form-input"
                :class="{ 'form-input--error': !isNameValid() }"
                placeholder="Enter author name"
                required
                :disabled="isSaving"
              />
              <p v-if="!isNameValid()" class="form-error">Author name is required</p>
            </div>

            <div class="form-group">
              <label for="author-bio" class="form-label">Biography</label>
              <textarea
                id="author-bio"
                v-model="bio"
                class="form-textarea"
                placeholder="Enter author biography"
                rows="5"
                :disabled="isSaving"
              ></textarea>
            </div>

            <div class="form-group">
              <label for="author-photo" class="form-label">Photo URL</label>
              <input
                id="author-photo"
                v-model="photoUrl"
                type="url"
                class="form-input"
                placeholder="https://example.com/photo.jpg"
                :disabled="isSaving"
              />
            </div>

            <div class="modal-actions">
              <button
                type="button"
                @click="handleClose"
                class="modal-cancel-button"
                :disabled="isSaving"
              >
                Cancel
              </button>
              <button type="submit" class="modal-save-button" :disabled="!canSave()">
                <svg
                  v-if="isSaving"
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
                  ></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>{{ isSaving ? 'Saving...' : 'Save Changes' }}</span>
              </button>
            </div>
          </form>
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
  max-width: 32rem;
  width: 100%;
  max-height: 90vh;
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

.modal-form {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 0.625rem 0.875rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  color: #111827;
  transition: all 0.2s;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-input:disabled,
.form-textarea:disabled {
  background-color: #f3f4f6;
  cursor: not-allowed;
}

.form-input--error {
  border-color: #ef4444;
}

.form-input--error:focus {
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 5rem;
}

.form-error {
  margin-top: 0.375rem;
  font-size: 0.75rem;
  color: #ef4444;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.modal-cancel-button,
.modal-save-button {
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

.modal-save-button {
  border: none;
  background-color: #3b82f6;
  color: white;
}

.modal-save-button:hover:not(:disabled) {
  background-color: #2563eb;
}

.modal-save-button:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}

.modal-save-button:disabled {
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
    max-height: 100vh;
    border-radius: 0;
  }

  .modal-actions {
    flex-direction: column-reverse;
  }

  .modal-cancel-button,
  .modal-save-button {
    width: 100%;
    justify-content: center;
  }
}
</style>
