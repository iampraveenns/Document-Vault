export interface PublicUser {
  id: string;
  email: string;
  createdAt: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: PublicUser;
}

const RAW_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const API_BASE = RAW_BASE_URL.replace(/\/+$/, '');

class AuthApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code = 'AUTH_ERROR', status = 400) {
    super(message);
    this.name = 'AuthApiError';
    this.code = code;
    this.status = status;
  }
}

async function handleAuthResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorCode = 'AUTH_ERROR';
    let errorMessage = `HTTP error ${res.status}`;

    try {
      const data = await res.json();
      if (data?.error) {
        errorCode = data.error.code || errorCode;
        errorMessage = data.error.message || errorMessage;
      }
    } catch {
      // response wasn't JSON
    }

    throw new AuthApiError(errorMessage, errorCode, res.status);
  }

  return res.json();
}

export const authApi = {
  /**
   * Register a new user
   */
  async signup(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    return handleAuthResponse<AuthResponse>(res);
  },

  /**
   * Log in an existing user
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    return handleAuthResponse<AuthResponse>(res);
  },

  /**
   * Retrieve current user profile using JWT token
   */
  async getMe(token: string): Promise<{ user: PublicUser }> {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return handleAuthResponse<{ user: PublicUser }>(res);
  },
};
