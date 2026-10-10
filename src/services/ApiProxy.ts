/**
 * ApiProxy.ts
 * A wrapper around fetch to handle JWT authentication and 401 Unauthorized errors globally.
 */

const getAuthToken = () => localStorage.getItem('token');

const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
    localStorage.removeItem('token');
    localStorage.removeItem('omekaUserId');
    // Force redirect to login if we get a 401
    if (window.location.pathname !== '/login') {
        window.location.href = '/login';
    }
};

import { edisemHelperAjaxUrl } from '@/utils/omekaApi';

const apiProxyUrl = (action: string) => edisemHelperAjaxUrl('ApiProxy', { action, json: '1' });

export const ApiProxy = {
  async request(url: string, options: RequestInit = {}): Promise<Response> {
    const token = getAuthToken();
    const headers = new Headers(options.headers || {});

    // Always try to include Bearer token if available
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Important for cookies/session
    });

    if (response.status === 401) {
      console.error('Session expired or invalid token. Logging out...');
      logout();
      throw new Error('Unauthorized');
    }

    return response;
  },

  async get(url: string, options: RequestInit = {}): Promise<any> {
    const response = await this.request(url, { ...options, method: 'GET' });
    return response.json();
  },

  async post(url: string, bodyObj: any, options: RequestInit = {}): Promise<any> {
    const token = getAuthToken();
    const isFormData = bodyObj instanceof FormData;
    
    // Fallback: inject token in body for backend verifyJWT
    if (token) {
      if (isFormData) {
        if (!bodyObj.has('token')) bodyObj.append('token', token);
      } else if (bodyObj && typeof bodyObj === 'object') {
        bodyObj = { ...bodyObj, token };
      }
    }

    const response = await this.request(url, {
      ...options,
      method: 'POST',
      headers: {
        ...((options.headers as any) || {}),
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      },
      body: isFormData ? bodyObj : JSON.stringify(bodyObj),
    });
    return response.json();
  },

  /**
   * Proxiage spécifique via ApiProxyViewHelper (backend)
   */
  async proxy(action: string, params: Record<string, any> = {}): Promise<any> {
    return this.post(apiProxyUrl(action), params);
  },

  async createItem(data: any): Promise<any> {
    return this.proxy('createItem', { data });
  },

  async updateItem(itemId: string | number, data: any): Promise<any> {
    return this.proxy('updateItem', { itemId, data });
  },

  async deleteItem(itemId: string | number): Promise<any> {
    return this.proxy('deleteItem', { itemId });
  },

  async uploadMedia(file: File, itemId: string | number): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('itemId', String(itemId));
    return this.post(apiProxyUrl('uploadMedia'), formData);
  },

  async createMedia(mediaData: any): Promise<any> {
    return this.proxy('createMedia', { data: mediaData });
  },

  async deleteMedia(mediaId: string | number): Promise<any> {
    return this.proxy('deleteMedia', { mediaId });
  }
};
