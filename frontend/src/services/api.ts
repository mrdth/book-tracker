import type {
  SearchRequest,
  SearchResponse,
  ImportBookRequest,
  BookResponse,
  UpdateBookRequest,
  BulkUpdateBooksRequest,
  ImportAuthorRequest,
  AuthorResponse,
  UpdateAuthorRequest,
  ApiError,
} from '@shared/types/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class ApiClient {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const error: ApiError = await response.json();
        throw new Error(error.error.message || 'API request failed');
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred');
    }
  }

  // Search
  async search(params: SearchRequest): Promise<SearchResponse> {
    return this.request<SearchResponse>('/search', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // Books
  async importBook(params: ImportBookRequest): Promise<BookResponse> {
    return this.request<BookResponse>('/books', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getBook(id: number): Promise<BookResponse> {
    return this.request<BookResponse>(`/books/${id}`);
  }

  async updateBook(id: number, params: UpdateBookRequest): Promise<BookResponse> {
    return this.request<BookResponse>(`/books/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(params),
    });
  }

  async bulkUpdateBooks(params: BulkUpdateBooksRequest): Promise<{ updated: number }> {
    return this.request<{ updated: number }>('/books/bulk', {
      method: 'PATCH',
      body: JSON.stringify(params),
    });
  }

  // Authors
  async importAuthor(params: ImportAuthorRequest): Promise<AuthorResponse> {
    return this.request<AuthorResponse>('/authors', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getAuthor(id: number): Promise<AuthorResponse> {
    return this.request<AuthorResponse>(`/authors/${id}`);
  }

  async getAuthorByExternalId(externalId: string): Promise<AuthorResponse> {
    return this.request<AuthorResponse>(`/authors/by-external-id/${externalId}`);
  }

  async updateAuthor(id: number, params: UpdateAuthorRequest): Promise<AuthorResponse> {
    return this.request<AuthorResponse>(`/authors/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(params),
    });
  }

  async refreshAuthorBooks(id: number): Promise<{ imported: number; skipped: number }> {
    return this.request<{ imported: number; skipped: number }>(`/authors/${id}/refresh`, {
      method: 'POST',
    });
  }

  // Ownership
  async triggerOwnershipScan(): Promise<{ scanned: number }> {
    return this.request<{ scanned: number }>('/ownership/scan', {
      method: 'POST',
    });
  }
}

export const apiClient = new ApiClient();
