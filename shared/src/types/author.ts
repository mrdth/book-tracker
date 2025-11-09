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
