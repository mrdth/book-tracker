<script setup lang="ts">
interface Props {
  status: 'not_imported' | 'imported' | 'deleted';
  size?: 'sm' | 'md' | 'lg';
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
});

const getStatusConfig = () => {
  switch (props.status) {
    case 'imported':
      return {
        label: 'Already Imported',
        colorClass: 'status-badge--success',
        icon: 'check',
      };
    case 'deleted':
      return {
        label: 'Deleted',
        colorClass: 'status-badge--error',
        icon: 'trash',
      };
    case 'not_imported':
    default:
      return {
        label: 'Not Imported',
        colorClass: 'status-badge--default',
        icon: 'info',
      };
  }
};

const config = getStatusConfig();
</script>

<template>
  <span
    :class="[
      'status-badge',
      config.colorClass,
      `status-badge--${size}`,
    ]"
    :aria-label="`Status: ${config.label}`"
  >
    <svg
      v-if="config.icon === 'check'"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      class="status-badge__icon"
    >
      <path
        fill-rule="evenodd"
        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
        clip-rule="evenodd"
      />
    </svg>

    <svg
      v-else-if="config.icon === 'trash'"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      class="status-badge__icon"
    >
      <path
        fill-rule="evenodd"
        d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
        clip-rule="evenodd"
      />
    </svg>

    <svg
      v-else
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      class="status-badge__icon"
    >
      <path
        fill-rule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
        clip-rule="evenodd"
      />
    </svg>

    <span class="status-badge__text">{{ config.label }}</span>
  </span>
</template>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-weight: 500;
  transition: all 0.2s;
}

.status-badge--sm {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
}

.status-badge--md {
  font-size: 0.875rem;
  padding: 0.25rem 0.75rem;
}

.status-badge--lg {
  font-size: 1rem;
  padding: 0.375rem 1rem;
}

.status-badge--default {
  background-color: #f3f4f6;
  color: #6b7280;
}

.status-badge--success {
  background-color: #d1fae5;
  color: #065f46;
}

.status-badge--error {
  background-color: #fee2e2;
  color: #991b1b;
}

.status-badge__icon {
  width: 1rem;
  height: 1rem;
}

.status-badge--sm .status-badge__icon {
  width: 0.875rem;
  height: 0.875rem;
}

.status-badge--lg .status-badge__icon {
  width: 1.25rem;
  height: 1.25rem;
}

.status-badge__text {
  line-height: 1;
}
</style>
