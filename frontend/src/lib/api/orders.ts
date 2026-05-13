import { apiClient } from './client';
import type {
  BuyNowRequest,
  BuyNowResponse,
  CheckoutRequest,
  Shipment,
  UpdateOrderStatusRequest,
  UpdateShipmentDetailsRequest,
  UpdateShipmentStatusRequest,
} from '@/lib/types';

export const ordersApi = {
  checkout: async (payload: CheckoutRequest) => {
    const { data } = await apiClient.post<{ data: any }>('/orders/checkout', payload);
    return data.data;
  },
  buyNow: async (payload: BuyNowRequest) => {
    const { data } = await apiClient.post<{ data: BuyNowResponse }>('/orders/buy-now', payload);
    return data.data;
  },
  history: async () => {
    const { data } = await apiClient.get<{ data: any[]; total: number; page: number; page_size: number }>('/orders');
    return data;
  },
  detail: async (id: string) => {
    const { data } = await apiClient.get<{ data: any }>(`/orders/${id}`);
    return data.data;
  },
  shipment: async (id: string) => {
    const { data } = await apiClient.get<{ data: Shipment }>(`/orders/${id}/shipment`);
    return data.data;
  },
  adminList: async (params?: { page?: number; page_size?: number; status?: string }) => {
    const { data } = await apiClient.get<{ data: any[]; total: number; page: number; page_size: number }>('/admin/orders', { params });
    return data;
  },
  adminGet: async (id: string) => {
    const { data } = await apiClient.get<{ data: any }>(`/admin/orders/${id}`);
    return data.data;
  },
  adminUpdateStatus: async (id: string, payload: UpdateOrderStatusRequest) => {
    const { data } = await apiClient.patch<{ data: any }>(`/admin/orders/${id}/status`, payload);
    return data.data;
  },
  adminHistory: async (id: string) => {
    const { data } = await apiClient.get<{ data: any }>(`/admin/orders/${id}/history`);
    return data.data;
  },
  adminShipmentByOrder: async (id: string) => {
    const { data } = await apiClient.get<{ data: Shipment }>(`/admin/orders/${id}/shipment`);
    return data.data;
  },
  adminShipment: async (id: string) => {
    const { data } = await apiClient.get<{ data: Shipment }>(`/admin/shipments/${id}`);
    return data.data;
  },
  adminUpdateShipmentStatus: async (id: string, payload: UpdateShipmentStatusRequest) => {
    const { data } = await apiClient.patch<{ data: any }>(`/admin/shipments/${id}/status`, payload);
    return data.data;
  },
  adminUpdateShipmentDetails: async (id: string, payload: UpdateShipmentDetailsRequest) => {
    const { data } = await apiClient.put<{ data: any }>(`/admin/shipments/${id}`, payload);
    return data.data;
  },
};
