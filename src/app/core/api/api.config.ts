import { environment } from '../../../environments/environment';

const normalizedBaseUrl = environment.apiBaseUrl.replace(/\/+$/, '');

export const API_BASE_URL = normalizedBaseUrl;
export const AUTH_API_URL = `${API_BASE_URL}/auth`;
export const APP_API_URL = `${API_BASE_URL}/api`;
