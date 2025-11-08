# Quickstart Guide: Book Tracker Application

**Date**: 2025-11-08  
**Feature**: Book Tracker Application  
**Branch**: 001-book-tracker

## Overview

This guide provides setup instructions, development workflows, and testing procedures for the Book Tracker application. Follow these steps to get the application running locally and understand the development process.

---

## Prerequisites

**Required**:
- Node.js 22.x or 20.19+ (check with `node --version`)
- npm 10+ (included with Node.js)
- Git

**Recommended**:
- VS Code or similar IDE with TypeScript support
- SQLite database viewer (e.g., DB Browser for SQLite, TablePlus)

---

## Initial Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd book-tracker
git checkout 001-book-tracker
```

### 2. Install Dependencies

```bash
# Install root workspace dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Install shared types dependencies
cd ../shared
npm install

# Return to root
cd ..
```

### 3. Environment Configuration

Create `.env` file in the `backend/` directory:

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
# Database
DATABASE_PATH=./data/books.db

# Hardcover API
HARDCOVER_API_URL=https://hardcover.app/graphql
HARDCOVER_API_KEY=your_api_key_here

# Book Collection Filesystem Path
COLLECTION_ROOT=/path/to/your/book/collection

# Server
PORT=3000
NODE_ENV=development

# Logging
LOG_LEVEL=info
```

**Important**: Replace `COLLECTION_ROOT` with the actual path to your book collection directory (structure: `Author name/Book title (ID)/`)

### 4. Initialize Database

```bash
cd backend
npm run db:migrate
```

This creates the SQLite database and runs initial schema migrations.

---

## Development Workflow

### Running the Application

**Option 1: Run backend and frontend separately**

Terminal 1 - Backend:
```bash
cd backend
npm run dev
```
Server runs on http://localhost:3000

Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```
Frontend runs on http://localhost:5173

**Option 2: Run both concurrently (from root)**

```bash
npm run dev
```

This starts both backend and frontend in parallel.

### Accessing the Application

- Frontend UI: http://localhost:5173
- Backend API: http://localhost:3000/api
- API Documentation: http://localhost:3000/api-docs (OpenAPI Swagger UI)

---

## Project Structure

```
book-tracker/
├── backend/               # Express.js API server
│   ├── src/
│   │   ├── models/        # Database models (Book, Author, BookAuthor)
│   │   ├── services/      # Business logic (HardcoverClient, OwnershipScanner)
│   │   ├── api/           # Express routes and controllers
│   │   ├── db/            # Database connection and migrations
│   │   └── config/        # Configuration and environment
│   ├── tests/             # Backend tests
│   ├── data/              # SQLite database file (gitignored)
│   └── package.json
│
├── frontend/              # Vue.js application
│   ├── src/
│   │   ├── components/    # Vue components
│   │   ├── pages/         # Route-level pages
│   │   ├── services/      # API client
│   │   ├── stores/        # State management (if needed)
│   │   └── router/        # Vue Router
│   ├── tests/             # Frontend tests
│   └── package.json
│
├── shared/                # Shared TypeScript types
│   ├── types/             # Type definitions
│   └── queries/           # GraphQL query definitions
│
└── specs/                 # Feature specifications and planning
    └── 001-book-tracker/
        ├── spec.md
        ├── plan.md
        ├── research.md
        ├── data-model.md
        ├── quickstart.md (this file)
        └── contracts/
```

---

## Common Development Tasks

### Database Operations

**View database schema**:
```bash
cd backend
npm run db:schema
```

**Reset database** (WARNING: deletes all data):
```bash
cd backend
npm run db:reset
```

**Create new migration**:
```bash
cd backend
npm run db:migration:create <migration-name>
```

### Code Quality

**Run linter** (ESLint):
```bash
# Backend
cd backend
npm run lint

# Frontend
cd frontend
npm run lint

# Both
npm run lint
```

**Fix linter issues**:
```bash
npm run lint:fix
```

**Format code** (Prettier):
```bash
npm run format
```

**Type checking** (TypeScript):
```bash
# Backend
cd backend
npm run type-check

