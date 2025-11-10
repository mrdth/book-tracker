<script setup lang="ts">
import { ref } from 'vue';

interface Props {
  modelValue?: string;
  searchType?: 'title' | 'author' | 'isbn';
  placeholder?: string;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  searchType: 'author',
  placeholder: 'Search books...',
  disabled: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'update:searchType': [type: 'title' | 'author' | 'isbn'];
  search: [query: string, type: 'title' | 'author' | 'isbn'];
}>();

const localQuery = ref(props.modelValue);
const localType = ref(props.searchType);

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  localQuery.value = target.value;
  emit('update:modelValue', target.value);
};

const handleTypeChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  const newType = target.value as 'title' | 'author' | 'isbn';
  localType.value = newType;
  emit('update:searchType', newType);
};

const handleSubmit = (event: Event) => {
  event.preventDefault();
  if (localQuery.value.trim()) {
    emit('search', localQuery.value.trim(), localType.value);
  }
};

const getPlaceholder = () => {
  switch (localType.value) {
    case 'title':
      return 'Search by book title...';
    case 'author':
      return 'Search by author name...';
    case 'isbn':
      return 'Search by ISBN...';
    default:
      return props.placeholder;
  }
};
</script>

<template>
  <form @submit="handleSubmit" class="search-bar">
    <div class="search-bar__container">
      <select
        :value="localType"
        @change="handleTypeChange"
        :disabled="disabled"
        class="search-bar__type-select"
        aria-label="Search type"
      >
        <option value="author">Author</option>
        <option value="title">Title</option>
        <option value="isbn">ISBN</option>
      </select>

      <input
        type="text"
        :value="localQuery"
        @input="handleInput"
        :placeholder="getPlaceholder()"
        :disabled="disabled"
        class="search-bar__input"
        aria-label="Search query"
      />

      <button
        type="submit"
        :disabled="disabled || !localQuery.trim()"
        class="search-bar__button"
        aria-label="Search"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="search-bar__icon"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
        <span class="search-bar__button-text">Search</span>
      </button>
    </div>
  </form>
</template>

<style scoped>
.search-bar {
  width: 100%;
}

.search-bar__container {
  display: flex;
  gap: 0.5rem;
  width: 100%;
  max-width: 48rem;
  margin: 0 auto;
}

.search-bar__type-select {
  flex-shrink: 0;
  padding: 0.625rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  background-color: white;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}

.search-bar__type-select:hover:not(:disabled) {
  border-color: #9ca3af;
}

.search-bar__type-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-bar__type-select:disabled {
  background-color: #f3f4f6;
  color: #9ca3af;
  cursor: not-allowed;
}

.search-bar__input {
  flex: 1;
  padding: 0.625rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: #111827;
  transition: all 0.2s;
}

.search-bar__input::placeholder {
  color: #9ca3af;
}

.search-bar__input:hover:not(:disabled) {
  border-color: #9ca3af;
}

.search-bar__input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-bar__input:disabled {
  background-color: #f3f4f6;
  color: #9ca3af;
  cursor: not-allowed;
}

.search-bar__button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.5rem;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.search-bar__button:hover:not(:disabled) {
  background-color: #2563eb;
}

.search-bar__button:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}

.search-bar__button:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.search-bar__icon {
  width: 1.25rem;
  height: 1.25rem;
}

.search-bar__button-text {
  display: none;
}

@media (min-width: 640px) {
  .search-bar__button-text {
    display: inline;
  }
}
</style>
