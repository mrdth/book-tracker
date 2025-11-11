import { Router, type Request, type Response, type NextFunction } from 'express';
import { AuthorService } from '../../services/AuthorService.js';
import { logger } from '../../config/logger.js';
import { errors } from '../middleware/errorHandler.js';
import { getDatabase } from '../../db/connection.js';

const router = Router();
const authorService = new AuthorService();

/**
 * POST /api/authors/list
 * Get paginated authors list with cursor-based pagination
 *
 * Request body:
 * {
 *   "cursor": { "name": "Christie, Agatha", "id": 123 } | null,
 *   "letterFilter": "M" | null,
 *   "limit": 50
 * }
 *
 * Response:
 * {
 *   "authors": [
 *     {
 *       "id": 1,
 *       "externalId": "12345",
 *       "name": "Agatha Christie",
 *       "bio": "...",
 *       "photoUrl": "...",
 *       "bookCount": 66,
 *       "createdAt": "...",
 *       "updatedAt": "..."
 *     }
 *   ],
 *   "hasMore": true
 * }
 */
router.post('/list', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();

    // Extract and validate parameters
    let { cursor, letterFilter, limit = 50 } = req.body;

    // Validate cursor
    if (cursor !== undefined && cursor !== null) {
      if (typeof cursor !== 'object' || !cursor.name || !cursor.id) {
        throw errors.validationError('cursor must include both name and id properties');
      }
      if (typeof cursor.name !== 'string' || cursor.name.trim().length === 0) {
        throw errors.validationError('cursor.name must be a non-empty string');
      }
      if (typeof cursor.id !== 'number' || cursor.id <= 0 || !Number.isInteger(cursor.id)) {
        throw errors.validationError('cursor.id must be a positive integer');
      }
    }

    // Validate and normalize letterFilter
    if (letterFilter !== undefined && letterFilter !== null) {
      if (typeof letterFilter !== 'string' || letterFilter.length !== 1) {
        throw errors.validationError('letterFilter must be a single letter A-Z');
      }
      letterFilter = letterFilter.toUpperCase();
      if (!/^[A-Z]$/.test(letterFilter)) {
        throw errors.validationError('letterFilter must be a single letter A-Z');
      }
    }

    // Validate and normalize limit
    if (limit !== undefined) {
      if (typeof limit !== 'number') {
        throw errors.validationError('limit must be a number');
      }
      limit = Math.floor(limit);
      if (limit < 1) {
        limit = 50;
      }
      if (limit > 100) {
        limit = 100;
      }
    }

    logger.info('API request: Authors list', {
      cursor: cursor || null,
      letterFilter: letterFilter || null,
      limit,
    });

    // Build SQL query with cursor-based pagination
    let query = `
      SELECT
        a.id,
        a.external_id as externalId,
        a.name,
        a.sort_name as sortName,
        a.bio,
        a.photo_url as photoUrl,
        a.created_at as createdAt,
        a.updated_at as updatedAt,
        (SELECT COUNT(*)
         FROM book_authors ba
         JOIN books b ON ba.book_id = b.id
         WHERE ba.author_id = a.id AND b.deleted = 0
        ) as bookCount
      FROM authors a
      WHERE 1=1
    `;

    const params: any[] = [];

    // Add letter filter
    if (letterFilter) {
      query += ` AND a.sort_name LIKE ?`;
      params.push(`${letterFilter}%`);
    }

    // Add cursor for pagination (row value comparison)
    if (cursor) {
      query += ` AND (a.sort_name, a.id) > (?, ?)`;
      params.push(cursor.name, cursor.id);
    }

    query += ` ORDER BY a.sort_name COLLATE NOCASE ASC, a.id ASC LIMIT ?`;
    params.push(limit);

    const stmt = db.prepare(query);
    const authors = stmt.all(...params);

    // Determine if there are more results
    const hasMore = authors.length === limit;

    logger.info('API response: Authors list retrieved', {
      count: authors.length,
      hasMore,
      letterFilter: letterFilter || null,
      hasCursor: !!cursor,
    });

    res.json({ authors, hasMore });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/authors
 * Import author by external ID with all their books
 *
 * Request body:
 * {
 *   "externalId": "123456"
 * }
 *
 * Response:
 * {
 *   "author": { ...author with books... },
 *   "booksImported": 15,
 *   "booksSkipped": 3,
 *   "skippedReasons": {
 *     "12345": "already imported",
 *     "67890": "previously deleted"
 *   }
 * }
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { externalId } = req.body;

    if (!externalId) {
      throw errors.validationError('externalId is required');
    }

    if (typeof externalId !== 'string') {
      throw errors.validationError('externalId must be a string');
    }

    logger.info('API request: Import author', { externalId });

    const result = await authorService.importAuthor(externalId);

    logger.info('API response: Author imported successfully', {
      authorId: result.author.id,
      authorName: result.author.name,
      booksImported: result.booksImported,
      booksSkipped: result.booksSkipped,
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/authors/by-external-id/:externalId
 * Get author by external ID (Hardcover API ID) with all active books
 * This route must come before GET /api/authors/:id to avoid path conflicts
 *
 * Response:
 * {
 *   "id": 1,
 *   "externalId": "123456",
 *   "name": "Agatha Christie",
 *   "bio": "...",
 *   "photoUrl": "...",
 *   "books": [ ...active books... ],
 *   "activeBookCount": 66,
 *   "totalBookCount": 70,
 *   "createdAt": "...",
 *   "updatedAt": "..."
 * }
 */
router.get(
  '/by-external-id/:externalId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { externalId } = req.params;

      if (!externalId) {
        throw errors.validationError('externalId is required');
      }

      logger.info('API request: Get author by external ID', { externalId });

      const author = authorService.getAuthorWithBooksByExternalId(externalId);

      logger.info('API response: Author retrieved by external ID', {
        authorId: author.id,
        authorName: author.name,
        activeBookCount: author.activeBookCount,
      });

      res.json(author);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/authors/:id
 * Get author by internal ID with all active books
 *
 * Response:
 * {
 *   "id": 1,
 *   "externalId": "123456",
 *   "name": "Agatha Christie",
 *   "bio": "...",
 *   "photoUrl": "...",
 *   "books": [ ...active books... ],
 *   "activeBookCount": 66,
 *   "totalBookCount": 70,
 *   "createdAt": "...",
 *   "updatedAt": "..."
 * }
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authorId = parseInt(req.params.id, 10);

    if (isNaN(authorId)) {
      throw errors.validationError('Invalid author ID');
    }

    logger.info('API request: Get author', { authorId });

    const author = authorService.getAuthorWithBooks(authorId);

    logger.info('API response: Author retrieved', {
      authorId,
      authorName: author.name,
      activeBookCount: author.activeBookCount,
    });

    res.json(author);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/authors/:id
 * Update author information (bio, name, photo)
 *
 * Request body:
 * {
 *   "name": "Agatha Christie",
 *   "bio": "Updated biography...",
 *   "photoUrl": "https://..."
 * }
 *
 * Response: Updated author with books
 */
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authorId = parseInt(req.params.id, 10);

    if (isNaN(authorId)) {
      throw errors.validationError('Invalid author ID');
    }

    const { name, bio, photoUrl } = req.body;
    const updates: { name?: string; bio?: string; photoUrl?: string } = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        throw errors.validationError('name must be a non-empty string');
      }
      updates.name = name;
    }

    if (bio !== undefined) {
      if (bio !== null && typeof bio !== 'string') {
        throw errors.validationError('bio must be a string or null');
      }
      updates.bio = bio;
    }

    if (photoUrl !== undefined) {
      if (photoUrl !== null && typeof photoUrl !== 'string') {
        throw errors.validationError('photoUrl must be a string or null');
      }
      updates.photoUrl = photoUrl;
    }

    if (Object.keys(updates).length === 0) {
      throw errors.validationError('At least one field (name, bio, photoUrl) must be provided');
    }

    logger.info('API request: Update author', { authorId, updates });

    const author = authorService.updateAuthor(authorId, updates);

    logger.info('API response: Author updated', {
      authorId,
      authorName: author.name,
    });

    res.json(author);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/authors/:id/refresh
 * Refresh author's books from Hardcover API
 * Imports new books, skips already imported and deleted books
 *
 * Response:
 * {
 *   "author": { ...author with books... },
 *   "booksImported": 5,
 *   "booksSkipped": 15,
 *   "skippedReasons": { ... }
 * }
 */
router.post('/:id/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authorId = parseInt(req.params.id, 10);

    if (isNaN(authorId)) {
      throw errors.validationError('Invalid author ID');
    }

    logger.info('API request: Refresh author books', { authorId });

    const result = await authorService.refreshAuthorBooks(authorId);

    logger.info('API response: Author books refreshed', {
      authorId,
      authorName: result.author.name,
      booksImported: result.booksImported,
      booksSkipped: result.booksSkipped,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
