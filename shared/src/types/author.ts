import type { Book } from './book.js';

export interface Author {
  id: number;
  externalId: string;
  name: string;
  bio: string | null;
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthorWithBooks extends Author {
  books: Book[];
  activeBookCount: number;
  totalBookCount: number;
}

/**
 * Author list item for homepage pagination
 * Includes book count but not full book objects for performance
 */
export interface AuthorListItem {
  id: number;
  externalId: string;
  name: string;
  sortName: string | null;
  bio: string | null;
  photoUrl: string | null;
  bookCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Cursor for pagination
 */
export interface AuthorsCursor {
  name: string; // sort_name from last author
  id: number; // id from last author
}

/**
 * Request payload for POST /api/authors/list
 */
export interface AuthorsListRequest {
  cursor?: AuthorsCursor | null;
  letterFilter?: string | null;
  limit?: number;
}

/**
 * Response payload for POST /api/authors/list
 */
export interface AuthorsListResponse {
  authors: AuthorListItem[];
  hasMore: boolean;
}
