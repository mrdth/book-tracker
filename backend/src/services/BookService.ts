import type Database from 'better-sqlite3';
import { getDatabase } from '../db/connection.js';
import { BookModel } from '../models/Book.js';
import { AuthorModel } from '../models/Author.js';
import { BookAuthorModel } from '../models/BookAuthor.js';
import { hardcoverClient } from './HardcoverClient.js';
import { ownershipScanner } from './OwnershipScanner.js';
import { logger } from '../config/logger.js';
import { errors } from '../api/middleware/errorHandler.js';
import { GET_BOOK_BY_ID } from '../../../shared/dist/queries/hardcover.js';
import type {
  GetBookResponse,
  HardcoverBook,
  HardcoverAuthor,
} from '../../../shared/dist/queries/hardcover.js';
import type { BookWithAuthors } from '../../../shared/dist/types/book.js';
import type { Author } from '../../../shared/dist/types/author.js';

export class BookService {
  private db: Database.Database;
  private bookModel: BookModel;
  private authorModel: AuthorModel;
  private bookAuthorModel: BookAuthorModel;

  constructor(db?: Database.Database) {
    this.db = db || getDatabase();
    this.bookModel = new BookModel(this.db);
    this.authorModel = new AuthorModel(this.db);
    this.bookAuthorModel = new BookAuthorModel(this.db);
  }

  /**
   * Import a book from Hardcover API by external ID
   * Includes ownership detection from filesystem
   */
  async importBook(externalId: string): Promise<BookWithAuthors> {
    logger.info('Starting book import', { externalId });

    // Check if book already exists
    const existing = this.bookModel.findByExternalId(externalId);
    if (existing) {
      if (existing.deleted) {
        logger.warn('Attempted to import deleted book', { externalId, bookId: existing.id });
        throw errors.validationError('This book was previously deleted and cannot be re-imported', {
          externalId,
          bookId: existing.id,
        });
      }

      logger.info('Book already imported', { externalId, bookId: existing.id });
      throw errors.validationError('Book already imported', {
        externalId,
        bookId: existing.id,
      });
    }

    // Fetch book from Hardcover API
    let hardcoverBook: HardcoverBook;
    try {
      const response = await hardcoverClient.request<GetBookResponse>(GET_BOOK_BY_ID, {
        id: parseInt(externalId, 10),
      });
      hardcoverBook = response.books_by_pk;

      if (!hardcoverBook) {
        throw errors.notFoundError('Book not found in Hardcover API', { externalId });
      }

      logger.info('Book fetched from Hardcover API', {
        externalId,
        title: hardcoverBook.title,
      });
    } catch (error) {
      logger.error('Failed to fetch book from Hardcover API', error, { externalId });
      throw error;
    }

    // Import book with authors in transaction
    const bookWithAuthors = this.db.transaction(() => {
      // Extract authors from contributions or authors field
      const authorIds: number[] = [];
      const hardcoverAuthors = this.extractAuthors(hardcoverBook);

      for (const hardcoverAuthor of hardcoverAuthors) {
        const author = this.authorModel.findOrCreate({
          externalId: hardcoverAuthor.id,
          name: hardcoverAuthor.name,
          bio: hardcoverAuthor.bio ?? null,
          photoUrl: hardcoverAuthor.image?.url ?? null,
        });
        authorIds.push(author.id);
        logger.debug('Author processed for book import', {
          authorId: author.id,
          authorName: author.name,
          externalId: hardcoverAuthor.id,
        });
      }

      // Check ownership from filesystem
      const owned = this.checkOwnership(hardcoverBook, hardcoverAuthors);

      // Extract ISBN from isbns array or isbn field
      const isbn = this.extractIsbn(hardcoverBook);

      // Create book
      const book = this.bookModel.create({
        externalId: hardcoverBook.id,
        title: hardcoverBook.title,
        isbn: isbn,
        description: hardcoverBook.description ?? null,
        publicationDate: this.transformReleaseYear(hardcoverBook.release_year),
        coverUrl: hardcoverBook.image?.url ?? null,
        owned: owned,
        ownedSource: owned ? 'filesystem' : 'none',
      });

      // Create book-author associations
      this.bookAuthorModel.createMultiple(book.id, authorIds);

      logger.info('Book imported successfully', {
        bookId: book.id,
        externalId: book.externalId,
        title: book.title,
        owned: book.owned,
        ownedSource: book.ownedSource,
        authorCount: authorIds.length,
      });

      return book;
    })();

    // Fetch complete book with authors for response
    return this.getBookWithAuthors(bookWithAuthors.id);
  }

