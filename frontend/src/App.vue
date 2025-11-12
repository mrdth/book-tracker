<script setup lang="ts">
import { RouterView, RouterLink, useRoute } from 'vue-router';

const route = useRoute();
</script>

<template>
  <div
    id="app"
    class="min-h-screen flex flex-col bg-gray-50"
  >
    <!-- Persistent Navigation Bar -->
    <nav
      class="bg-white shadow-md border-b border-gray-200 sticky top-0 z-50"
      role="navigation"
      aria-label="Main navigation"
    >
      <div class="max-w-7xl mx-auto px-4">
        <div class="flex h-16 items-center justify-between">
          <!-- Brand/Logo Area -->
          <div class="flex items-center">
            <h1 class="text-xl font-bold text-gray-900">
              Book Tracker
            </h1>
          </div>

          <!-- Navigation Links -->
          <div class="flex space-x-8">
            <RouterLink
              to="/"
              :class="[
                'px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2',
                route.path === '/'
                  ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600'
                  : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50',
              ]"
              :aria-current="route.path === '/' ? 'page' : undefined"
            >
              Authors
            </RouterLink>
            <RouterLink
              to="/search"
              :class="[
                'px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2',
                route.path === '/search'
                  ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600'
                  : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50',
              ]"
              :aria-current="route.path === '/search' ? 'page' : undefined"
            >
              Search
            </RouterLink>
            <RouterLink
              to="/scan"
              :class="[
                'px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2',
                route.path === '/scan'
                  ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600'
                  : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50',
              ]"
              :aria-current="route.path === '/scan' ? 'page' : undefined"
            >
              Scan
            </RouterLink>
          </div>
        </div>
      </div>
    </nav>

    <!-- Dynamic Content Area -->
    <main class="flex-1">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
/* Ensure navigation is always visible at the top */
nav {
  position: sticky;
  top: 0;
  backdrop-filter: blur(8px);
  background-color: rgba(255, 255, 255, 0.95);
}

/* Smooth focus transitions */
a {
  outline-offset: 2px;
}

/* Active link border animation */
a[aria-current='page'] {
  position: relative;
}

a[aria-current='page']::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background-color: currentColor;
}
</style>
