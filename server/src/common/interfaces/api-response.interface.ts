export interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface ControllerResponse<T = unknown> {
  message?: string;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  message?: string;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  error: {
    code: string;
    details: unknown;
  };
}

export interface ApiExceptionPayload {
  message: string;
  code: string;
  details?: unknown;
}
