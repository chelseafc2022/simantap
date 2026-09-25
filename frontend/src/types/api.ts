export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    [key: string]: any;
  };
  timestamp: string;
}

export interface ApiError {
  success: false;
  statusCode: number;
  message: string;
  data?: any;
  timestamp: string;
}