# Frontend
cd frontend
npm run type-check

# Both
npm run type-check
```

---

## Testing

### Backend Tests

**Run all backend tests**:
```bash
cd backend
npm test
```

**Run specific test suite**:
```bash
cd backend
npm test -- tests/unit/services/HardcoverClient.test.ts
```

**Run tests in watch mode**:
```bash
cd backend
npm test -- --watch
```

**Run tests with coverage**:
```bash
cd backend
npm run test:coverage
```

### Frontend Tests

**Run all frontend tests**:
```bash
cd frontend
npm test
```

**Run component tests**:
```bash
cd frontend
npm test -- tests/integration/SearchBar.test.ts
```

**Run tests in watch mode**:
```bash
cd frontend
npm test -- --watch
```

### User Story Validation Tests

**Run acceptance tests** (validates user stories from spec.md):
```bash
cd backend
npm test -- tests/user-stories/
```

These tests verify the acceptance criteria for each user story defined in the specification.

---

## Building for Production

### Backend Build

```bash
cd backend
npm run build
```

Output: `backend/dist/`

### Frontend Build

```bash
cd frontend
npm run build
```

Output: `frontend/dist/`

### Full Build

```bash
npm run build
```

Builds both backend and frontend.

---

## User Workflows

### User Story 1: Search and Import Books by Title

1. Open frontend at http://localhost:5173
2. Enter a book title in the search field (e.g., "The Great Gatsby")
3. Click "Search" or press Enter
4. View search results with book covers, titles, and authors
5. Books already in database show "Already Imported" or "Deleted" indicator
6. Click "Import" on a book not yet imported
7. Book is saved to database with author information
8. Ownership status automatically detected from filesystem

### User Story 2: Import Author with Complete Bibliography

1. Enter an author name in the search field (e.g., "Agatha Christie")
2. Click "Search"
3. View list of matching authors
4. Click "Import books" on the desired author
5. All of the author's books are imported into the database
6. Ownership status checked for each book via filesystem scan
7. View imported books on the author's page

### User Story 3: Manage Author Profiles

1. Navigate to an author's page (from search or book details)
2. View author bio and list of books
3. Click "Edit" to modify author biographical information
4. Save changes
5. Click "Update from API" to fetch latest books from Hardcover
6. New books are imported (deleted books are not re-imported)
7. Enable bulk action mode to see checkboxes next to books
8. Select multiple books
9. Click "Mark as Owned" or "Delete" to perform bulk action

### User Story 4: Search Books by ISBN

1. Enter an ISBN in the search field (e.g., "9780743273565")
2. Click "Search"
3. View exact matching book result
4. Click "Import" to add book to database

### User Story 5: Mark Books as Deleted

1. View a book (on author page or search results)
2. Click "Delete" button
3. Book is marked as deleted in database
4. Book no longer appears on author page
5. Book shows "Deleted" indicator in search results
6. Book is not re-imported during author updates

---

## API Endpoints

### Search

**POST /api/search**
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "Gatsby", "type": "title", "page": 1}'
```

### Books

**POST /api/books** (Import book)
```bash
curl -X POST http://localhost:3000/api/books \
  -H "Content-Type: application/json" \
  -d '{"externalId": "12345"}'
```

**GET /api/books/:id** (Get book details)
```bash
curl http://localhost:3000/api/books/1
```

**PATCH /api/books/:id** (Update book)
```bash
curl -X PATCH http://localhost:3000/api/books/1 \
  -H "Content-Type: application/json" \
  -d '{"owned": true}'
```

**PATCH /api/books/bulk** (Bulk update books)
```bash
curl -X PATCH http://localhost:3000/api/books/bulk \
  -H "Content-Type: application/json" \
  -d '{"bookIds": [1, 2, 3], "owned": true}'
```

### Authors

**POST /api/authors** (Import author with books)
```bash
curl -X POST http://localhost:3000/api/authors \
  -H "Content-Type: application/json" \
  -d '{"externalId": "67890"}'
```

