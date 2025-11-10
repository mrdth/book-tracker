import { Router, type Request, type Response, type NextFunction } from 'express';
import { AuthorService } from '../../services/AuthorService.js';
import { logger } from '../../config/logger.js';
import { errors } from '../middleware/errorHandler.js';

const router = Router();
const authorService = new AuthorService();

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
