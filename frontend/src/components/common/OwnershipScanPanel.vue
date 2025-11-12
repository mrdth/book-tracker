<script setup lang="ts">
import { ref } from 'vue';
import { apiClient } from '../../services/api';

const isScanning = ref(false);
const scanResult = ref<{
  scannedBooks: number;
  ownedBooks: number;
  updatedCount: number;
} | null>(null);
const error = ref<string | null>(null);
const forceRefresh = ref(false);

const handleScan = async () => {
  if (isScanning.value) return;

  isScanning.value = true;
  error.value = null;
  scanResult.value = null;

  try {
    const result = await apiClient.triggerOwnershipScan(forceRefresh.value);
    scanResult.value = result;
    console.log('Ownership scan completed', result);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to scan ownership';
    console.error('Ownership scan error:', err);
  } finally {
    isScanning.value = false;
  }
};

const clearResult = () => {
  scanResult.value = null;
  error.value = null;
};
</script>

<template>
  <div class="ownership-scan-panel">
    <div class="ownership-scan-panel__header">
      <h3 class="ownership-scan-panel__title">
        Ownership Scanner
      </h3>
      <p class="ownership-scan-panel__description">
        Scan your filesystem to automatically detect which books you own based on your collection
        directory structure.
      </p>
    </div>

    <div class="ownership-scan-panel__controls">
      <label class="ownership-scan-panel__checkbox">
        <input
          v-model="forceRefresh"
          type="checkbox"
          :disabled="isScanning"
          class="ownership-scan-panel__checkbox-input"
        >
        <span class="ownership-scan-panel__checkbox-label">
          Force refresh (bypass cache)
        </span>
      </label>

      <button
        :disabled="isScanning"
        class="ownership-scan-panel__scan-button"
        @click="handleScan"
      >
        <svg
          v-if="!isScanning"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="ownership-scan-panel__icon"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6"
          />
        </svg>
        <svg
          v-else
          class="ownership-scan-panel__icon ownership-scan-panel__spinner"
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
        <span>{{ isScanning ? 'Scanning...' : 'Scan Filesystem' }}</span>
      </button>
    </div>

    <!-- Success Result -->
    <div
      v-if="scanResult"
      class="ownership-scan-panel__result ownership-scan-panel__result--success"
    >
      <div class="ownership-scan-panel__result-header">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          class="ownership-scan-panel__result-icon"
        >
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
            clip-rule="evenodd"
          />
        </svg>
        <h4 class="ownership-scan-panel__result-title">
          Scan Complete
        </h4>
        <button
          class="ownership-scan-panel__result-close"
          aria-label="Close result"
          @click="clearResult"
        >
          ×
        </button>
      </div>
      <div class="ownership-scan-panel__result-stats">
        <div class="ownership-scan-panel__stat">
          <span class="ownership-scan-panel__stat-label">Directories Scanned</span>
          <span class="ownership-scan-panel__stat-value">{{ scanResult.scannedBooks }}</span>
        </div>
        <div class="ownership-scan-panel__stat">
          <span class="ownership-scan-panel__stat-label">Books Owned</span>
          <span class="ownership-scan-panel__stat-value">{{ scanResult.ownedBooks }}</span>
        </div>
        <div class="ownership-scan-panel__stat">
          <span class="ownership-scan-panel__stat-label">Records Updated</span>
          <span class="ownership-scan-panel__stat-value">{{ scanResult.updatedCount }}</span>
        </div>
      </div>
    </div>

    <!-- Error Result -->
    <div
      v-if="error"
      class="ownership-scan-panel__result ownership-scan-panel__result--error"
    >
      <div class="ownership-scan-panel__result-header">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          class="ownership-scan-panel__result-icon"
        >
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
            clip-rule="evenodd"
          />
        </svg>
        <h4 class="ownership-scan-panel__result-title">
          Scan Failed
        </h4>
        <button
          class="ownership-scan-panel__result-close"
          aria-label="Close error"
          @click="clearResult"
        >
          ×
        </button>
      </div>
      <p class="ownership-scan-panel__result-message">
        {{ error }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.ownership-scan-panel {
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1.5rem;
}

.ownership-scan-panel__header {
  margin-bottom: 1.5rem;
}

.ownership-scan-panel__title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 0.5rem 0;
}

.ownership-scan-panel__description {
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.5;
  margin: 0;
}

.ownership-scan-panel__controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.ownership-scan-panel__checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.ownership-scan-panel__checkbox-input {
  width: 1.125rem;
  height: 1.125rem;
  cursor: pointer;
  accent-color: #3b82f6;
}

.ownership-scan-panel__checkbox-input:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.ownership-scan-panel__checkbox-label {
  font-size: 0.875rem;
  color: #374151;
  user-select: none;
}

.ownership-scan-panel__scan-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.ownership-scan-panel__scan-button:hover:not(:disabled) {
  background-color: #2563eb;
}

.ownership-scan-panel__scan-button:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}

.ownership-scan-panel__scan-button:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.ownership-scan-panel__icon {
  width: 1.25rem;
  height: 1.25rem;
}

.ownership-scan-panel__spinner {
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

.ownership-scan-panel__result {
  margin-top: 1.5rem;
  padding: 1rem;
  border-radius: 0.5rem;
}

.ownership-scan-panel__result--success {
  background-color: #d1fae5;
  border: 1px solid #a7f3d0;
}

.ownership-scan-panel__result--error {
  background-color: #fee2e2;
  border: 1px solid #fecaca;
}

.ownership-scan-panel__result-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.ownership-scan-panel__result-icon {
  width: 1.5rem;
  height: 1.5rem;
  flex-shrink: 0;
}

.ownership-scan-panel__result--success .ownership-scan-panel__result-icon {
  color: #065f46;
}

.ownership-scan-panel__result--error .ownership-scan-panel__result-icon {
  color: #991b1b;
}

.ownership-scan-panel__result-title {
  flex: 1;
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}

.ownership-scan-panel__result--success .ownership-scan-panel__result-title {
  color: #065f46;
}

.ownership-scan-panel__result--error .ownership-scan-panel__result-title {
  color: #991b1b;
}

.ownership-scan-panel__result-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.25rem;
  transition: background-color 0.2s;
  color: inherit;
}

.ownership-scan-panel__result-close:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

.ownership-scan-panel__result-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.ownership-scan-panel__stat {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.ownership-scan-panel__stat-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #065f46;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.ownership-scan-panel__stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #065f46;
}

.ownership-scan-panel__result-message {
  margin: 0;
  font-size: 0.875rem;
  color: #991b1b;
  line-height: 1.5;
}

@media (max-width: 640px) {
  .ownership-scan-panel__result-stats {
    grid-template-columns: 1fr;
  }
}
</style>
