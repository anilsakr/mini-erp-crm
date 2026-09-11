import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';
import { ApiItemResponse, DashboardSummary } from '../types';

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: async () => {
      const res = await apiClient.get<ApiItemResponse<DashboardSummary>>('/dashboard/summary');
      return res.data.data;
    },
  });
}
