import { GraphQLClient } from 'graphql-request';
import pLimit from 'p-limit';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { errors } from '../api/middleware/errorHandler.js';

export class HardcoverClient {
  private client: GraphQLClient;
  private limiter = pLimit(1); // 1 concurrent request
  private lastRequest = 0;
  private minInterval = 1000; // 1 second between requests
  private maxRetries = 3; // Max retry attempts
  private baseBackoff = 2000; // 2 seconds base backoff

  constructor() {
    this.client = new GraphQLClient(env.hardcoverApiUrl, {
      headers: {
        Authorization: `Bearer ${env.hardcoverApiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async request<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    return this.limiter(async () => {
      for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
        try {
          // Enforce minimum interval between requests
          const now = Date.now();
          const timeSinceLastRequest = now - this.lastRequest;
          if (timeSinceLastRequest < this.minInterval) {
            const waitTime = this.minInterval - timeSinceLastRequest;
            logger.debug(`Rate limiting: waiting ${waitTime}ms before next request`);
            await new Promise((resolve) => setTimeout(resolve, waitTime));
          }

          // Log the API request
          logger.info('Hardcover API request', {
            query: query.substring(0, 100),
            variables,
            attempt: attempt + 1,
          });

          this.lastRequest = Date.now();
          const response = await this.client.request<T>(query, variables);

          logger.info('Hardcover API request successful', {
            attempt: attempt + 1,
          });

          return response;
        } catch (error) {
          const isLastAttempt = attempt === this.maxRetries;

          if (isLastAttempt) {
            logger.error('Hardcover API request failed (all retries exhausted)', error, {
              query: query.substring(0, 100),
              variables,
              attempts: attempt + 1,
            });
            throw errors.externalApiError(
              'Failed to fetch data from Hardcover API after multiple attempts',
              { originalError: error }
            );
          }

          // Calculate exponential backoff delay: 2s, 4s, 8s
          const backoffDelay = this.baseBackoff * Math.pow(2, attempt);
          logger.warn(
            `Hardcover API request failed (attempt ${attempt + 1}/${
              this.maxRetries + 1
            }), retrying in ${backoffDelay}ms`,
            {
              error: error instanceof Error ? error.message : error,
              query: query.substring(0, 100),
              variables,
            }
          );

          await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        }
      }

      // This should never be reached due to the throw in the loop
      throw new Error('Unexpected code path in HardcoverClient.request');
    });
  }
}

// Singleton instance
export const hardcoverClient = new HardcoverClient();
