import { glob } from 'fs/promises';
import { access, constants, stat } from 'fs/promises';
import path from 'path';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

export interface BookOwnership {
  authorName: string;
  bookTitle: string;
}

class OwnershipScanner {
  private cache: BookOwnership[] = [];
  private lastScan: number = 0;
  private cacheTTL: number = 60 * 60 * 1000; // 1 hour

  async scan(collectionRoot?: string, forceRefresh = false): Promise<BookOwnership[]> {
    const root = collectionRoot || env.collectionRoot;
    const now = Date.now();
    const cacheExpired = now - this.lastScan > this.cacheTTL;

    if (!forceRefresh && !cacheExpired && this.cache.length > 0) {
      logger.debug('Using cached ownership data', {
        cacheAge: now - this.lastScan,
        bookCount: this.cache.length,
      });
      return this.cache;
    }

    logger.info('Starting filesystem ownership scan', { collectionRoot: root });

    // Validate collection root exists and is readable
    try {
      await access(root, constants.R_OK);
    } catch (error) {
      logger.error('Collection root not accessible', error, { collectionRoot: root });
      throw new Error(`Collection root not accessible: ${root}`);
    }

    const ownedBooks: BookOwnership[] = [];
    const errors: string[] = [];
    // Pattern matches: /root/Author/Book/
    const pattern = path.join(root, '*/*');

    try {
      let count = 0;
      for await (const dirPath of glob(pattern)) {
        // Check if this path is a directory
        const stats = await stat(dirPath);
        if (!stats.isDirectory()) {
          continue;
        }

        count++;
        try {
          const parts = dirPath.split(path.sep);
          const authorName = parts[parts.length - 2]; // Author directory
          const bookDirName = parts[parts.length - 1]; // Book directory

          // Strip any parenthetical text from book title (e.g., "(2023)" or "(hardcover)")
          // This is for user organization only, not matching
          const bookTitle = bookDirName.replace(/\s*\([^)]*\)\s*$/, '').trim();

          if (authorName && bookTitle) {
            ownedBooks.push({ authorName, bookTitle });
          } else {
            errors.push(`Invalid directory format (missing author or title): ${dirPath}`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push(`Error processing ${dirPath}: ${errorMessage}`);
        }
      }

      logger.info('Filesystem ownership scan completed', {
        totalDirectories: count,
        ownedBooks: ownedBooks.length,
        errors: errors.length,
      });

      if (errors.length > 0) {
        logger.warn(`Scan completed with ${errors.length} errors`, { errors });
      }

      this.cache = ownedBooks;
      this.lastScan = now;

      return ownedBooks;
    } catch (error) {
      logger.error('Filesystem scan failed', error, { collectionRoot: root });
      throw new Error(`Filesystem scan failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  isOwned(authorName: string, bookTitle: string): boolean {
    // Case-insensitive matching per spec.md
    const normalizedAuthor = authorName.toLowerCase().trim();
    const normalizedTitle = bookTitle.toLowerCase().trim();

    return this.cache.some(
      (book) =>
        book.authorName.toLowerCase().trim() === normalizedAuthor &&
        book.bookTitle.toLowerCase().trim() === normalizedTitle
    );
  }

  invalidateCache(): void {
    logger.debug('Invalidating ownership cache');
    this.cache = [];
    this.lastScan = 0;
  }

  getCacheInfo(): { size: number; age: number; expired: boolean } {
    const age = Date.now() - this.lastScan;
    return {
      size: this.cache.length,
      age,
      expired: age > this.cacheTTL,
    };
  }
}

// Singleton instance
export const ownershipScanner = new OwnershipScanner();
