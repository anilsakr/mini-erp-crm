import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import { ApiItemResponse, ApiListResponse, Customer, CustomerFollowUp, CustomerStatus, CustomerType } from '../types';

export interface CustomerListParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: CustomerStatus;
  customerType?: CustomerType;
}

export interface CustomerFormInput {
  name: string;
  mobile: string;
  email?: string;
  businessName: string;
  gstNumber?: string;
  customerType: CustomerType;
  address: string;
  status?: CustomerStatus;
  followUpDate?: string;
  notes?: string;
}

export function useCustomers(params: CustomerListParams) {
  return useQuery({
    queryKey: ['customers', params],
    queryFn: async () => {
      const res = await apiClient.get<ApiListResponse<Customer>>('/customers', { params });
      return res.data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: ['customers', id],
    queryFn: async () => {
      const res = await apiClient.get<ApiItemResponse<Customer>>(`/customers/${id}`);
      return res.data.data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CustomerFormInput) => {
      const res = await apiClient.post<ApiItemResponse<Customer>>('/customers', input);
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  });
}

export function useUpdateCustomer(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<CustomerFormInput>) => {
      const res = await apiClient.put<ApiItemResponse<Customer>>(`/customers/${id}`, input);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useAddFollowUp(customerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { note: string; followUpDate?: string }) => {
      const res = await apiClient.post<ApiItemResponse<CustomerFollowUp>>(
        `/customers/${customerId}/follow-ups`,
        input,
      );
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers', customerId] }),
  });
}
