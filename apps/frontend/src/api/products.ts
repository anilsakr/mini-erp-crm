import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import { ApiItemResponse, ApiListResponse, Category, Product, StockMovement, Warehouse } from '../types';

export interface ProductListParams {
  page: number;
  pageSize: number;
  search?: string;
  categoryId?: string;
  lowStockOnly?: boolean;
}

export interface ProductFormInput {
  name: string;
  sku: string;
  categoryId: string;
  unitPrice: number;
  currentStock?: number;
  minStockAlert?: number;
  warehouseId: string;
}

export function useProducts(params: ProductListParams) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: async () => {
      const res = await apiClient.get<ApiListResponse<Product>>('/products', { params });
      return res.data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: async () => {
      const res = await apiClient.get<ApiItemResponse<Product>>(`/products/${id}`);
      return res.data.data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProductFormInput) => {
      const res = await apiClient.post<ApiItemResponse<Product>>('/products', input);
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useUpdateProduct(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Omit<ProductFormInput, 'currentStock'>>) => {
      const res = await apiClient.put<ApiItemResponse<Product>>(`/products/${id}`, input);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useProductStockMovements(productId: string | undefined, page: number, pageSize: number) {
  return useQuery({
    queryKey: ['products', productId, 'stock-movements', page, pageSize],
    queryFn: async () => {
      const res = await apiClient.get<ApiListResponse<StockMovement>>(`/products/${productId}/stock-movements`, {
        params: { page, pageSize },
      });
      return res.data;
    },
    enabled: Boolean(productId),
  });
}

export function useCreateStockMovement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { productId: string; quantityChanged: number; movementType: 'IN' | 'OUT'; reason: string }) => {
      const res = await apiClient.post<ApiItemResponse<StockMovement>>('/stock-movements', input);
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products', variables.productId, 'stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['lookups', 'categories'],
    queryFn: async () => {
      const res = await apiClient.get<ApiItemResponse<Category[]>>('/lookups/categories');
      return res.data.data;
    },
  });
}

export function useWarehouses() {
  return useQuery({
    queryKey: ['lookups', 'warehouses'],
    queryFn: async () => {
      const res = await apiClient.get<ApiItemResponse<Warehouse[]>>('/lookups/warehouses');
      return res.data.data;
    },
  });
}
