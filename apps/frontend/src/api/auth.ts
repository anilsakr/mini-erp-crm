import { apiClient } from './client';
import { ApiItemResponse, User } from '../types';

export interface LoginResponse {
  token: string;
  user: User;
}

export async function login(email: string, password: string) {
  const res = await apiClient.post<ApiItemResponse<LoginResponse>>('/auth/login', { email, password });
  return res.data.data;
}

export async function fetchMe() {
  const res = await apiClient.get<ApiItemResponse<User>>('/auth/me');
  return res.data.data;
}
