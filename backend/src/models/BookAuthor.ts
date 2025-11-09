import type Database from 'better-sqlite3';
import { getDatabase } from '../db/connection.js';

export interface BookAuthor {
  bookId: number;
  authorId: number;
  authorOrder: number;
}

export interface CreateBookAuthorInput {
  bookId: number;
  authorId: number;
  authorOrder?: number;
}

export class BookAuthorModel {
  private db: Database.Database;

  constructor(db?: Database.Database) {
    this.db = db || getDatabase();
  }

  /**
   * Create a book-author association
   */
  create(input: CreateBookAuthorInput): BookAuthor {
    const stmt = this.db.prepare(`
      INSERT INTO book_authors (book_id, author_id, author_order)
      VALUES (?, ?, ?)
    `);

    stmt.run(input.bookId, input.authorId, input.authorOrder ?? 0);

    const association = this.findByBookAndAuthor(input.bookId, input.authorId);
    if (!association) {
      throw new Error('Failed to create book-author association');
    }

    return association;
  }

  /**
   * Find association by book ID and author ID
   */
  findByBookAndAuthor(bookId: number, authorId: number): BookAuthor | null {
    const stmt = this.db.prepare(`
      SELECT
        book_id as bookId,
        author_id as authorId,
        author_order as authorOrder
      FROM book_authors
      WHERE book_id = ? AND author_id = ?
    `);

    return (stmt.get(bookId, authorId) as BookAuthor | undefined) || null;
  }

  /**
   * Find all author IDs for a book
   */
  findAuthorIdsByBookId(bookId: number): number[] {
    const stmt = this.db.prepare(`
      SELECT author_id as authorId
      FROM book_authors
      WHERE book_id = ?
      ORDER BY author_order ASC
    `);

    const results = stmt.all(bookId) as { authorId: number }[];
    return results.map((r) => r.authorId);
  }

  /**
   * Find all book IDs for an author
   */
  findBookIdsByAuthorId(authorId: number): number[] {
    const stmt = this.db.prepare(`
      SELECT book_id as bookId
      FROM book_authors
      WHERE author_id = ?
      ORDER BY book_id DESC
    `);

    const results = stmt.all(authorId) as { bookId: number }[];
    return results.map((r) => r.bookId);
  }

  /**
   * Find all associations for a book (with order)
   */
  findByBookId(bookId: number): BookAuthor[] {
    const stmt = this.db.prepare(`
      SELECT
        book_id as bookId,
        author_id as authorId,
        author_order as authorOrder
      FROM book_authors
      WHERE book_id = ?
      ORDER BY author_order ASC
    `);

    return stmt.all(bookId) as BookAuthor[];
  }

  /**
   * Find all associations for an author
   */
  findByAuthorId(authorId: number): BookAuthor[] {
    const stmt = this.db.prepare(`
      SELECT
        book_id as bookId,
        author_id as authorId,
        author_order as authorOrder
      FROM book_authors
      WHERE author_id = ?
      ORDER BY book_id DESC
    `);

    return stmt.all(authorId) as BookAuthor[];
  }

  /**
   * Delete association
   */
  delete(bookId: number, authorId: number): void {
    const stmt = this.db.prepare(`
      DELETE FROM book_authors
      WHERE book_id = ? AND author_id = ?
    `);

    stmt.run(bookId, authorId);
  }

  /**
   * Delete all associations for a book
   */
  deleteByBookId(bookId: number): void {
    const stmt = this.db.prepare('DELETE FROM book_authors WHERE book_id = ?');
    stmt.run(bookId);
  }

  /**
   * Delete all associations for an author
   */
  deleteByAuthorId(authorId: number): void {
    const stmt = this.db.prepare('DELETE FROM book_authors WHERE author_id = ?');
    stmt.run(authorId);
  }

  /**
   * Check if association exists
   */
  exists(bookId: number, authorId: number): boolean {
    const stmt = this.db.prepare(`
      SELECT 1 FROM book_authors
      WHERE book_id = ? AND author_id = ?
    `);
    return stmt.get(bookId, authorId) !== undefined;
  }

  /**
   * Create multiple associations for a book with multiple authors
   */
  createMultiple(bookId: number, authorIds: number[]): BookAuthor[] {
    if (authorIds.length === 0) {
      return [];
    }

    const transaction = this.db.transaction(() => {
      const associations: BookAuthor[] = [];

      for (let i = 0; i < authorIds.length; i++) {
        const association = this.create({
          bookId,
          authorId: authorIds[i],
          authorOrder: i,
        });
        associations.push(association);
      }

      return associations;
    });

    return transaction();
  }

  /**
   * Update associations for a book (replaces existing)
   */
  updateForBook(bookId: number, authorIds: number[]): BookAuthor[] {
    const transaction = this.db.transaction(() => {
      // Delete existing associations
      this.deleteByBookId(bookId);

      // Create new associations
      return this.createMultiple(bookId, authorIds);
    });

    return transaction();
  }

  /**
   * Count books for an author
   */
  countBooksByAuthorId(authorId: number): number {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM book_authors
      WHERE author_id = ?
    `);
    const result = stmt.get(authorId) as { count: number };
    return result.count;
  }

  /**
   * Count active (non-deleted) books for an author
   */
  countActiveBooksByAuthorId(authorId: number): number {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM book_authors ba
      JOIN books b ON ba.book_id = b.id
      WHERE ba.author_id = ? AND b.deleted = 0
    `);
    const result = stmt.get(authorId) as { count: number };
    return result.count;
  }

  /**
   * Count authors for a book
   */
  countAuthorsByBookId(bookId: number): number {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM book_authors
      WHERE book_id = ?
    `);
    const result = stmt.get(bookId) as { count: number };
    return result.count;
  }
}
