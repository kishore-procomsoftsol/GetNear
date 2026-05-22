/**
 * API module — re-exports the Axios client and common helper utilities.
 *
 * Usage:
 *   import apiClient, { get, post, put, patch, del } from '@/lib/api'
 */

export { default } from './client'
export { default as apiClient } from './client'

import apiClient from './client'
import type { AxiosRequestConfig } from 'axios'

// ─── Typed helper wrappers ──────────────────────────────────────────────────
// These thin wrappers keep call-sites concise and provide a consistent
// interface for making API requests throughout the app.

/** Perform a GET request and return the response data. */
export async function get<T = unknown>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await apiClient.get<T>(url, config)
  return response.data
}

/** Perform a POST request and return the response data. */
export async function post<T = unknown>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await apiClient.post<T>(url, body, config)
  return response.data
}

/** Perform a PUT request and return the response data. */
export async function put<T = unknown>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await apiClient.put<T>(url, body, config)
  return response.data
}

/** Perform a PATCH request and return the response data. */
export async function patch<T = unknown>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await apiClient.patch<T>(url, body, config)
  return response.data
}

/** Perform a DELETE request and return the response data. */
export async function del<T = unknown>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await apiClient.delete<T>(url, config)
  return response.data
}
