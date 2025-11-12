<script setup lang="ts">
import OwnershipScanPanel from '../components/common/OwnershipScanPanel.vue';
</script>

<template>
  <div class="ownership-scan-page">
    <div class="ownership-scan-page__container">
      <!-- Header -->
      <header class="ownership-scan-page__header">
        <h1 class="ownership-scan-page__title">
          Ownership Scanner
        </h1>
        <p class="ownership-scan-page__subtitle">
          Scan your filesystem to automatically mark books as owned based on your local files
        </p>
      </header>

      <!-- Ownership Scanner -->
      <div class="ownership-scan-page__content">
        <OwnershipScanPanel />
      </div>

      <!-- Information Section -->
      <div class="ownership-scan-page__info">
        <h2 class="ownership-scan-page__info-title">
          How it works
        </h2>
        <div class="ownership-scan-page__info-content">
          <div class="ownership-scan-page__info-item">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="ownership-scan-page__info-icon"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <div>
              <h3 class="ownership-scan-page__info-item-title">
                Automatic Matching
              </h3>
              <p class="ownership-scan-page__info-item-text">
                The scanner extracts titles and ISBNs from filenames and metadata to match books in
                your library
              </p>
            </div>
          </div>

          <div class="ownership-scan-page__info-item">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="ownership-scan-page__info-icon"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h3 class="ownership-scan-page__info-item-title">
                Mark as Owned
              </h3>
              <p class="ownership-scan-page__info-item-text">
                Successfully matched books are automatically marked as owned with the source set to
                "filesystem"
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ownership-scan-page {
  min-height: 100vh;
  background-color: #f9fafb;
  padding: 2rem 1rem;
}

.ownership-scan-page__container {
  max-width: 56rem;
  margin: 0 auto;
}

.ownership-scan-page__header {
  text-align: center;
  margin-bottom: 3rem;
}

.ownership-scan-page__title {
  font-size: 2.25rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.5rem 0;
}

.ownership-scan-page__subtitle {
  font-size: 1.125rem;
  color: #6b7280;
  margin: 0;
  max-width: 42rem;
  margin-left: auto;
  margin-right: auto;
}

.ownership-scan-page__content {
  margin-bottom: 3rem;
}

.ownership-scan-page__info {
  background-color: white;
  border-radius: 0.75rem;
  padding: 2rem;
  box-shadow:
    0 1px 3px 0 rgba(0, 0, 0, 0.1),
    0 1px 2px -1px rgba(0, 0, 0, 0.1);
}

.ownership-scan-page__info-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 1.5rem 0;
}

.ownership-scan-page__info-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.ownership-scan-page__info-item {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.ownership-scan-page__info-icon {
  width: 2rem;
  height: 2rem;
  color: #3b82f6;
  flex-shrink: 0;
}

.ownership-scan-page__info-item-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 0.25rem 0;
}

.ownership-scan-page__info-item-text {
  font-size: 0.9375rem;
  color: #6b7280;
  margin: 0;
  line-height: 1.6;
}

@media (min-width: 768px) {
  .ownership-scan-page {
    padding: 3rem 1.5rem;
  }
}
</style>
