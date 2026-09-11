import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import { ApiItemResponse, ApiListResponse, Challan, ChallanStatus } from '../types';

export interface ChallanListParams {
  page: number;
  pageSize: number;
  status?: ChallanStatus;
  customerId?: string;
}

export interface ChallanFormInput {
  customerId: string;
  items: { productId: string; quantity: number }[];
}

export function useChallans(params: ChallanListParams) {
  return useQuery({
    queryKey: ['challans', params],
    queryFn: async () => {
      const res = await apiClient.get<ApiListResponse<Challan>>('/challans', { params });
      return res.data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useChallan(id: string | undefined) {
  return useQuery({
    queryKey: ['challans', id],
    queryFn: async () => {
      const res = await apiClient.get<ApiItemResponse<Challan>>(`/challans/${id}`);
      return res.data.data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateChallan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ChallanFormInput) => {
      const res = await apiClient.post<ApiItemResponse<Challan>>('/challans', input);
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['challans'] }),
  });
}

export function useConfirmChallan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post<ApiItemResponse<Challan>>(`/challans/${id}/confirm`);
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['challans'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.setQueryData(['challans', data.id], data);
    },
  });
}

export function useCancelChallan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post<ApiItemResponse<Challan>>(`/challans/${id}/cancel`);
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['challans'] });
      queryClient.setQueryData(['challans', data.id], data);
    },
  });
}
