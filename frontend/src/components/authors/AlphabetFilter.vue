<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  selectedLetter: string | null;
}

 
interface Emits {
  // eslint-disable-next-line no-unused-vars
  (event: 'select', letter: string | null): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Generate array of letters A-Z
const letters = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

/**
 * Handle letter selection
 * @param letter - The selected letter (A-Z) or null for "All"
 */
const selectLetter = (letter: string | null) => {
  emit('select', letter);
};

/**
 * Check if a letter is currently selected
 */
const isSelected = (letter: string | null) => {
  return props.selectedLetter === letter;
};

/**
 * Compute if "All" is selected (no filter active)
 */
const isAllSelected = computed(() => props.selectedLetter === null);
</script>

<template>
  <div class="alphabet-filter bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
    <div class="flex flex-col gap-3">
      <!-- Label -->
      <label class="text-sm font-medium text-gray-700">Filter by last name:</label>

      <!-- Filter Buttons Container -->
      <div class="flex flex-wrap gap-2 items-center">
        <!-- "All" Button -->
        <button
          :class="[
            'px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            isAllSelected
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300',
          ]"
          :aria-pressed="isAllSelected"
          :aria-label="isAllSelected ? 'All authors selected' : 'Show all authors'"
          @click="selectLetter(null)"
        >
          All
        </button>

        <!-- Separator -->
        <div
          class="w-px h-6 bg-gray-300"
          aria-hidden="true"
        />

        <!-- Letter Buttons A-Z -->
        <button
          v-for="letter in letters"
          :key="letter"
          :class="[
            'w-9 h-9 text-sm font-medium rounded-md transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            isSelected(letter)
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300',
          ]"
          :aria-pressed="isSelected(letter)"
          :aria-label="`Filter authors by letter ${letter}`"
          @click="selectLetter(letter)"
        >
          {{ letter }}
        </button>
      </div>

      <!-- Active Filter Indicator -->
      <div
        v-if="selectedLetter"
        class="flex items-center text-sm text-gray-600"
      >
        <svg
          class="w-4 h-4 mr-1.5 text-blue-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>
        <span>Showing authors with last names starting with <strong>{{ selectedLetter }}</strong></span>
        <button
          class="ml-2 text-blue-600 hover:text-blue-800 underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          aria-label="Clear filter"
          @click="selectLetter(null)"
        >
          Clear
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.alphabet-filter {
  /* Ensure the component doesn't overflow on small screens */
  max-width: 100%;
}

/* Smooth transitions for button states */
button {
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

/* Ensure buttons are touch-friendly on mobile */
@media (max-width: 640px) {
  button {
    min-width: 2.5rem;
    min-height: 2.5rem;
  }
}
</style>
