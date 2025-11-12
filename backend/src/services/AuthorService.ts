import type Database from 'better-sqlite3';
import { getDatabase } from '../db/connection.js';
import { AuthorModel } from '../models/Author.js';
import { BookModel } from '../models/Book.js';
import { BookAuthorModel } from '../models/BookAuthor.js';
import { hardcoverClient } from './HardcoverClient.js';
import { ownershipScanner } from './OwnershipScanner.js';
import { logger } from '../config/logger.js';
import { errors } from '../api/middleware/errorHandler.js';
import {
  GET_AUTHOR_WITH_BOOKS,
  // SEARCH_BOOKS_BY_AUTHOR_NAME, // Reserved for future use
} from '../../../shared/dist/queries/hardcover.js';
import type {
  GetAuthorResponse,
  HardcoverAuthorWithBooks,
  HardcoverBook,
} from '../../../shared/dist/queries/hardcover.js';
import type { AuthorWithBooks } from '../../../shared/dist/types/author.js';
import type { Book } from '../../../shared/dist/types/book.js';

export interface AuthorImportResult {
  author: AuthorWithBooks;
  booksImported: number;
  booksSkipped: number;
  skippedReasons: { [bookId: string]: string };
}

export class AuthorService {
  private db: Database.Database;
  private authorModel: AuthorModel;
  private bookModel: BookModel;
  private bookAuthorModel: BookAuthorModel;

  constructor(db?: Database.Database) {
    this.db = db || getDatabase();
    this.authorModel = new AuthorModel(this.db);
    this.bookModel = new BookModel(this.db);
    this.bookAuthorModel = new BookAuthorModel(this.db);
  }

  /**
   * Import author with all their books from Hardcover API
   * Performs bulk ownership scanning for all imported books
   */
  async importAuthor(externalId: string): Promise<AuthorImportResult> {
    logger.info('Starting author import', { externalId });

    // Check if author already exists
    const existingAuthor = this.authorModel.findByExternalId(externalId);
    if (existingAuthor) {
      logger.info('Author already imported, fetching books', {
        externalId,
        authorId: existingAuthor.id,
      });
      // Return existing author with books
      const authorWithBooks = this.getAuthorWithBooks(existingAuthor.id);
      return {
        author: authorWithBooks,
        booksImported: 0,
        booksSkipped: 0,
        skippedReasons: {},
      };
    }

    // Fetch author with books from Hardcover API
    let hardcoverAuthor: HardcoverAuthorWithBooks;
    let hardcoverBooks: HardcoverBook[] = [];

    try {
      // Get author info
      const response = await hardcoverClient.request<GetAuthorResponse>(GET_AUTHOR_WITH_BOOKS, {
        id: parseInt(externalId, 10),
      });
      hardcoverAuthor = response.authors_by_pk;

      if (!hardcoverAuthor) {
        throw errors.notFoundError('Author not found in Hardcover API', { externalId });
      }

      // Extract books from contributions
      if (hardcoverAuthor.contributions && hardcoverAuthor.contributions.length > 0) {
        hardcoverBooks = hardcoverAuthor.contributions
          .filter((contribution) => contribution.book)
          .map((contribution) => contribution.book!);
      }

      logger.info('Author fetched from Hardcover API', {
        externalId,
        name: hardcoverAuthor.name,
        bookCount: hardcoverBooks.length,
      });
    } catch (error) {
      logger.error('Failed to fetch author from Hardcover API', error, { externalId });
      throw error;
    }

    // Import author and books in transaction
    let importedBookCount = 0;
    let skippedBookCount = 0;
    const skippedReasons: { [bookId: string]: string } = {};

    const authorId = this.db.transaction(() => {
      // Create author
      const author = this.authorModel.create({
        externalId: String(hardcoverAuthor.id),
        name: hardcoverAuthor.name,
        bio: hardcoverAuthor.bio ?? null,
        photoUrl: hardcoverAuthor.image?.url ?? null,
      });

      logger.info('Author created', {
        authorId: author.id,
        externalId: author.externalId,
        name: author.name,
      });

      // Import each book
      for (const hardcoverBook of hardcoverBooks) {
        if (!hardcoverBook.title) {
          logger.error('Book without title', {
            title: hardcoverBook.id,
            authorName: hardcoverAuthor.name,
          });
          continue;
        }

        // FR-028: Check for duplicate by author name + book title
        const skipReason = this.checkIfBookShouldBeSkipped(
          hardcoverAuthor.name,
          hardcoverBook.title,
          String(hardcoverBook.id)
        );

        if (skipReason) {
          skippedBookCount++;
          skippedReasons[hardcoverBook.id] = skipReason;
          logger.debug('Skipping book during author import', {
            bookExternalId: hardcoverBook.id,
            title: hardcoverBook.title,
            authorName: hardcoverAuthor.name,
            reason: skipReason,
          });
          continue;
        }

        // Check ownership for this specific book
        const owned = ownershipScanner.isOwned(hardcoverAuthor.name, hardcoverBook.title);

        // Extract ISBN from editions
        const isbn = this.extractIsbn(hardcoverBook);

        // Create book
        const book = this.bookModel.create({
          externalId: String(hardcoverBook.id),
          title: hardcoverBook.title,
          isbn: isbn,
          description: hardcoverBook.description ?? null,
          publicationDate: this.transformReleaseYear(hardcoverBook.release_year),
          coverUrl: hardcoverBook.image?.url ?? null,
          owned: owned,
          ownedSource: owned ? 'filesystem' : 'none',
        });

        // Create book-author association
        this.bookAuthorModel.create({
          bookId: book.id,
          authorId: author.id,
          authorOrder: 0,
        });

        importedBookCount++;

        logger.debug('Book imported during author import', {
          bookId: book.id,
          externalId: book.externalId,
          title: book.title,
          owned: book.owned,
        });
      }

      logger.info('Author import completed', {
        authorId: author.id,
        authorName: author.name,
        totalBooks: hardcoverBooks.length,
        booksImported: importedBookCount,
        booksSkipped: skippedBookCount,
      });

      return author.id;
    })();

    // Fetch complete author with books for response
    const authorWithBooks = this.getAuthorWithBooks(authorId);

    return {
      author: authorWithBooks,
      booksImported: importedBookCount,
      booksSkipped: skippedBookCount,
      skippedReasons,
    };
  }

