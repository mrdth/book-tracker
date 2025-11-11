<script setup lang="ts">
import { onMounted } from 'vue';
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import { useAuthorsList } from '../composables/useAuthorsList';
import AuthorListCard from '../components/authors/AuthorListCard.vue';

// Initialize the authors list composable
const { authors, loading, error, hasMore, loadMore, reset } = useAuthorsList();

/**
 * Handle scroll event to trigger infinite loading
 * Loads more when user scrolls near the bottom
 */
const handleScroll = (event: Event) => {
  const target = event.target as HTMLElement;
  const { scrollTop, scrollHeight, clientHeight } = target;

  // Trigger load when within 200px of bottom
  const scrolledToBottom = scrollHeight - scrollTop - clientHeight < 200;

  if (scrolledToBottom && !loading.value && hasMore.value) {
    loadMore();
  }
};

/**
 * Retry loading after an error
 */
const retry = () => {
  reset();
  loadMore();
};

// Load initial page on mount
onMounted(() => {
  loadMore();
});
</script>

<template>
  <div class="authors-homepage min-h-screen bg-gray-50">
    <!-- Page Header -->
    <div class="bg-white shadow-sm border-b border-gray-200 mb-6">
      <div class="max-w-7xl mx-auto px-4 py-6">
        <h1 class="text-3xl font-bold text-gray-900">Authors</h1>
        <p class="text-gray-600 mt-2">Browse your author collection</p>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4">
      <!-- Initial Loading State -->
      <div
        v-if="loading && authors.length === 0"
        class="flex flex-col items-center justify-center py-16"
      >
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p class="text-gray-600">Loading authors...</p>
      </div>

      <!-- Error State -->
      <div
        v-else-if="error && authors.length === 0"
        class="flex flex-col items-center justify-center py-16"
      >
        <div class="text-red-600 mb-4">
          <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-gray-900 mb-2">Failed to load authors</h2>
        <p class="text-gray-600 mb-4">{{ error.message }}</p>
        <button
          @click="retry"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="authors.length === 0 && !loading"
        class="flex flex-col items-center justify-center py-16"
      >
        <div class="text-gray-400 mb-4">
          <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-gray-900 mb-2">No authors found</h2>
        <p class="text-gray-600">Start by importing some authors to your collection.</p>
      </div>

      <!-- Authors List with Virtual Scrolling -->
      <div v-else class="authors-list-container">
        <DynamicScroller
          :items="authors"
          :min-item-size="200"
          class="scroller"
          key-field="id"
          @scroll="handleScroll"
        >
          <template #default="{ item, index, active }">
            <DynamicScrollerItem
              :item="item"
              :active="active"
              :size-dependencies="[item.name, item.bookCount]"
              :data-index="index"
              class="scroller-item"
            >
              <AuthorListCard :author="item" />
            </DynamicScrollerItem>
          </template>
        </DynamicScroller>

        <!-- Pagination Loading Indicator -->
        <div v-if="loading && authors.length > 0" class="flex items-center justify-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
          <p class="text-gray-600">Loading more authors...</p>
        </div>

        <!-- End of List Indicator -->
        <div
          v-if="!hasMore && authors.length > 0 && !loading"
          class="flex items-center justify-center py-8 text-gray-500"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span>You've reached the end of the list</span>
        </div>

        <!-- Pagination Error (if error occurs during pagination) -->
        <div v-if="error && authors.length > 0" class="flex flex-col items-center py-8">
          <p class="text-red-600 mb-3">Failed to load more authors: {{ error.message }}</p>
          <button
            @click="loadMore"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.authors-homepage {
  /* Full viewport height minus nav if any */
  min-height: 100vh;
}

.scroller {
  height: calc(100vh - 250px); /* Adjust based on header height */
}

.scroller-item {
  margin-bottom: 1rem;
}

/* Ensure smooth scrolling */
.scroller {
  scroll-behavior: smooth;
}
</style>
