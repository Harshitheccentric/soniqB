/**
 * User API
 * Simplified identity anchoring API - no authentication, just user management
 */

import axios from 'axios';
import type { User } from '../types';

const API_BASE_URL = 'http://localhost:8000';

const userApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Fetch all available users for dropdown selection
 */
export async function getUsers(): Promise<User[]> {
  const response = await userApi.get<User[]>('/users');
  return response.data;
}

/**
 * Create a new user (identity anchoring)
 */
export async function createUser(username: string): Promise<User> {
  const response = await userApi.post<User>('/users', { username });
  return response.data;
}

/**
 * Get user by ID
 */
export async function getUserById(userId: number): Promise<User> {
  const response = await userApi.get<User>(`/users/${userId}`);
  return response.data;
}
