import type { Book, BookWithAuthors } from './book.js';
import type { Author, AuthorWithBooks } from './author.js';

// Search API types
export interface SearchRequest {
  query: string;
  type: 'title' | 'author' | 'isbn';
  page?: number;
}

export interface BookSearchResult {
  type: 'book';
  externalId: string;
  title: string;
  isbn: string | null;
  description: string | null;
  publicationDate: string | null;
  coverUrl: string | null;
  authors: Array<{
    externalId: string;
    name: string;
  }>;
  status: 'not_imported' | 'imported' | 'deleted';
  owned: boolean;
}

export interface AuthorSearchResult {
  type: 'author';
  externalId: string;
  name: string;
  bio: string | null;
  photoUrl: string | null;
  bookCount: number;
  status: 'not_imported' | 'imported';
}

export interface Pagination {
  page: number;
  perPage: number;
  totalResults: number;
  totalPages: number;
  hasMore: boolean;
}

export interface SearchResponse {
  results: Array<BookSearchResult | AuthorSearchResult>;
  pagination: Pagination;
}

// Book API types
export interface ImportBookRequest {
  externalId: string;
}

export interface UpdateBookRequest {
  owned?: boolean;
  deleted?: boolean;
}

export interface BulkUpdateBooksRequest {
  bookIds: number[];
  owned?: boolean;
  deleted?: boolean;
}

// Author API types
export interface ImportAuthorRequest {
  externalId: string;
}

export interface UpdateAuthorRequest {
  name?: string;
  bio?: string | null;
  photoUrl?: string | null;
}

// API Response types
export type BookResponse = BookWithAuthors;
export type AuthorResponse = AuthorWithBooks;

// Error types
export interface ApiError {
  error: {
    message: string;
    code: string;
    details?: unknown;
  };
}
