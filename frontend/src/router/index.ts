import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'authors-home',
      component: () => import('../pages/AuthorsHomePage.vue'),
    },
    {
      path: '/search',
      name: 'search',
      component: () => import('../pages/SearchPage.vue'),
    },
    {
      path: '/scan',
      name: 'ownership-scan',
      component: () => import('../pages/OwnershipScanPage.vue'),
    },
    {
      path: '/authors/external/:externalId',
      name: 'author-by-external-id',
      component: () => import('../pages/AuthorPage.vue'),
      props: true,
    },
    {
      path: '/authors/:id',
      name: 'author',
      component: () => import('../pages/AuthorPage.vue'),
      props: true,
    },
  ],
});

export default router;
