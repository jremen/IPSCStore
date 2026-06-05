export interface ApiError {
  error: string;
}

export interface PaginatedResponse<T> {
  shooters: T[];
  total: number;
  limit: number;
  offset: number;
}