  /**
   * Get book by internal ID with authors
   */
  getBookWithAuthors(bookId: number): BookWithAuthors {
    const book = this.bookModel.findById(bookId);
    if (!book) {
      throw errors.notFoundError('Book not found', { bookId });
    }

    const authorIds = this.bookAuthorModel.findAuthorIdsByBookId(bookId);
    const authors: Author[] = [];

    for (const authorId of authorIds) {
      const author = this.authorModel.findById(authorId);
      if (author) {
        authors.push(author);
      }
    }

    return {
      ...book,
      authors,
    };
  }

  /**
   * Update book ownership status
   */
  updateOwnership(bookId: number, owned: boolean, manual: boolean = false): BookWithAuthors {
    logger.info('Updating book ownership', { bookId, owned, manual });

    const book = this.bookModel.findById(bookId);
    if (!book) {
      throw errors.notFoundError('Book not found', { bookId });
    }

    const updated = this.bookModel.update(bookId, {
      owned,
      ownedSource: manual ? 'manual' : owned ? 'filesystem' : 'none',
    });

    logger.info('Book ownership updated', {
      bookId,
      owned: updated.owned,
      ownedSource: updated.ownedSource,
    });

    return this.getBookWithAuthors(bookId);
  }

  /**
   * Mark book as deleted (soft delete)
   */
  deleteBook(bookId: number): BookWithAuthors {
    logger.info('Marking book as deleted', { bookId });

    const book = this.bookModel.findById(bookId);
    if (!book) {
      throw errors.notFoundError('Book not found', { bookId });
    }

    if (book.deleted) {
      logger.warn('Book already deleted', { bookId });
    }

    const updated = this.bookModel.markDeleted(bookId);

    logger.info('Book marked as deleted', { bookId, title: updated.title });

    return this.getBookWithAuthors(bookId);
  }

  /**
   * Bulk update books (ownership or deletion)
   */
  bulkUpdate(
    bookIds: number[],
    updates: { owned?: boolean; deleted?: boolean }
  ): BookWithAuthors[] {
    logger.info('Starting bulk book update', { bookIds, updates });

    if (bookIds.length === 0) {
      return [];
    }

    // Validate all books exist
    for (const bookId of bookIds) {
      const book = this.bookModel.findById(bookId);
      if (!book) {
        throw errors.notFoundError('Book not found', { bookId });
      }
    }

    // Perform bulk update in transaction
    this.db.transaction(() => {
      const updateData: { owned?: boolean; ownedSource?: 'manual' | 'none'; deleted?: boolean } =
        {};

      if (updates.owned !== undefined) {
        updateData.owned = updates.owned;
        // If setting owned=true via bulk action, it's a manual override
        updateData.ownedSource = updates.owned ? 'manual' : 'none';
      }

      if (updates.deleted !== undefined) {
        updateData.deleted = updates.deleted;
      }

      this.bookModel.bulkUpdate(bookIds, updateData);
    })();

    logger.info('Bulk book update completed', {
      bookIds,
      count: bookIds.length,
      updates,
    });

    // Return updated books with authors
    return bookIds.map((id) => this.getBookWithAuthors(id));
  }

