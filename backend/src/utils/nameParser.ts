/**
 * Name parsing utilities for author sort name generation
 * Feature: Authors Homepage (specs/002-authors-homepage)
 */

/**
 * Generates a sort name in "Last, First" format from a full name.
 * Uses a simple last-word heuristic that covers ~90% of Western author names.
 *
 * Examples:
 * - "Agatha Christie" → "Christie, Agatha"
 * - "J.K. Rowling" → "Rowling, J.K."
 * - "Stephen King" → "King, Stephen"
 * - "Madonna" → "Madonna"
 *
 * Limitations:
 * - Multi-part surnames like "Ursula K. Le Guin" will parse as "Guin, Ursula K. Le"
 * - Suffixes like "Jr." or "Sr." will be treated as last names
 * - These edge cases can be manually corrected in future updates
 *
 * @param fullName - The full author name
 * @returns Sort name in "Last, First" format, or the original name if it's a single word
 */
export function generateSortName(fullName: string): string {
  const trimmed = fullName.trim();

  // Single name case (e.g., "Madonna")
  const lastSpaceIndex = trimmed.lastIndexOf(' ');
  if (lastSpaceIndex === -1) {
    return trimmed;
  }

  // Split on last space: "Agatha Christie" → "Christie, Agatha"
  const firstName = trimmed.substring(0, lastSpaceIndex);
  const lastName = trimmed.substring(lastSpaceIndex + 1);

  return `${lastName}, ${firstName}`;
}
