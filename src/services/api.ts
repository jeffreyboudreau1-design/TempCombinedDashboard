const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Base data fetching service for the Combined Dashboards V2.
 * Points to the local network json-server instance (e.g. 10.1.0.3:4000)
 */

export async function fetcher<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Common CRUD operations
 */
export const api = {
  get: <T = any>(endpoint: string, options?: RequestInit) => 
    fetcher<T>(endpoint, { ...options, method: 'GET' }),
    
  post: <T = any>(endpoint: string, data: any, options?: RequestInit) => 
    fetcher<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(data) }),
    
  put: <T = any>(endpoint: string, data: any, options?: RequestInit) => 
    fetcher<T>(endpoint, { ...options, method: 'PUT', body: JSON.stringify(data) }),
    
  patch: <T = any>(endpoint: string, data: any, options?: RequestInit) => 
    fetcher<T>(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(data) }),
    
  delete: <T = any>(endpoint: string, options?: RequestInit) => 
    fetcher<T>(endpoint, { ...options, method: 'DELETE' }),
};
