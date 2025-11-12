import type Database from 'better-sqlite3';
import { getDatabase } from '../db/connection.js';
import { BookModel } from '../models/Book.js';
import { AuthorModel } from '../models/Author.js';
import { hardcoverClient } from './HardcoverClient.js';
import { logger } from '../config/logger.js';
import { errors } from '../api/middleware/errorHandler.js';
import {
  SEARCH_BOOKS_BY_TITLE,
  SEARCH_BOOKS_BY_ISBN,
  SEARCH_AUTHORS_BY_NAME,
} from '../../../shared/dist/queries/hardcover.js';
import type {
  // SearchBooksResponse, // Type available but not currently used
  // SearchAuthorsResponse, // Type available but not currently used
  HardcoverBook,
  HardcoverAuthorWithBooks,
} from '../../../shared/dist/queries/hardcover.js';

export type SearchType = 'title' | 'author' | 'isbn';

export type BookStatus = 'not_imported' | 'imported' | 'deleted';
export type AuthorStatus = 'not_imported' | 'imported';

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
  status: BookStatus;
  owned: boolean;
}

export interface AuthorSearchResult {
  type: 'author';
  externalId: string;
  name: string;
  bio: string | null;
  photoUrl: string | null;
  bookCount: number;
  status: AuthorStatus;
}

export type SearchResult = BookSearchResult | AuthorSearchResult;

export interface SearchResponse {
  results: SearchResult[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    hasMore: boolean;
  };
}

export class SearchService {
  private db: Database.Database;
  private bookModel: BookModel;
  private authorModel: AuthorModel;
  private readonly perPage = 25; // Hardcover API max per page

  constructor(db?: Database.Database) {
    this.db = db || getDatabase();
    this.bookModel = new BookModel(this.db);
    this.authorModel = new AuthorModel(this.db);
  }

  /**
   * Unified search for books or authors
   */
  async search(query: string, type: SearchType, page: number = 1): Promise<SearchResponse> {
    if (!query || query.trim().length === 0) {
      throw errors.validationError('Search query cannot be empty');
    }

    if (page < 1) {
      throw errors.validationError('Page number must be greater than 0');
    }

    logger.info('Starting search', { query, type, page });

    switch (type) {
      case 'title':
        return await this.searchBooksByTitle(query, page);
      case 'isbn':
        return await this.searchBooksByISBN(query, page);
      case 'author':
        return await this.searchAuthorsByName(query, page);
      default:
        throw errors.validationError(`Invalid search type: ${type}`);
    }
  }

  /**
   * Search books by title from Hardcover API
   */
  private async searchBooksByTitle(title: string, page: number): Promise<SearchResponse> {
    logger.info('Searching books by title', { title, page });

    let hardcoverBooks: HardcoverBook[];
    try {
      const response = await hardcoverClient.request<{ search: { results: any } }>(
        SEARCH_BOOKS_BY_TITLE,
        {
          query: title,
          per_page: this.perPage,
          page,
        }
      );

      // Results is already an object (or might be a JSON string)
      logger.debug('Raw search response', {
        resultsType: typeof response.search.results,
        hasResults: !!response.search.results,
      });

      const resultsData =
        typeof response.search.results === 'string'
          ? JSON.parse(response.search.results)
          : response.search.results;

      // Hardcover uses Typesense - books are in hits[].document
      hardcoverBooks = (resultsData.hits || []).map((hit: any) => hit.document);

      logger.info('Books fetched from Hardcover API', {
        title,
        count: hardcoverBooks.length,
        found: resultsData.found || 0,
        firstBook: hardcoverBooks[0]?.title || 'none',
      });
    } catch (error) {
      logger.error('Failed to search books by title', error, { title });
      throw error;
    }

    // Merge with local database status
    const results: BookSearchResult[] = hardcoverBooks.map((book) =>
      this.mapBookToSearchResult(book)
    );

    logger.info('Book search completed', {
      title,
      page,
      resultsCount: results.length,
    });

    return {
      results,
      pagination: {
        page,
        perPage: this.perPage,
        total: results.length,
        hasMore: results.length === this.perPage,
      },
    };
  }

  /**
   * Search books by ISBN from Hardcover API
   */
  private async searchBooksByISBN(isbn: string, page: number): Promise<SearchResponse> {
    // Normalize ISBN (remove dashes, spaces)
    const normalizedISBN = isbn.replace(/[-\s]/g, '');

    logger.info('Searching books by ISBN', { isbn: normalizedISBN, page });

    let hardcoverBooks: HardcoverBook[];
    try {
      const response = await hardcoverClient.request<{ search: { results: any } }>(
        SEARCH_BOOKS_BY_ISBN,
        {
          query: normalizedISBN,
        }
      );

      // Results is already an object (or might be a JSON string)
      const resultsData =
        typeof response.search.results === 'string'
          ? JSON.parse(response.search.results)
          : response.search.results;

      // Hardcover uses Typesense - books are in hits[].document
      hardcoverBooks = (resultsData.hits || []).map((hit: any) => hit.document);

      logger.info('Books fetched from Hardcover API by ISBN', {
        isbn: normalizedISBN,
        count: hardcoverBooks.length,
      });
    } catch (error) {
      logger.error('Failed to search books by ISBN', error, { isbn: normalizedISBN });
      throw error;
    }

    // Merge with local database status
    const results: BookSearchResult[] = hardcoverBooks.map((book) =>
      this.mapBookToSearchResult(book)
    );

    logger.info('ISBN search completed', {
      isbn: normalizedISBN,
      page,
      resultsCount: results.length,
    });

    return {
      results,
      pagination: {
        page,
        perPage: this.perPage,
        total: results.length,
        hasMore: false, // ISBN search typically returns single result
      },
    };
  }

