import type Database from 'better-sqlite3';
import { getDatabase } from '../db/connection.js';

export interface Author {
  id: number;
  externalId: string;
  name: string;
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
    const stmt = this.db.prepare(`
      INSERT INTO authors (external_id, name, bio, photo_url)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(
      input.externalId,
      input.name,
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
        bio,
        photo_url as photoUrl,
        created_at as createdAt,
        updated_at as updatedAt
      FROM authors
      WHERE id = ?
    `);

    return stmt.get(id) as Author | undefined || null;
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
        bio,
        photo_url as photoUrl,
        created_at as createdAt,
        updated_at as updatedAt
      FROM authors
      WHERE external_id = ?
    `);

    return stmt.get(externalId) as Author | undefined || null;
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
        bio,
        photo_url as photoUrl,
        created_at as createdAt,
        updated_at as updatedAt
      FROM authors
      WHERE LOWER(name) = LOWER(?)
    `);

    return stmt.get(name) as Author | undefined || null;
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
        bio,
        photo_url as photoUrl,
        created_at as createdAt,
        updated_at as updatedAt
      FROM authors
      ORDER BY name ASC
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
   * Delete author (Note: In practice, authors are never deleted per business rules)
   * This method is included for completeness but should not be used in application logic
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
