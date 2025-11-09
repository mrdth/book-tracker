// Hardcover GraphQL API query definitions
// Based on https://docs.hardcover.app/api/

export const SEARCH_BOOKS_BY_TITLE = `
  query SearchBooksByTitle($query: String!, $per_page: Int!, $page: Int!) {
    search(
      query: $query
      query_type: "Book"
      per_page: $per_page
      page: $page
    ) {
      results
    }
  }
`;

export const SEARCH_BOOKS_BY_ISBN = `
  query SearchBooksByISBN($query: String!) {
    search(
      query: $query
      query_type: "Book"
      per_page: 10
      page: 1
    ) {
      results
    }
  }
`;

export const SEARCH_AUTHORS_BY_NAME = `
  query SearchAuthorsByName($query: String!, $per_page: Int!, $page: Int!) {
    search(
      query: $query
      query_type: "Author"
      per_page: $per_page
      page: $page
    ) {
      results
    }
  }
`;

export const GET_BOOK_BY_ID = `
  query GetBookById($id: Int!) {
    books_by_pk(id: $id) {
      id
      title
      description
      release_year
      image {
        url
      }
      editions {
        isbn_10
        isbn_13
      }
      contributions {
        author {
          id
          name
          bio
          image {
            url
          }
        }
      }
    }
  }
`;

export const GET_AUTHOR_WITH_BOOKS = `
  query GetAuthorWithBooks($id: Int!) {
    users_by_pk(id: $id) {
      id
      name
      bio
      image {
        url
      }
      authored_books: contributions {
        book {
          id
          title
          description
          release_year
          image {
            url
          }
          editions {
            isbn_10
            isbn_13
          }
        }
      }
    }
  }
`;

export const REFRESH_AUTHOR_BOOKS = `
  query RefreshAuthorBooks($id: Int!) {
    users_by_pk(id: $id) {
      id
      authored_books: contributions(order_by: {book: {release_year: desc}}) {
        book {
          id
          title
          description
          release_year
          image {
            url
          }
          editions {
            isbn_10
            isbn_13
          }
        }
      }
    }
  }
`;

// Hardcover API response types (based on actual API schema)
export interface HardcoverImage {
  url: string;
}

export interface HardcoverEdition {
  isbn_10?: string | null;
  isbn_13?: string | null;
}

export interface HardcoverBook {
  id: string;
  title: string;
  isbn?: string | string[] | null; // Legacy field, may still be used in search results
  description: string | null;
  release_year: number | null;
  image: HardcoverImage | null;
  authors?: HardcoverAuthor[];
  author_names?: string[]; // Alternative author field
  isbns?: string[]; // Legacy field, may still be used in search results
  editions?: HardcoverEdition[]; // Preferred way to get ISBNs
  contributions?: HardcoverContribution[];
}

export interface HardcoverContribution {
  id?: string;
  contributor_type?: string; // Legacy field, may not be present
  contributor?: HardcoverAuthor; // Legacy field
  author?: HardcoverAuthor; // Current API format
  book?: HardcoverBook;
}

export interface HardcoverAuthor {
  id: string;
  name: string;
  bio?: string | null;
  image?: HardcoverImage | null;
  username?: string;
}

export interface HardcoverAuthorWithBooks extends HardcoverAuthor {
  books?: HardcoverBook[];
  authored_books?: HardcoverContribution[];
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
  users?: HardcoverAuthorWithBooks[];
}

export interface GetBookResponse {
  books_by_pk: HardcoverBook;
}

export interface GetAuthorResponse {
  users_by_pk: HardcoverAuthorWithBooks;
}
