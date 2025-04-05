// Type for validation errors
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * API response interface
 */
export interface ApiResponse<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}