**GET /api/authors/:id** (Get author with books)
```bash
curl http://localhost:3000/api/authors/1
```

**PATCH /api/authors/:id** (Update author)
```bash
curl -X PATCH http://localhost:3000/api/authors/1 \
  -H "Content-Type: application/json" \
  -d '{"bio": "Updated biography"}'
```

**POST /api/authors/:id/refresh** (Refresh author books from API)
```bash
curl -X POST http://localhost:3000/api/authors/1/refresh
```

### Ownership

**POST /api/ownership/scan** (Trigger filesystem scan)
```bash
curl -X POST http://localhost:3000/api/ownership/scan
```

---

## Troubleshooting

### Database Issues

**Error: "database is locked"**
- Stop all running instances of the backend
- Check for zombie processes: `ps aux | grep node`
- Kill if necessary: `kill -9 <PID>`

**Error: "table does not exist"**
- Run migrations: `npm run db:migrate`
- Check migration files in `backend/src/db/migrations/`

### API Connection Issues

**Error: "Cannot connect to Hardcover API"**
- Verify `HARDCOVER_API_KEY` in `.env`
- Check internet connectivity
- Test API directly: `curl https://hardcover.app/graphql`
- Review backend logs for rate limiting errors

**Error: "Rate limit exceeded"**
- Wait for rate limit window to reset
- Check `backend/logs/` for timing details
- Adjust rate limiting parameters in `HardcoverClient`

### Filesystem Scan Issues

**Error: "Collection root not accessible"**
- Verify `COLLECTION_ROOT` path in `.env`
- Check directory exists: `ls -la /path/to/collection`
- Ensure read permissions: `chmod 755 /path/to/collection`

**Ownership not detected**
- Verify directory structure: `{COLLECTION_ROOT}/Author name/Book title (ID)/`
- Check that book ID in directory matches Hardcover API ID
- Run manual scan: `POST /api/ownership/scan`
- Review scan logs in backend console

### Frontend Build Issues

**Error: "Module not found"**
- Clear node_modules: `rm -rf node_modules package-lock.json`
- Reinstall: `npm install`
- Check shared types: `cd shared && npm install`

**TypeScript errors**
- Run type check: `npm run type-check`
- Verify shared types are built: `cd shared && npm run build`
- Restart TypeScript server in IDE

---

## Logging and Debugging

### Backend Logs

**Log location**: `backend/logs/`

**Log levels**:
- `DEBUG`: Development-only detailed logs
- `INFO`: User actions, API calls
- `WARN`: Recoverable issues (rate limits, retries)
- `ERROR`: Failures requiring attention

**View logs in real-time**:
```bash
cd backend
tail -f logs/app.log
```

**Enable debug logging**:
Edit `backend/.env`:
```env
LOG_LEVEL=debug
```

### Frontend Debugging

**Vue Devtools**: Install browser extension for Vue component inspection

**Network tab**: Monitor API calls in browser DevTools

**Console logging**: Check browser console for errors and warnings

---

## Next Steps

After completing setup:

1. **Read the specification**: Review `specs/001-book-tracker/spec.md` for user stories and requirements
2. **Review the plan**: Check `specs/001-book-tracker/plan.md` for technical architecture
3. **Understand the data model**: Study `specs/001-book-tracker/data-model.md` for database schema
4. **API contracts**: Review `specs/001-book-tracker/contracts/` for endpoint and GraphQL definitions
5. **Run tests**: Ensure all tests pass with `npm test`
6. **Start development**: Implement user stories incrementally following constitution principles

---

## Constitution Alignment

This quickstart guide aligns with the project constitution:

- **Incremental Development**: Clear workflow for implementing and testing user stories independently
- **Observable & Debuggable**: Comprehensive logging, debugging tools, and troubleshooting guides
- **Simplicity First**: Straightforward setup process, minimal configuration, standard tooling
- **User-Centric Design**: User workflow examples demonstrate reader-focused features
