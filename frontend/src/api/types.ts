export interface User {
  id: string;
  email: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Order {
  order_id: string;
  customer_id: string;
  order_date: string;
  order_amount: string | number;
  status: string;
}

export interface UploadResult {
  status: string;
  batchId: string;
  gcsPath: string;
  totalRows: number;
  inserted: number;
  failed: number;
}

export interface CustomerOrdersResponse {
  customerId: string;
  count: number;
  orders: Order[];
}

export interface OrdersListResponse {
  count: number;
  limit: number;
  orders: Order[];
}
