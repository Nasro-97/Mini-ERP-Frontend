// Replace with your ngrok URL or your Mac's local IP address
const BASE_URL = 'http://localhost:8000'; // Change this to your backend URL

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

class ApiClient {
  async request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;
    const token = localStorage.getItem('access_token');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);

      if (response.status === 401) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        throw new Error('Unauthorized');
      }

      if (response.status === 403) {
        throw new Error("User don't have permission");
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Request failed with status ${response.status}`);
      }

      // Handle 204 No Content responses
      if (response.status === 204) {
        return null as T;
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const text = await response.text();
        return text ? JSON.parse(text) : null as T;
      }

      return null as T;
    } catch (error) {
      // Handle network errors gracefully
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('Unable to connect to server. Please check if the backend is running at http://localhost:8000');
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network request failed');
    }
  }

  async get<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  }

  async post<T = any>(endpoint: string, data: any = null, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T = any>(endpoint: string, data: any = null, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient();
