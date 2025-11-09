import { Router, type Request, type Response, type NextFunction } from 'express';
import { BookService } from '../../services/BookService.js';
import { errors } from '../middleware/errorHandler.js';
import { logger } from '../../config/logger.js';

const router = Router();
const bookService = new BookService();

/**
 * POST /api/books
 * Import a book from Hardcover API
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { externalId } = req.body;

    // Validation
    if (!externalId || typeof externalId !== 'string') {
      throw errors.validationError('externalId parameter is required and must be a string');
    }

    logger.info('Book import request received', {
      externalId,
      ip: req.ip,
    });

    // Import book
    const book = await bookService.importBook(externalId);

    logger.info('Book import completed', {
      bookId: book.id,
      externalId: book.externalId,
      title: book.title,
    });

    res.status(201).json(book);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/books/:id
 * Get book details by internal ID
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bookId = parseInt(req.params.id, 10);

    if (isNaN(bookId) || bookId < 1) {
      throw errors.validationError('Book ID must be a positive integer');
    }

    logger.debug('Get book request received', { bookId, ip: req.ip });

    const book = bookService.getBookWithAuthors(bookId);

    res.status(200).json(book);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/books/:id
 * Update book ownership or deletion status
 */
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bookId = parseInt(req.params.id, 10);

    if (isNaN(bookId) || bookId < 1) {
      throw errors.validationError('Book ID must be a positive integer');
    }

    const { owned, deleted } = req.body;

    logger.info('Book update request received', {
      bookId,
      owned,
      deleted,
      ip: req.ip,
    });

    // Handle deletion
    if (deleted === true) {
      const book = bookService.deleteBook(bookId);
      logger.info('Book deleted', { bookId, title: book.title });
      return res.status(200).json(book);
    }

    // Handle ownership update
    if (typeof owned === 'boolean') {
      const book = bookService.updateOwnership(bookId, owned, true); // true = manual override
      logger.info('Book ownership updated', {
        bookId,
        owned: book.owned,
        ownedSource: book.ownedSource,
      });
      return res.status(200).json(book);
    }

    // No valid update provided
    throw errors.validationError('Request must include either "owned" (boolean) or "deleted" (boolean)');
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/books/bulk
 * Bulk update books (ownership or deletion)
 */
router.patch('/bulk', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { bookIds, owned, deleted } = req.body;

    // Validation
    if (!Array.isArray(bookIds) || bookIds.length === 0) {
      throw errors.validationError('bookIds must be a non-empty array');
    }

    if (!bookIds.every((id) => typeof id === 'number' && id > 0)) {
      throw errors.validationError('All bookIds must be positive integers');
    }

    if (typeof owned !== 'boolean' && typeof deleted !== 'boolean') {
      throw errors.validationError('Request must include either "owned" or "deleted" (boolean)');
    }

    logger.info('Bulk book update request received', {
      bookIds,
      owned,
      deleted,
      ip: req.ip,
    });

    // Perform bulk update
    const updatedBooks = bookService.bulkUpdate(bookIds, { owned, deleted });

    logger.info('Bulk book update completed', {
      count: updatedBooks.length,
      owned,
      deleted,
    });

    res.status(200).json({
      updatedCount: updatedBooks.length,
      updatedBooks,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