  /**
   * Get author by internal ID with all active books
   */
  getAuthorWithBooks(authorId: number): AuthorWithBooks {
    const author = this.authorModel.findById(authorId);
    if (!author) {
      throw errors.notFoundError('Author not found', { authorId });
    }

    // Get all book IDs for this author
    const bookIds = this.bookAuthorModel.findBookIdsByAuthorId(authorId);
    const books: Book[] = [];

    for (const bookId of bookIds) {
      const book = this.bookModel.findById(bookId);
      // Only include active books (not deleted)
      if (book && !book.deleted) {
        books.push(book);
      }
    }

    // Count books
    const activeBookCount = books.length;
    const totalBookCount = bookIds.length;

    return {
      ...author,
      books,
      activeBookCount,
      totalBookCount,
    };
  }

  /**
   * Get author by external ID with all active books
   * Throws error if author not found (for API endpoints)
   */
  getAuthorWithBooksByExternalId(externalId: string): AuthorWithBooks {
    const author = this.authorModel.findByExternalId(externalId);
    if (!author) {
      throw errors.notFoundError('Author not found', { externalId });
    }

    return this.getAuthorWithBooks(author.id);
  }

  /**
   * Get author by external ID with all active books
   * Returns null if author not found (for internal logic)
   */
  getAuthorByExternalId(externalId: string): AuthorWithBooks | null {
    const author = this.authorModel.findByExternalId(externalId);
    if (!author) {
      return null;
    }

    return this.getAuthorWithBooks(author.id);
  }

  /**
   * Update author information
   */
  updateAuthor(
    authorId: number,
    updates: {
      name?: string;
      bio?: string;
      photoUrl?: string;
    }
  ): AuthorWithBooks {
    logger.info('Updating author', { authorId, updates });

    const author = this.authorModel.findById(authorId);
    if (!author) {
      throw errors.notFoundError('Author not found', { authorId });
    }

    const updated = this.authorModel.update(authorId, updates);

    logger.info('Author updated', {
      authorId,
      name: updated.name,
    });

    return this.getAuthorWithBooks(authorId);
  }