  /**
   * Search authors by name from Hardcover API
   */
  private async searchAuthorsByName(name: string, page: number): Promise<SearchResponse> {
    logger.info('Searching authors by name', { name, page });

    let hardcoverAuthors: HardcoverAuthorWithBooks[];
    try {
      const response = await hardcoverClient.request<{ search: { results: any } }>(
        SEARCH_AUTHORS_BY_NAME,
        {
          query: name,
          per_page: this.perPage,
          page,
        }
      );

      // Results is already an object (or might be a JSON string)
      const resultsData =
        typeof response.search.results === 'string'
          ? JSON.parse(response.search.results)
          : response.search.results;

      // Hardcover uses Typesense - authors are in hits[].document
      hardcoverAuthors = (resultsData.hits || []).map((hit: any) => hit.document);

      logger.info('Authors fetched from Hardcover API', {
        name,
        count: hardcoverAuthors.length,
      });
    } catch (error) {
      logger.error('Failed to search authors by name', error, { name });
      throw error;
    }

    // Merge with local database status
    const results: AuthorSearchResult[] = hardcoverAuthors.map((author) =>
      this.mapAuthorToSearchResult(author)
    );

    logger.info('Author search completed', {
      name,
      page,
      resultsCount: results.length,
    });

    return {
      results,
      pagination: {
        page,
        perPage: this.perPage,
        total: results.length,
        hasMore: results.length === this.perPage,
      },
    };
  }

  /**
   * Map Hardcover book to search result with local database status
   */
  private mapBookToSearchResult(hardcoverBook: any): BookSearchResult {
    const localBook = this.bookModel.findByExternalId(String(hardcoverBook.id));

    let status: BookStatus = 'not_imported';
    if (localBook) {
      status = localBook.deleted ? 'deleted' : 'imported';
    }

    // Extract first ISBN from isbns array
    const isbn =
      Array.isArray(hardcoverBook.isbns) && hardcoverBook.isbns.length > 0
        ? hardcoverBook.isbns[0]
        : null;

    // Extract image URL from image object
    const coverUrl = hardcoverBook.image?.url || null;

    // Extract authors from contributions or author_names
    const authors = [];
    if (hardcoverBook.contributions && Array.isArray(hardcoverBook.contributions)) {
      for (const contribution of hardcoverBook.contributions) {
        if (contribution.author) {
          authors.push({
            externalId: String(contribution.author.id),
            name: contribution.author.name,
          });
        }
      }
    }

    // Fallback to author_names if no contributions
    if (authors.length === 0 && hardcoverBook.author_names) {
      hardcoverBook.author_names.forEach((name: string, index: number) => {
        authors.push({
          externalId: `${hardcoverBook.id}-author-${index}`,
          name,
        });
      });
    }

    return {
      type: 'book',
      externalId: String(hardcoverBook.id),
      title: hardcoverBook.title,
      isbn,
      description: hardcoverBook.description ?? null,
      publicationDate: this.transformReleaseYear(hardcoverBook.release_year),
      coverUrl,
      authors,
      status,
      owned: localBook?.owned ?? false,
    };
  }

  /**
   * Map Hardcover author to search result with local database status
   */
  private mapAuthorToSearchResult(hardcoverAuthor: any): AuthorSearchResult {
    const localAuthor = this.authorModel.findByExternalId(String(hardcoverAuthor.id));

    const status: AuthorStatus = localAuthor ? 'imported' : 'not_imported';

    // Count books from various possible fields
    let bookCount = 0;
    if (hardcoverAuthor.books_count !== undefined) {
      bookCount = hardcoverAuthor.books_count;
    } else if (hardcoverAuthor.books_aggregate?.aggregate?.count) {
      bookCount = hardcoverAuthor.books_aggregate.aggregate.count;
    } else if (hardcoverAuthor.books && Array.isArray(hardcoverAuthor.books)) {
      bookCount = hardcoverAuthor.books.length;
    }

    // Extract image URL from image object
    const photoUrl = hardcoverAuthor.image?.url || null;

    return {
      type: 'author',
      externalId: String(hardcoverAuthor.id),
      name: hardcoverAuthor.name,
      bio: hardcoverAuthor.bio ?? null,
      photoUrl,
      bookCount,
      status,
    };
  }

  /**
   * Transform Hardcover release_year to ISO 8601 date
   */
  private transformReleaseYear(releaseYear: number | null): string | null {
    if (!releaseYear) return null;
    return `${releaseYear}-01-01`;
  }
}
