import type Database from 'better-sqlite3';
import { getDatabase } from '../db/connection.js';

export type OwnedSource = 'none' | 'filesystem' | 'manual';

export interface Book {
  id: number;
  externalId: string;
  title: string;
  isbn: string | null;
  description: string | null;
  publicationDate: string | null;
  coverUrl: string | null;
  owned: boolean;
  ownedSource: OwnedSource;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookInput {
  externalId: string;
  title: string;
  isbn?: string | null;
  description?: string | null;
  publicationDate?: string | null;
  coverUrl?: string | null;
  owned?: boolean;
  ownedSource?: OwnedSource;
}

export interface UpdateBookInput {
  title?: string;
  isbn?: string | null;
  description?: string | null;
  publicationDate?: string | null;
  coverUrl?: string | null;
  owned?: boolean;
  ownedSource?: OwnedSource;
  deleted?: boolean;
}

export class BookModel {
  private db: Database.Database;

  constructor(db?: Database.Database) {
    this.db = db || getDatabase();
  }

  /**
   * Create a new book
   */
  create(input: CreateBookInput): Book {
    const stmt = this.db.prepare(`
      INSERT INTO books (
        external_id, title, isbn, description, publication_date,
        cover_url, owned, owned_source
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      input.externalId,
      input.title,
      input.isbn ?? null,
      input.description ?? null,
      input.publicationDate ?? null,
      input.coverUrl ?? null,
      input.owned ? 1 : 0,
      input.ownedSource ?? 'none'
    );

    const book = this.findById(result.lastInsertRowid as number);
    if (!book) {
      throw new Error('Failed to create book');
    }

    return book;
  }

  /**
   * Find book by internal ID
   */
  findById(id: number): Book | null {
    const stmt = this.db.prepare(`
      SELECT
        id,
        external_id as externalId,
        title,
        isbn,
        description,
        publication_date as publicationDate,
        cover_url as coverUrl,
        CASE WHEN owned = 1 THEN 1 ELSE 0 END as owned,
        owned_source as ownedSource,
        CASE WHEN deleted = 1 THEN 1 ELSE 0 END as deleted,
        created_at as createdAt,
        updated_at as updatedAt
      FROM books
      WHERE id = ?
    `);

    const row = stmt.get(id) as any;
    if (!row) return null;

    return this.mapRowToBook(row);
  }

  /**
   * Find book by external ID (Hardcover API ID)
   */
  findByExternalId(externalId: string): Book | null {
    const stmt = this.db.prepare(`
      SELECT
        id,
        external_id as externalId,
        title,
        isbn,
        description,
        publication_date as publicationDate,
        cover_url as coverUrl,
        CASE WHEN owned = 1 THEN 1 ELSE 0 END as owned,
        owned_source as ownedSource,
        CASE WHEN deleted = 1 THEN 1 ELSE 0 END as deleted,
        created_at as createdAt,
        updated_at as updatedAt
      FROM books
      WHERE external_id = ?
    `);

    const row = stmt.get(externalId) as any;
    if (!row) return null;

    return this.mapRowToBook(row);
  }

  /**
   * Find book by ISBN
   */
  findByIsbn(isbn: string): Book | null {
    const stmt = this.db.prepare(`
      SELECT
        id,
        external_id as externalId,
        title,
        isbn,
        description,
        publication_date as publicationDate,
        cover_url as coverUrl,
        CASE WHEN owned = 1 THEN 1 ELSE 0 END as owned,
        owned_source as ownedSource,
        CASE WHEN deleted = 1 THEN 1 ELSE 0 END as deleted,
        created_at as createdAt,
        updated_at as updatedAt
      FROM books
      WHERE isbn = ?
    `);

    const row = stmt.get(isbn) as any;
    if (!row) return null;

    return this.mapRowToBook(row);
  }

  /**
   * Update book information
   */
  update(id: number, input: UpdateBookInput): Book {
    const updates: string[] = [];
    const values: any[] = [];

    if (input.title !== undefined) {
      updates.push('title = ?');
      values.push(input.title);
    }

    if (input.isbn !== undefined) {
      updates.push('isbn = ?');
      values.push(input.isbn);
    }

    if (input.description !== undefined) {
      updates.push('description = ?');
      values.push(input.description);
    }

    if (input.publicationDate !== undefined) {
      updates.push('publication_date = ?');
      values.push(input.publicationDate);
    }

    if (input.coverUrl !== undefined) {
      updates.push('cover_url = ?');
      values.push(input.coverUrl);
    }

    if (input.owned !== undefined) {
      updates.push('owned = ?');
      values.push(input.owned ? 1 : 0);
    }

    if (input.ownedSource !== undefined) {
      updates.push('owned_source = ?');
      values.push(input.ownedSource);
    }

    if (input.deleted !== undefined) {
      updates.push('deleted = ?');
      values.push(input.deleted ? 1 : 0);
    }

    if (updates.length === 0) {
      const book = this.findById(id);
      if (!book) {
        throw new Error(`Book with id ${id} not found`);
      }
      return book;
    }

    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE books
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);

    const book = this.findById(id);
    if (!book) {
      throw new Error(`Book with id ${id} not found after update`);
    }

    return book;
  }

  /**
   * Find all active (non-deleted) books
   */
  findAllActive(limit: number = 50, offset: number = 0): Book[] {
    const stmt = this.db.prepare(`
      SELECT
        id,
        external_id as externalId,
        title,
        isbn,
        description,
        publication_date as publicationDate,
        cover_url as coverUrl,
        CASE WHEN owned = 1 THEN 1 ELSE 0 END as owned,
        owned_source as ownedSource,
        CASE WHEN deleted = 1 THEN 1 ELSE 0 END as deleted,
        created_at as createdAt,
        updated_at as updatedAt
      FROM books
      WHERE deleted = 0
      ORDER BY title ASC
      LIMIT ? OFFSET ?
    `);

    return (stmt.all(limit, offset) as any[]).map((row) => this.mapRowToBook(row));
  }

  /**
   * Find books by author ID (active only)
   */
  findByAuthorId(authorId: number, includeDeleted: boolean = false): Book[] {
    const deletedCondition = includeDeleted ? '' : 'AND b.deleted = 0';

    const stmt = this.db.prepare(`
      SELECT
        b.id,
        b.external_id as externalId,
        b.title,
        b.isbn,
        b.description,
        b.publication_date as publicationDate,
        b.cover_url as coverUrl,
        CASE WHEN b.owned = 1 THEN 1 ELSE 0 END as owned,
        b.owned_source as ownedSource,
        CASE WHEN b.deleted = 1 THEN 1 ELSE 0 END as deleted,
        b.created_at as createdAt,
        b.updated_at as updatedAt
      FROM books b
      JOIN book_authors ba ON b.id = ba.book_id
      WHERE ba.author_id = ? ${deletedCondition}
      ORDER BY b.publication_date DESC, b.title ASC
    `);

    return (stmt.all(authorId) as any[]).map((row) => this.mapRowToBook(row));
  }

  /**
   * Mark book as deleted (soft delete)
   */
  markDeleted(id: number): Book {
    return this.update(id, { deleted: true });
  }

  /**
   * Delete book (hard delete - permanent removal from database)
   */
  delete(id: number): void {
    const stmt = this.db.prepare('DELETE FROM books WHERE id = ?');
    stmt.run(id);
  }

  /**
   * Delete multiple books in a single query (hard delete - permanent removal from database)
   * More efficient than calling delete() in a loop
   */
  deleteMany(ids: number[]): void {
    if (ids.length === 0) return;

    const placeholders = ids.map(() => '?').join(',');
    const stmt = this.db.prepare(`DELETE FROM books WHERE id IN (${placeholders})`);
    stmt.run(...ids);
  }

  /**
   * Mark book as owned (manual override)
   */
  markOwned(id: number, manual: boolean = true): Book {
    return this.update(id, {
      owned: true,
      ownedSource: manual ? 'manual' : 'filesystem',
    });
  }

  /**
   * Update ownership from filesystem scan
   * Only updates books with owned_source='filesystem' or 'none'
   */
  updateOwnershipFromScan(ownedExternalIds: string[]): number {
    const transaction = this.db.transaction(() => {
      // Reset filesystem-based ownership
      const resetStmt = this.db.prepare(`
        UPDATE books
        SET owned = 0, owned_source = 'none'
        WHERE owned_source = 'filesystem'
      `);
      resetStmt.run();

      if (ownedExternalIds.length === 0) {
        return 0;
      }

      // Set ownership for found books
      const placeholders = ownedExternalIds.map(() => '?').join(',');
      const updateStmt = this.db.prepare(`
        UPDATE books
        SET owned = 1, owned_source = 'filesystem'
        WHERE external_id IN (${placeholders})
        AND owned_source != 'manual'
      `);

      const result = updateStmt.run(...ownedExternalIds);
      return result.changes;
    });

    return transaction();
  }

  /**
   * Bulk update books
   */
  bulkUpdate(bookIds: number[], input: UpdateBookInput): number {
    if (bookIds.length === 0) {
      return 0;
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (input.owned !== undefined) {
      updates.push('owned = ?');
      values.push(input.owned ? 1 : 0);
    }

    if (input.ownedSource !== undefined) {
      updates.push('owned_source = ?');
      values.push(input.ownedSource);
    }

    if (input.deleted !== undefined) {
      updates.push('deleted = ?');
      values.push(input.deleted ? 1 : 0);
    }

    if (updates.length === 0) {
      return 0;
    }

    const placeholders = bookIds.map(() => '?').join(',');
    const stmt = this.db.prepare(`
      UPDATE books
      SET ${updates.join(', ')}
      WHERE id IN (${placeholders})
    `);

    const result = stmt.run(...values, ...bookIds);
    return result.changes;
  }

  /**
   * Count total books
   */
  count(includeDeleted: boolean = false): number {
    const deletedCondition = includeDeleted ? '' : 'WHERE deleted = 0';
    const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM books ${deletedCondition}`);
    const result = stmt.get() as { count: number };
    return result.count;
  }