  /**
   * Refresh author's books from Hardcover API
   * Imports new books, skips already imported and deleted books
   */
  async refreshAuthorBooks(authorId: number): Promise<AuthorImportResult> {
    logger.info('Refreshing author books from API', { authorId });

    const author = this.authorModel.findById(authorId);
    if (!author) {
      throw errors.notFoundError('Author not found', { authorId });
    }

    // Fetch latest books from Hardcover API
    let hardcoverBooks: HardcoverBook[] = [];

    try {
      // Verify author still exists in API
      const response = await hardcoverClient.request<GetAuthorResponse>(GET_AUTHOR_WITH_BOOKS, {
        id: parseInt(author.externalId, 10),
      });

      const hardcoverAuthor = response.authors_by_pk;

      if (!hardcoverAuthor) {
        throw errors.notFoundError('Author not found in Hardcover API', {
          externalId: author.externalId,
        });
      }

      // Extract books from contributions
      if (hardcoverAuthor.contributions && hardcoverAuthor.contributions.length > 0) {
        hardcoverBooks = hardcoverAuthor.contributions
          .filter((contribution) => contribution.book)
          .map((contribution) => contribution.book!);
      }

      logger.info('Latest books fetched from Hardcover API', {
        authorId,
        authorName: author.name,
        bookCount: hardcoverBooks.length,
      });
    } catch (error) {
      logger.error('Failed to fetch author books from Hardcover API', error, { authorId });
      throw error;
    }

    // Import new books in transaction
    let importedBookCount = 0;
    let skippedBookCount = 0;
    const skippedReasons: { [bookId: string]: string } = {};

    this.db.transaction(() => {
      for (const hardcoverBook of hardcoverBooks) {
        // FR-028: Check for duplicate by author name + book title
        const skipReason = this.checkIfBookShouldBeSkipped(
          author.name,
          hardcoverBook.title,
          String(hardcoverBook.id)
        );

        if (skipReason) {
          skippedBookCount++;
          skippedReasons[hardcoverBook.id] = skipReason;
          logger.debug('Skipping book during author refresh', {
            bookExternalId: hardcoverBook.id,
            title: hardcoverBook.title,
            authorName: author.name,
            reason: skipReason,
          });
          continue;
        }

        // Check ownership for this specific book
        const owned = ownershipScanner.isOwned(author.name, hardcoverBook.title);

        // Extract ISBN from editions
        const isbn = this.extractIsbn(hardcoverBook);

        // Create book
        const book = this.bookModel.create({
          externalId: String(hardcoverBook.id),
          title: hardcoverBook.title,
          isbn: isbn,
          description: hardcoverBook.description ?? null,
          publicationDate: this.transformReleaseYear(hardcoverBook.release_year),
          coverUrl: hardcoverBook.image?.url ?? null,
          owned: owned,
          ownedSource: owned ? 'filesystem' : 'none',
        });

        // Create book-author association
        this.bookAuthorModel.create({
          bookId: book.id,
          authorId,
          authorOrder: 0,
        });

        importedBookCount++;

        logger.debug('New book imported during author refresh', {
          bookId: book.id,
          externalId: book.externalId,
          title: book.title,
          owned: book.owned,
        });
      }

      logger.info('Author books refresh completed', {
        authorId,
        authorName: author.name,
        totalBooks: hardcoverBooks.length,
        booksImported: importedBookCount,
        booksSkipped: skippedBookCount,
      });
    })();

    // Fetch complete author with books for response
    const authorWithBooks = this.getAuthorWithBooks(authorId);

    return {
      author: authorWithBooks,
      booksImported: importedBookCount,
      booksSkipped: skippedBookCount,
      skippedReasons,
    };
  }

  /**
   * Check if a book should be skipped during import
   * Per FR-028: Checks by author name + book title (primary), then external_id (fallback)
   * Returns skip reason or null if book should be imported
   */
  private checkIfBookShouldBeSkipped(
    authorName: string,
    bookTitle: string,
    externalId: string
  ): string | null {
    // FR-028: Primary check by author name + book title (case-insensitive)
    const existingByAuthorTitle = this.bookModel.findByAuthorNameAndTitle(authorName, bookTitle);

    if (existingByAuthorTitle) {
      if (existingByAuthorTitle.deleted) {
        return 'previously deleted';
      }
      return 'already imported';
    }

    // Fallback: Also check by external_id for safety
    // (in case of data inconsistencies or API changes)
    const existingByExternalId = this.bookModel.findByExternalId(externalId);

    if (existingByExternalId) {
      if (existingByExternalId.deleted) {
        return 'previously deleted';
      }
      return 'already imported';
    }

    return null; // Book doesn't exist, should be imported
  }

  /**
   * Extract ISBN from Hardcover book response
   */
  private extractIsbn(hardcoverBook: HardcoverBook): string | null {
    // Try editions array first (preferred method)
    if (hardcoverBook.editions && hardcoverBook.editions.length > 0) {
      const edition = hardcoverBook.editions[0];
      // Prefer ISBN-13 over ISBN-10
      return edition.isbn_13 || edition.isbn_10 || null;
    }

    // Fall back to isbns array (legacy)
    if (hardcoverBook.isbns && hardcoverBook.isbns.length > 0) {
      return hardcoverBook.isbns[0];
    }

    // Fall back to isbn field (legacy)
    if (hardcoverBook.isbn) {
      if (Array.isArray(hardcoverBook.isbn)) {
        return hardcoverBook.isbn[0] || null;
      }
      return hardcoverBook.isbn;
    }

    return null;
  }

  /**
   * Transform Hardcover release_year to ISO 8601 date
   */
  private transformReleaseYear(releaseYear: number | null): string | null {
    if (!releaseYear) return null;
    return `${releaseYear}-01-01`;
  }
}
