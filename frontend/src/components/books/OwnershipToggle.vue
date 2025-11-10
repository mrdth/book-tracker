<script setup lang="ts">
import { ref, computed } from 'vue';

interface Props {
  bookId: number;
  owned: boolean;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
});

const emit = defineEmits<{
  update: [bookId: number, owned: boolean];
}>();

const isUpdating = ref(false);

const handleToggle = async () => {
  if (props.disabled || isUpdating.value) return;

  isUpdating.value = true;
  try {
    emit('update', props.bookId, !props.owned);
  } finally {
    // Keep loading state until parent component updates
    setTimeout(() => {
      isUpdating.value = false;
    }, 500);
  }
};

const buttonText = computed(() => {
  if (isUpdating.value) {
    return props.owned ? 'Unmarking...' : 'Marking...';
  }
  return props.owned ? 'Mark as Not Owned' : 'Mark as Owned';
});

const buttonClass = computed(() => {
  return props.owned ? 'ownership-toggle--owned' : 'ownership-toggle--not-owned';
});

const iconPath = computed(() => {
  if (props.owned) {
    // Minus icon
    return 'M5 12h14';
  } else {
    // Plus icon
    return 'M12 4.5v15m7.5-7.5h-15';
  }
});
</script>

<template>
  <button
    @click="handleToggle"
    :disabled="disabled || isUpdating"
    :class="['ownership-toggle', buttonClass]"
    :aria-label="buttonText"
  >
    <svg
      v-if="!isUpdating"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke-width="2"
      stroke="currentColor"
      class="ownership-toggle__icon"
    >
      <path stroke-linecap="round" stroke-linejoin="round" :d="iconPath" />
    </svg>
    <svg
      v-else
      class="ownership-toggle__icon ownership-toggle__spinner"
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
    <span class="ownership-toggle__text">{{ buttonText }}</span>
  </button>
</template>

<style scoped>
.ownership-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  background-color: white;
}

.ownership-toggle--not-owned {
  border-color: #10b981;
  color: #10b981;
}

.ownership-toggle--not-owned:hover:not(:disabled) {
  background-color: #10b981;
  color: white;
}

.ownership-toggle--not-owned:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.3);
}

.ownership-toggle--owned {
  border-color: #6b7280;
  color: #6b7280;
}

.ownership-toggle--owned:hover:not(:disabled) {
  background-color: #6b7280;
  color: white;
}

.ownership-toggle--owned:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(107, 114, 128, 0.3);
}

.ownership-toggle:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ownership-toggle__icon {
  width: 1.125rem;
  height: 1.125rem;
  flex-shrink: 0;
}

.ownership-toggle__spinner {
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

.ownership-toggle__text {
  white-space: nowrap;
}

@media (max-width: 640px) {
  .ownership-toggle {
    width: 100%;
    justify-content: center;
  }
}
</style>
