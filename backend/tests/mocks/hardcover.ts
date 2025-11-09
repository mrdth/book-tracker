import type {
  HardcoverBook,
  HardcoverAuthor,
  HardcoverAuthorWithBooks,
  SearchBooksResponse,
  SearchAuthorsResponse,
  GetBookResponse,
  GetAuthorResponse,
} from '@shared/queries/hardcover';

// Mock book data
export const mockBook: HardcoverBook = {
  id: '12345',
  title: 'The Great Gatsby',
  isbn: '9780743273565',
  description: 'The story of the mysteriously wealthy Jay Gatsby and his love for Daisy Buchanan.',
  release_year: 1925,
  image: 'https://example.com/covers/12345.jpg',
  authors: [
    {
      id: '67890',
      name: 'F. Scott Fitzgerald',
      bio: 'Francis Scott Key Fitzgerald was an American novelist.',
      image: 'https://example.com/authors/67890.jpg',
    },
  ],
};

export const mockAuthor: HardcoverAuthorWithBooks = {
  id: '67890',
  name: 'F. Scott Fitzgerald',
  bio: 'Francis Scott Key Fitzgerald was an American novelist.',
  image: 'https://example.com/authors/67890.jpg',
  books: [
    {
      id: '12345',
      title: 'The Great Gatsby',
      isbn: '9780743273565',
      description: 'The story of the mysteriously wealthy Jay Gatsby.',
      release_year: 1925,
      image: 'https://example.com/covers/12345.jpg',
      authors: [{ id: '67890', name: 'F. Scott Fitzgerald' }],
    },
    {
      id: '23456',
      title: 'Tender Is the Night',
      isbn: '9780684801544',
      description: 'A story of Americans living on the French Riviera.',
      release_year: 1934,
      image: 'https://example.com/covers/23456.jpg',
      authors: [{ id: '67890', name: 'F. Scott Fitzgerald' }],
    },
  ],
  books_aggregate: {
    aggregate: {
      count: 2,
    },
  },
};

// Mock API responses
export const mockSearchBooksResponse: SearchBooksResponse = {
  books: [mockBook],
};

export const mockSearchAuthorsResponse: SearchAuthorsResponse = {
  authors: [mockAuthor],
};

export const mockGetBookResponse: GetBookResponse = {
  book: mockBook,
};

export const mockGetAuthorResponse: GetAuthorResponse = {
  author: mockAuthor,
};
