<script setup lang="ts">
// AuthorPage - placeholder for User Story 2 & 3
interface Props {
  id: string;
}

defineProps<Props>();
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-6">Author Details</h1>
    <p class="text-gray-600">Author page for ID: {{ id }} - to be implemented in User Stories 2 & 3</p>
  </div>
</template>
