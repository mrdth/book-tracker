# Quickstart: Author Deletion

**Feature**: 003-author-deletion  
**Date**: 2025-11-15

## Overview

This guide explains how to use the Author Deletion feature to permanently remove unwanted authors and their books from your library.

## User Workflow

### Deleting an Author

1. **Navigate to Author Page**
   - Go to the Authors list page
   - Click on the author you want to delete
   - You'll see the author's page with their books

2. **Click Delete Button**
   - In the header section, you'll see action buttons: Edit, Update, and **Delete**
   - The Delete button has red/destructive styling to indicate it's a permanent action
   - Click the **Delete** button

3. **Review Confirmation Dialog**
   - A modal dialog appears showing:
     - The author's name
     - Number of books that will be deleted (sole-authored books)
     - Number of books that will be preserved (co-authored books, if any)
   - Example: "Delete Jane Doe? This will delete 15 books and update 3 co-authored books."

4. **Confirm or Cancel**
   - Click **"Delete Author"** to proceed with deletion
   - Click **"Cancel"** or press Escape to abort and keep the author
   - Click outside the modal to cancel

5. **Deletion Process**
   - The Delete button shows a loading spinner
   - All buttons are disabled during deletion
   - The operation completes in under 5 seconds (for up to 100 books)

6. **After Deletion**
   - Success: You're redirected to the Authors list page
   - Error: An error message appears, you stay on the author page

## What Gets Deleted

### Sole-Authored Books
Books written only by this author are permanently removed:
- Book record deleted from database
- Cannot be recovered (unless re-imported from Hardcover API)
- All book metadata, ownership status, and associations removed

### Co-Authored Books
Books written by this author AND other authors are preserved:
- Book remains in your library
- This author's name removed from the book's author list
- Other authors and book data remain intact
- Ownership status unchanged

### Author Record
The author record itself is permanently deleted:
- Author profile, bio, and photo removed
- Cannot be recovered (unless re-imported from Hardcover API)
- All book associations removed

## Example Scenarios

### Scenario 1: Solo Author
**Author**: Stephen King  
**Books**: 60 sole-authored books, 0 co-authored books

**Action**: Delete Stephen King

**Result**:
- Stephen King removed from authors list
- All 60 books removed from library
- Empty shelf where his books used to be

---

### Scenario 2: Collaborator
**Author**: Neil Gaiman  
**Books**: 0 sole-authored, 5 co-authored books (with Terry Pratchett, etc.)

**Action**: Delete Neil Gaiman

**Result**:
- Neil Gaiman removed from authors list
- All 5 books remain in library (they have other authors)
- Neil Gaiman's name removed from those books' author lists
- Terry Pratchett and other co-authors remain

---

### Scenario 3: Mixed Catalog
**Author**: Agatha Christie  
**Books**: 66 sole-authored books, 4 co-authored books

**Action**: Delete Agatha Christie

**Result**:
- Agatha Christie removed from authors list
- 66 sole-authored books deleted
- 4 co-authored books remain with her name removed

## When Delete is Unavailable

The Delete button will be disabled (grayed out) when:

### Bulk Operations in Progress
- You're using "Bulk Actions" on the author's books page
- Message: "Delete unavailable during bulk operations"
- Wait for bulk operation to complete, then try again

### Another Operation Active
- Author refresh is in progress ("Update from API" running)
- Author edit is being saved
- Another deletion is in progress

## Error Handling

### Author Not Found
**Message**: "Author not found"  
**Cause**: The author was deleted in another browser tab or by another user  
**Action**: Click "Back" to return to authors list

### Database Error
**Message**: "Failed to delete author: [details]"  
**Cause**: Database issue, disk full, or constraint violation  
**Action**: 
- Try again in a few moments
- Check available disk space
- Contact support if problem persists

### Network Error
**Message**: "Network error, please try again"  
**Cause**: Lost internet connection during deletion  
**Action**:
- Check your internet connection
- Refresh the page to see if deletion completed
- Try again if author still exists

## Safety Features

### Confirmation Required
- Cannot delete by accident - confirmation modal required
- Shows exactly what will be deleted before proceeding
- Clear cancel option

### Atomic Operation
- Either everything succeeds or nothing changes
- No partial deletions
- Database integrity maintained

### Visual Feedback
- Delete button has destructive styling (red color)
- Loading spinner during operation
- Buttons disabled to prevent duplicate requests
- Clear error messages if something goes wrong

### Concurrent Operation Prevention
- Cannot delete while bulk operations active
- Cannot start bulk operations while deleting
- Prevents data race conditions

## Technical Details

### Performance
- Authors with up to 100 books: <5 seconds
- Authors with 1000+ books: No timeout limit, relies on database performance
- Redirect after completion: <1 second

### Data Permanence
- Hard delete: Author and books permanently removed from database
- Not recoverable from application (no "undo" or "trash" feature)
- Re-importing from Hardcover API will restore data if needed

### No Audit Trail
- Deletion events are not logged
- No record of who deleted what or when
- Clean removal with no traces

## Developer Information

### API Endpoint
```
DELETE /api/authors/:id
```

### Frontend Component
- Page: `frontend/src/pages/AuthorPage.vue`
- Modal: `frontend/src/components/authors/DeleteAuthorModal.vue`
- API client: `frontend/src/services/api.ts`

### Backend Service
- Service: `backend/src/services/AuthorService.ts`
- Model: `backend/src/models/Author.ts`
- Route: `backend/src/api/routes/authors.ts`

### Database Operations
- CASCADE DELETE on `book_authors` table
- Hard delete from `authors` and `books` tables
- Transaction-wrapped for atomicity

## Testing

### Manual Testing Checklist
- [ ] Delete author with sole-authored books only
- [ ] Delete author with co-authored books only
- [ ] Delete author with mixed books
- [ ] Cancel deletion from modal
- [ ] Try to delete while bulk operation active (should be disabled)
- [ ] Try to delete non-existent author (should error)
- [ ] Verify redirect after successful deletion
- [ ] Verify error message on failure

### Test Data Setup
Use these test scenarios:
1. Create author with 5 sole-authored books → test full deletion
2. Create 2 authors who co-authored 3 books → test preservation
3. Create author with 50+ books → test performance
4. Delete author in one tab, refresh in another → test 404 handling

## See Also

- [Feature Specification](./spec.md) - Full requirements and acceptance criteria
- [Implementation Plan](./plan.md) - Technical design and architecture
- [Data Model](./data-model.md) - Database operations and integrity rules
- [API Contract](./contracts/author-deletion-api.md) - Detailed API specification
