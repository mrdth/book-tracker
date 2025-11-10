import { Router, type Request, type Response, type NextFunction } from 'express';
import { BookService } from '../../services/BookService.js';
import { logger } from '../../config/logger.js';

const router = Router();
const bookService = new BookService();

/**
 * POST /api/ownership/scan
 * Trigger manual filesystem scan to update book ownership status
 *
 * Optional query parameter:
 * - forceRefresh: boolean - Force refresh of filesystem cache (default: false)
 *
 * Response:
 * {
 *   "scannedBooks": 150,
 *   "ownedBooks": 45,
 *   "updatedCount": 12
 * }
 */
router.post('/scan', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const forceRefresh = req.query.forceRefresh === 'true';

    logger.info('Manual ownership scan requested', {
      forceRefresh,
      ip: req.ip,
    });

    const result = await bookService.scanAndUpdateOwnership(forceRefresh);

    logger.info('Ownership scan completed', {
      scannedBooks: result.scannedBooks,
      ownedBooks: result.ownedBooks,
      updatedCount: result.updatedCount,
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