  /**
   * Check if book exists by external ID
   */
  existsByExternalId(externalId: string): boolean {
    const stmt = this.db.prepare('SELECT 1 FROM books WHERE external_id = ?');
    return stmt.get(externalId) !== undefined;
  }

  /**
   * Check if book is deleted
   */
  isDeleted(externalId: string): boolean {
    const stmt = this.db.prepare('SELECT deleted FROM books WHERE external_id = ?');
    const result = stmt.get(externalId) as { deleted: number } | undefined;
    return result?.deleted === 1;
  }

  /**
   * Find book by author name and book title (case-insensitive)
   * Per FR-028: Book uniqueness is based on author name + book title combination
   */
  findByAuthorNameAndTitle(authorName: string, bookTitle: string): Book | null {
    const stmt = this.db.prepare(`
      SELECT
        b.id,
        b.external_id as externalId,
        b.title,
        b.isbn,
        b.description,
        b.publication_date as publicationDate,
        b.cover_url as coverUrl,
        CASE WHEN b.owned = 1 THEN 1 ELSE 0 END as owned,
        b.owned_source as ownedSource,
        CASE WHEN b.deleted = 1 THEN 1 ELSE 0 END as deleted,
        b.created_at as createdAt,
        b.updated_at as updatedAt
      FROM books b
      JOIN book_authors ba ON b.id = ba.book_id
      JOIN authors a ON ba.author_id = a.id
      WHERE LOWER(a.name) = LOWER(?) AND LOWER(b.title) = LOWER(?)
      LIMIT 1
    `);

    const row = stmt.get(authorName, bookTitle) as any;
    if (!row) return null;

    return this.mapRowToBook(row);
  }

  /**
   * Map database row to Book object
   */
  private mapRowToBook(row: any): Book {
    return {
      id: row.id,
      externalId: row.externalId,
      title: row.title,
      isbn: row.isbn,
      description: row.description,
      publicationDate: row.publicationDate,
      coverUrl: row.coverUrl,
      owned: Boolean(row.owned),
      ownedSource: row.ownedSource as OwnedSource,
      deleted: Boolean(row.deleted),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
