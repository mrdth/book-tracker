/**
 * Backfill script to populate sort_name for existing authors
 * Feature: Authors Homepage (specs/002-authors-homepage)
 *
 * This script should be run after migration 003 to populate the sort_name
 * column for all existing authors in the database.
 *
 * Usage: npm run db:backfill-sort-names
 * or: node --loader ts-node/esm src/db/backfillSortNames.ts
 */

import { getDatabase } from './connection.js';
import { generateSortName } from '../utils/nameParser.js';

interface AuthorRow {
  id: number;
  name: string;
  sort_name: string | null;
}

export function backfillSortNames(): void {
  const db = getDatabase();

  console.log('Starting sort_name backfill for existing authors...');

  // Find all authors without sort_name
  const authors = db
    .prepare('SELECT id, name, sort_name FROM authors WHERE sort_name IS NULL')
    .all() as AuthorRow[];

  if (authors.length === 0) {
    console.log('✓ No authors need backfill. All authors already have sort_name.');
    return;
  }

  console.log(`Found ${authors.length} author(s) without sort_name. Processing...`);

  // Prepare update statement
  const updateStmt = db.prepare('UPDATE authors SET sort_name = ? WHERE id = ?');

  // Use transaction for better performance
  const backfillTransaction = db.transaction(() => {
    let successCount = 0;
    let errorCount = 0;

    for (const author of authors) {
      try {
        const sortName = generateSortName(author.name);
        updateStmt.run(sortName, author.id);
        successCount++;

        if (successCount % 100 === 0) {
          console.log(`  Processed ${successCount}/${authors.length} authors...`);
        }
      } catch (error) {
        errorCount++;
        console.error(`  ✗ Error processing author ${author.id} (${author.name}):`, error);
      }
    }

    console.log(`\n✓ Backfill complete:`);
    console.log(`  - Successfully updated: ${successCount} author(s)`);
    if (errorCount > 0) {
      console.log(`  - Failed: ${errorCount} author(s)`);
    }
  });

  // Execute transaction
  backfillTransaction();
}

// Run backfill if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    backfillSortNames();
    process.exit(0);
  } catch (error) {
    console.error('✗ Backfill failed:', error);
    process.exit(1);
  }
}
