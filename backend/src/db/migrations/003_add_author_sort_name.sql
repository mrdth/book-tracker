-- Migration: Add sort_name column for efficient author name sorting
-- Purpose: Enable efficient "last name, first name" alphabetical ordering
-- Feature: Authors Homepage (specs/002-authors-homepage)

-- Step 1: Add sort_name column to authors table
ALTER TABLE authors ADD COLUMN sort_name TEXT;

-- Step 2: Create case-insensitive index on sort_name for efficient sorting
CREATE INDEX IF NOT EXISTS idx_authors_sort_name
ON authors(sort_name COLLATE NOCASE);
