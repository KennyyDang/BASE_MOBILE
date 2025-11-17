import axiosInstance from '../config/axios.config';
import { CreateOrderRequest, CreateOrderResponse, PayOrderRequest, PayOrderResponse, OrderHistory, PaginatedResponse } from '../types/api';

class OrderService {
  /**
   * Create a new order
   * Endpoint: POST /api/order/create
   * @param payload Order creation request with studentSlotId and items
   * @returns Created order response
   */
  async createOrder(payload: CreateOrderRequest): Promise<CreateOrderResponse> {
    try {
      const response = await axiosInstance.post<CreateOrderResponse>('/api/order/create', payload);
      return response.data;
    } catch (error: any) {
      const errorMessage = 
        error?.response?.data?.message || 
        error?.response?.data?.error || 
        error?.response?.data?.title ||
        error?.message || 
        'Không thể tạo đơn hàng';
      throw new Error(errorMessage);
    }
  }

  /**
   * Pay order by wallet
   * Endpoint: POST /api/Order/pay/wallet
   * @param payload Payment request with orderId and walletType (Student or Parent)
   * @returns Payment response with success status and balance info
   */
  async payOrderByWallet(payload: PayOrderRequest): Promise<PayOrderResponse> {
    try {
      const response = await axiosInstance.post<PayOrderResponse>('/api/Order/pay/wallet', payload);
      return response.data;
    } catch (error: any) {
      const errorMessage = 
        error?.response?.data?.message || 
        error?.response?.data?.error || 
        error?.response?.data?.title ||
        error?.message || 
        'Không thể thanh toán đơn hàng';
      throw new Error(errorMessage);
    }
  }

  /**
   * Get my orders (Parent/User)
   * Endpoint: GET /api/Order/me
   * @param params Query parameters for pagination and filtering
   * @returns Paginated response with order history
   */
  async getMyOrders(params: {
    pageIndex?: number;
    pageSize?: number;
    status?: string;
  }): Promise<PaginatedResponse<OrderHistory>> {
    try {
      const response = await axiosInstance.get<PaginatedResponse<OrderHistory>>(
        '/api/Order/me',
        { params }
      );
      return response.data;
    } catch (error: any) {
      const errorMessage = 
        error?.response?.data?.message || 
        error?.response?.data?.error || 
        error?.response?.data?.title ||
        error?.message || 
        'Không thể tải lịch sử đơn hàng';
      throw new Error(errorMessage);
    }
  }

  /**
   * Get order details by ID
   * Endpoint: GET /api/Order/{orderId}
   * @param orderId Order ID (UUID)
   * @returns Order details with full information including studentSlot info
   */
  async getOrderById(orderId: string): Promise<OrderHistory> {
    try {
      const response = await axiosInstance.get<OrderHistory>(`/api/Order/${orderId}`);
      return response.data;
    } catch (error: any) {
      const errorMessage = 
        error?.response?.data?.message || 
        error?.response?.data?.error || 
        error?.response?.data?.title ||
        error?.message || 
        'Không thể tải chi tiết đơn hàng';
      throw new Error(errorMessage);
    }
  }
}

export const orderService = new OrderService();
export default orderService;

