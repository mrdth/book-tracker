import type { Author } from './author.js';

export interface Book {
  id: number;
  externalId: string;
  title: string;
  isbn: string | null;
  description: string | null;
  publicationDate: string | null;
  coverUrl: string | null;
  owned: boolean;
  ownedSource: 'none' | 'filesystem' | 'manual';
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BookWithAuthors extends Book {
  authors: Author[];
}
