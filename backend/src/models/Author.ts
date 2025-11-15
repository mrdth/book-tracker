import type Database from 'better-sqlite3';
import { getDatabase } from '../db/connection.js';
import { generateSortName } from '../utils/nameParser.js';

export interface Author {
  id: number;
  externalId: string;
  name: string;
  sortName: string | null;
  bio: string | null;
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAuthorInput {
  externalId: string;
  name: string;
  bio?: string | null;
  photoUrl?: string | null;
}

export interface UpdateAuthorInput {
  name?: string;
  bio?: string | null;
  photoUrl?: string | null;
}

export class AuthorModel {
  private db: Database.Database;

  constructor(db?: Database.Database) {
    this.db = db || getDatabase();
  }

  /**
   * Create a new author
   */
  create(input: CreateAuthorInput): Author {
    const sortName = generateSortName(input.name);

    const stmt = this.db.prepare(`
      INSERT INTO authors (external_id, name, sort_name, bio, photo_url)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      input.externalId,
      input.name,
      sortName,
      input.bio ?? null,
      input.photoUrl ?? null
    );

    const author = this.findById(result.lastInsertRowid as number);
    if (!author) {
      throw new Error('Failed to create author');
    }

    return author;
  }

  /**
   * Find author by internal ID
   */
  findById(id: number): Author | null {
    const stmt = this.db.prepare(`
      SELECT
        id,
        external_id as externalId,
        name,
        sort_name as sortName,
        bio,
        photo_url as photoUrl,
        created_at as createdAt,
        updated_at as updatedAt
      FROM authors
      WHERE id = ?
    `);

    return (stmt.get(id) as Author | undefined) || null;
  }

  /**
   * Find author by external ID (Hardcover API ID)
   */
  findByExternalId(externalId: string): Author | null {
    const stmt = this.db.prepare(`
      SELECT
        id,
        external_id as externalId,
        name,
        sort_name as sortName,
        bio,
        photo_url as photoUrl,
        created_at as createdAt,
        updated_at as updatedAt
      FROM authors
      WHERE external_id = ?
    `);

    return (stmt.get(externalId) as Author | undefined) || null;
  }

  /**
   * Find author by name (case-insensitive)
   */
  findByName(name: string): Author | null {
    const stmt = this.db.prepare(`
      SELECT
        id,
        external_id as externalId,
        name,
        sort_name as sortName,
        bio,
        photo_url as photoUrl,
        created_at as createdAt,
        updated_at as updatedAt
      FROM authors
      WHERE LOWER(name) = LOWER(?)
    `);

    return (stmt.get(name) as Author | undefined) || null;
  }

  /**
   * Update author information
   */
  update(id: number, input: UpdateAuthorInput): Author {
    const updates: string[] = [];
    const values: any[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      values.push(input.name);
      // Regenerate sort_name when name changes
      updates.push('sort_name = ?');
      values.push(generateSortName(input.name));
    }

    if (input.bio !== undefined) {
      updates.push('bio = ?');
      values.push(input.bio);
    }

    if (input.photoUrl !== undefined) {
      updates.push('photo_url = ?');
      values.push(input.photoUrl);
    }

    if (updates.length === 0) {
      const author = this.findById(id);
      if (!author) {
        throw new Error(`Author with id ${id} not found`);
      }
      return author;
    }

    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE authors
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);

    const author = this.findById(id);
    if (!author) {
      throw new Error(`Author with id ${id} not found after update`);
    }

    return author;
  }

  /**
   * Get all authors (paginated)
   */
  findAll(limit: number = 50, offset: number = 0): Author[] {
    const stmt = this.db.prepare(`
      SELECT
        id,
        external_id as externalId,
        name,
        sort_name as sortName,
        bio,
        photo_url as photoUrl,
        created_at as createdAt,
        updated_at as updatedAt
      FROM authors
      ORDER BY sort_name COLLATE NOCASE ASC
      LIMIT ? OFFSET ?
    `);

    return stmt.all(limit, offset) as Author[];
  }

  /**
   * Count total authors
   */
  count(): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM authors');
    const result = stmt.get() as { count: number };
    return result.count;
  }

  /**
   * Check if author exists by external ID
   */
  existsByExternalId(externalId: string): boolean {
    const stmt = this.db.prepare('SELECT 1 FROM authors WHERE external_id = ?');
    return stmt.get(externalId) !== undefined;
  }

  /**
   * Get information about books that will be affected by author deletion
   * Returns categorization of books by authorship (sole vs co-authored)
   */
  getBookDeletionInfo(authorId: number): {
    soleAuthoredBooks: number[];
    soleAuthoredCount: number;
    coAuthoredBooks: number[];
    coAuthoredCount: number;
  } {
    const stmt = this.db.prepare(`
      SELECT
        b.id,
        COUNT(ba.author_id) as authorCount
      FROM books b
      JOIN book_authors ba ON b.id = ba.book_id
      WHERE ba.author_id = ?
        AND b.deleted = 0
      GROUP BY b.id, ba.book_id
    `);

    const results = stmt.all(authorId) as { id: number; authorCount: number }[];

    const soleAuthoredBooks: number[] = [];
    const coAuthoredBooks: number[] = [];

    for (const result of results) {
      if (result.authorCount === 1) {
        soleAuthoredBooks.push(result.id);
      } else {
        coAuthoredBooks.push(result.id);
      }
    }

    return {
      soleAuthoredBooks,
      soleAuthoredCount: soleAuthoredBooks.length,
      coAuthoredBooks,
      coAuthoredCount: coAuthoredBooks.length,
    };
  }

  /**
   * Delete author (hard delete - permanent removal from database)
   */
  delete(id: number): void {
    const stmt = this.db.prepare('DELETE FROM authors WHERE id = ?');
    stmt.run(id);
  }

  /**
   * Find or create author by external ID
   * Returns existing author if found, creates new one if not
   */
  findOrCreate(input: CreateAuthorInput): Author {
    const existing = this.findByExternalId(input.externalId);
    if (existing) {
      return existing;
    }
    return this.create(input);
  }
}
