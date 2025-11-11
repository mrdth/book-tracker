<script setup lang="ts">
import { ref } from 'vue';
import type { AuthorListItem } from '@shared/types/author';

interface Props {
  author: AuthorListItem;
}

const props = defineProps<Props>();

// State for bio expansion
const bioExpanded = ref(false);

/**
 * Toggle bio expansion
 */
const toggleBio = () => {
  bioExpanded.value = !bioExpanded.value;
};

/**
 * Truncate name at 50 characters
 */
const truncatedName = (name: string): string => {
  if (name.length <= 50) {
    return name;
  }
  return name.substring(0, 50) + '...';
};
</script>

<template>
  <div
    class="author-card p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow bg-white"
  >
    <!-- Author Photo and Name Row -->
    <div class="flex items-start gap-4">
      <!-- Circular Photo -->
      <div class="flex-shrink-0">
        <div v-if="author.photoUrl" class="w-16 h-16 rounded-full overflow-hidden bg-gray-100">
          <img
            :src="author.photoUrl"
            :alt="`Photo of ${author.name}`"
            class="w-full h-full object-cover"
            @error="($event.target as HTMLImageElement).src = ''"
          />
        </div>
        <!-- Placeholder for missing photo -->
        <div
          v-else
          class="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-xl"
        >
          {{ author.name.charAt(0).toUpperCase() }}
        </div>
      </div>

      <!-- Author Info -->
      <div class="flex-1 min-w-0">
        <!-- Name with truncation at 50 chars -->
        <h3
          class="text-lg font-semibold text-gray-900 mb-1"
          :title="author.name.length > 50 ? author.name : undefined"
        >
          {{ truncatedName(author.name) }}
        </h3>

        <!-- Book Count -->
        <p class="text-sm text-gray-600 mb-2">
          {{ author.bookCount }} {{ author.bookCount === 1 ? 'book' : 'books' }} collected
        </p>

        <!-- Bio with 3-line truncation and expand/collapse -->
        <div v-if="author.bio" class="text-sm text-gray-700">
          <p
            :class="['bio-text', { 'line-clamp-3': !bioExpanded, 'cursor-pointer': !bioExpanded }]"
            @click="!bioExpanded && toggleBio()"
          >
            {{ author.bio }}
          </p>
          <!-- Show Less button when expanded -->
          <button
            v-if="bioExpanded"
            @click="toggleBio"
            class="text-blue-600 hover:text-blue-800 text-sm mt-1 font-medium"
          >
            Show less
          </button>
          <!-- Show More button hint (only visible if text is actually truncated) -->
          <button
            v-else-if="author.bio.length > 200"
            @click="toggleBio"
            class="text-blue-600 hover:text-blue-800 text-sm mt-1 font-medium"
          >
            Show more
          </button>
        </div>

        <!-- Empty bio message -->
        <p v-else class="text-sm text-gray-400 italic">No biography available</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Line clamp utility for bio truncation */
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bio-text {
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