  /**
   * Extract authors from Hardcover book response
   * Handles both contributions and direct authors fields
   */
  private extractAuthors(hardcoverBook: HardcoverBook): HardcoverAuthor[] {
    // Try contributions field first (newer API format)
    if (hardcoverBook.contributions && hardcoverBook.contributions.length > 0) {
      return hardcoverBook.contributions
        .filter((c) => c.author) // Filter out contributions without author data
        .map((c) => c.author!);
    }

    // Fall back to authors field
    if (hardcoverBook.authors && hardcoverBook.authors.length > 0) {
      return hardcoverBook.authors;
    }

    // Fall back to author_names field (create minimal author objects)
    if (hardcoverBook.author_names && hardcoverBook.author_names.length > 0) {
      return hardcoverBook.author_names.map((name, index) => ({
        id: `${hardcoverBook.id}-author-${index}`,
        name,
        bio: null,
        image: null,
      }));
    }

    return [];
  }

  /**
   * Extract ISBN from Hardcover book response
   * Handles both isbns array and isbn field
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
   * Check if a book is owned based on filesystem scan
   * Matches by author name and book title (case-insensitive)
   */
  private checkOwnership(hardcoverBook: HardcoverBook, authors: HardcoverAuthor[]): boolean {
    if (authors.length === 0) {
      return false;
    }

    // Check ownership for the first author
    // (Books are organized under primary author in filesystem)
    const primaryAuthor = authors[0];
    const isOwned = ownershipScanner.isOwned(primaryAuthor.name, hardcoverBook.title);

    logger.debug('Ownership check completed', {
      bookTitle: hardcoverBook.title,
      authorName: primaryAuthor.name,
      owned: isOwned,
    });

    return isOwned;
  }

  /**
   * Transform Hardcover release_year to ISO 8601 date
   */
  private transformReleaseYear(releaseYear: number | null): string | null {
    if (!releaseYear) return null;
    return `${releaseYear}-01-01`; // Default to January 1st
  }

  /**
   * Check if book exists and get its status
   */
  checkBookStatus(externalId: string): {
    exists: boolean;
    deleted: boolean;
    bookId: number | null;
  } {
    const book = this.bookModel.findByExternalId(externalId);

    if (!book) {
      return { exists: false, deleted: false, bookId: null };
    }

    return {
      exists: true,
      deleted: book.deleted,
      bookId: book.id,
    };
  }

  /**
   * Scan filesystem and update ownership for all books
   * Only updates books with owned_source='filesystem' or 'none'
   */
  async scanAndUpdateOwnership(forceRefresh = false): Promise<{
    scannedBooks: number;
    ownedBooks: number;
    updatedCount: number;
  }> {
    logger.info('Starting filesystem ownership scan', { forceRefresh });

    // Perform filesystem scan
    const ownedBooks = await ownershipScanner.scan(undefined, forceRefresh);

    logger.info('Filesystem scan completed', { ownedBooksFound: ownedBooks.length });

    // Build map of owned books by external ID
    const ownedExternalIds: string[] = [];

    for (const ownedBook of ownedBooks) {
      // Find books in database matching author name and title
      const authors = this.db
        .prepare(
          `
        SELECT id FROM authors
        WHERE LOWER(name) = LOWER(?)
      `
        )
        .all(ownedBook.authorName) as { id: number }[];

      for (const author of authors) {
        const books = this.db
          .prepare(
            `
          SELECT b.external_id as externalId
          FROM books b
          JOIN book_authors ba ON b.id = ba.book_id
          WHERE ba.author_id = ? AND LOWER(b.title) = LOWER(?)
        `
          )
          .all(author.id, ownedBook.bookTitle) as { externalId: string }[];

        for (const book of books) {
          if (!ownedExternalIds.includes(book.externalId)) {
            ownedExternalIds.push(book.externalId);
          }
        }
      }
    }

    // Update ownership in database
    const updatedCount = this.bookModel.updateOwnershipFromScan(ownedExternalIds);

    logger.info('Ownership scan and update completed', {
      scannedDirectories: ownedBooks.length,
      matchedBooks: ownedExternalIds.length,
      updatedRecords: updatedCount,
    });

    return {
      scannedBooks: ownedBooks.length,
      ownedBooks: ownedExternalIds.length,
      updatedCount,
    };
  }
}
