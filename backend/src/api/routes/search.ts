import { Router, type Request, type Response, type NextFunction } from 'express';
import { SearchService } from '../../services/SearchService.js';
import { errors } from '../middleware/errorHandler.js';
import { logger } from '../../config/logger.js';

const router = Router();
const searchService = new SearchService();

/**
 * POST /api/search
 * Unified search endpoint for books and authors
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query, type, page } = req.body;

    // Validation
    if (!query || typeof query !== 'string') {
      throw errors.validationError('Query parameter is required and must be a string');
    }

    if (!type || !['title', 'author', 'isbn'].includes(type)) {
      throw errors.validationError('Type parameter must be one of: title, author, isbn');
    }

    const pageNum = typeof page === 'number' ? page : 1;

    if (pageNum < 1) {
      throw errors.validationError('Page number must be greater than 0');
    }

    logger.info('Search request received', {
      query,
      type,
      page: pageNum,
      ip: req.ip,
    });

    // Perform search
    const result = await searchService.search(query, type, pageNum);

    logger.info('Search request completed', {
      query,
      type,
      page: pageNum,
      resultsCount: result.results.length,
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
