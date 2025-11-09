// Hardcover GraphQL API query definitions
// Based on specs/001-book-tracker/contracts/hardcover.graphql.md

export const SEARCH_BOOKS_BY_TITLE = `
  query SearchBooksByTitle($title: String!, $limit: Int!, $offset: Int!) {
    books(
      where: { title: { _ilike: $title } }
      limit: $limit
      offset: $offset
    ) {
      id
      title
      isbn
      description
      release_year
      image
      authors {
        id
        name
        bio
        image
      }
    }
  }
`;

export const SEARCH_BOOKS_BY_ISBN = `
  query SearchBooksByISBN($isbn: String!) {
    books(where: { isbn: { _eq: $isbn } }) {
      id
      title
      isbn
      description
      release_year
      image
      authors {
        id
        name
        bio
        image
      }
    }
  }
`;

export const SEARCH_AUTHORS_BY_NAME = `
  query SearchAuthorsByName($name: String!, $limit: Int!, $offset: Int!) {
    authors(
      where: { name: { _ilike: $name } }
      limit: $limit
      offset: $offset
    ) {
      id
      name
      bio
      image
      books_aggregate {
        aggregate {
          count
        }
      }
    }
  }
`;

export const GET_AUTHOR_WITH_BOOKS = `
  query GetAuthorWithBooks($authorId: ID!) {
    author(id: $authorId) {
      id
      name
      bio
      image
      books {
        id
        title
        isbn
        description
        release_year
        image
        authors {
          id
          name
        }
      }
    }
  }
`;

export const GET_BOOK_BY_ID = `
  query GetBookById($bookId: ID!) {
    book(id: $bookId) {
      id
      title
      isbn
      description
      release_year
      image
      authors {
        id
        name
        bio
        image
      }
    }
  }
`;

export const REFRESH_AUTHOR_BOOKS = `
  query RefreshAuthorBooks($authorId: ID!) {
    author(id: $authorId) {
      id
      books(order_by: { release_year: desc }) {
        id
        title
        isbn
        description
        release_year
        image
        authors {
          id
          name
        }
      }
    }
  }
`;

// Hardcover API response types
export interface HardcoverBook {
  id: string;
  title: string;
  isbn: string | null;
  description: string | null;
  release_year: number | null;
  image: string | null;
  authors: HardcoverAuthor[];
}

export interface HardcoverAuthor {
  id: string;
  name: string;
  bio?: string | null;
  image?: string | null;
}

export interface HardcoverAuthorWithBooks extends HardcoverAuthor {
  books?: HardcoverBook[];
  books_aggregate?: {
    aggregate: {
      count: number;
    };
  };
}

export interface SearchBooksResponse {
  books: HardcoverBook[];
}

export interface SearchAuthorsResponse {
  authors: HardcoverAuthorWithBooks[];
}

export interface GetBookResponse {
  book: HardcoverBook;
}

export interface GetAuthorResponse {
  author: HardcoverAuthorWithBooks;
}
