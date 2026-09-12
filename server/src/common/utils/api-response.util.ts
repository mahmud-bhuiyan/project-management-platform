import type {
  ApiErrorResponse,
  ApiSuccessResponse,
  ControllerResponse,
  PaginationMeta,
} from '../interfaces/api-response.interface.js';

export function buildSuccessResponse<T>(
  data: T,
  options?: { message?: string; meta?: PaginationMeta },
): ApiSuccessResponse<T> {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
  };

  if (options?.message) {
    response.message = options.message;
  }

  if (options?.meta) {
    response.meta = options.meta;
  }

  return response;
}

export function buildErrorResponse(
  message: string,
  code: string,
  details: unknown = null,
): ApiErrorResponse {
  return {
    success: false,
    message,
    error: {
      code,
      details,
    },
  };
}

export const respond = {
  ok<T>(data: T, message?: string): ControllerResponse<T> {
    return message ? { message, data } : { data };
  },

  created<T>(
    data: T,
    message = 'Resource created successfully',
  ): ControllerResponse<T> {
    return { message, data };
  },

  updated<T>(
    data: T,
    message = 'Resource updated successfully',
  ): ControllerResponse<T> {
    return { message, data };
  },

  deleted(message = 'Resource deleted successfully'): ControllerResponse<null> {
    return { message, data: null };
  },

  paginated<T>(data: T[], meta: PaginationMeta): ControllerResponse<T[]> {
    return { data, meta };
  },
};
