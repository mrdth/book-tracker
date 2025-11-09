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
      image
      isbns
      contributions(where: {contributor_type: {_eq: "author"}}) {
        id
        contributor {
          id
          name
          bio
          image
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
      image
      authored_books: contributions(where: {contributor_type: {_eq: "author"}}) {
        book {
          id
          title
          description
          release_year
          image
          isbns
        }
      }
    }
  }
`;

export const REFRESH_AUTHOR_BOOKS = `
  query RefreshAuthorBooks($id: Int!) {
    users_by_pk(id: $id) {
      id
      authored_books: contributions(
        where: {contributor_type: {_eq: "author"}}
        order_by: {book: {release_year: desc}}
      ) {
        book {
          id
          title
          description
          release_year
          image
          isbns
        }
      }
    }
  }
`;

// Hardcover API response types (based on actual API schema)
export interface HardcoverBook {
  id: string;
  title: string;
  isbn?: string | string[] | null; // Can be string or array of strings (isbns field)
  description: string | null;
  release_year: number | null;
  image: string | null;
  authors?: HardcoverAuthor[];
  author_names?: string[]; // Alternative author field
  isbns?: string[]; // Array of ISBNs
  contributions?: HardcoverContribution[];
}

export interface HardcoverContribution {
  id: string;
  contributor_type?: string;
  contributor?: HardcoverAuthor;
  book?: HardcoverBook;
}

export interface HardcoverAuthor {
  id: string;
  name: string;
  bio?: string | null;
  image?: string | null;
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
