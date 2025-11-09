import { http, HttpResponse } from 'msw';
import type { SearchResponse, BookResponse, AuthorResponse } from '@shared/types/api';

const API_BASE_URL = 'http://localhost:3000/api';

// Mock data
const mockBookResponse: BookResponse = {
  id: 1,
  externalId: '12345',
  title: 'The Great Gatsby',
  isbn: '9780743273565',
  description: 'The story of the mysteriously wealthy Jay Gatsby.',
  publicationDate: '1925-01-01',
  coverUrl: 'https://example.com/covers/12345.jpg',
  owned: false,
  ownedSource: 'none',
  deleted: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  authors: [
    {
      id: 1,
      externalId: '67890',
      name: 'F. Scott Fitzgerald',
      bio: 'Francis Scott Key Fitzgerald was an American novelist.',
      photoUrl: 'https://example.com/authors/67890.jpg',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
};

const mockSearchResponse: SearchResponse = {
  results: [
    {
      type: 'book',
      externalId: '12345',
      title: 'The Great Gatsby',
      isbn: '9780743273565',
      publicationDate: '1925-01-01',
      coverUrl: 'https://example.com/covers/12345.jpg',
      authors: [
        {
          externalId: '67890',
          name: 'F. Scott Fitzgerald',
        },
      ],
      status: 'not_imported',
    },
  ],
  pagination: {
    page: 1,
    perPage: 50,
    totalResults: 1,
    totalPages: 1,
  },
};

const mockAuthorResponse: AuthorResponse = {
  id: 1,
  externalId: '67890',
  name: 'F. Scott Fitzgerald',
  bio: 'Francis Scott Key Fitzgerald was an American novelist.',
  photoUrl: 'https://example.com/authors/67890.jpg',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  books: [mockBookResponse],
  activeBookCount: 1,
  totalBookCount: 1,
};

export const handlers = [
  // Search
  http.post(`${API_BASE_URL}/search`, () => {
    return HttpResponse.json(mockSearchResponse);
  }),

  // Books
  http.post(`${API_BASE_URL}/books`, () => {
    return HttpResponse.json(mockBookResponse, { status: 201 });
  }),

  http.get(`${API_BASE_URL}/books/:id`, () => {
    return HttpResponse.json(mockBookResponse);
  }),

  http.patch(`${API_BASE_URL}/books/:id`, () => {
    return HttpResponse.json(mockBookResponse);
  }),

  http.patch(`${API_BASE_URL}/books/bulk`, () => {
    return HttpResponse.json({ updated: 3 });
  }),

  // Authors
  http.post(`${API_BASE_URL}/authors`, () => {
    return HttpResponse.json(mockAuthorResponse, { status: 201 });
  }),

  http.get(`${API_BASE_URL}/authors/:id`, () => {
    return HttpResponse.json(mockAuthorResponse);
  }),

  http.patch(`${API_BASE_URL}/authors/:id`, () => {
    return HttpResponse.json(mockAuthorResponse);
  }),

  http.post(`${API_BASE_URL}/authors/:id/refresh`, () => {
    return HttpResponse.json({ imported: 2, skipped: 1 });
  }),

  // Ownership
  http.post(`${API_BASE_URL}/ownership/scan`, () => {
    return HttpResponse.json({ scanned: 150 });
  }),
];
