import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from "@tanstack/react-query";
import axiosService from "./axios";

// ====================
// Types
// ====================
interface QueryProps<T = any> {
  key: string | string[];
  url: string;
  params?: Record<string, any>;
  options?: UseQueryOptions<T>;
}

interface MutationProps<T = any> {
  url: string;
  options?: UseMutationOptions<T, any, any, any>;
}

// ====================
// Queries (GET)
// ====================
export const useGetData = <T>({ key, url, params, options }: QueryProps<T>) => {
  return useQuery<T>({
    queryKey: Array.isArray(key) ? key : [key],
    queryFn: () => axiosService.get<T>(url, params),
    ...options,
  });
};

// ====================
// Mutations (POST)
// ====================
export const usePostData = <T>({ url, options }: MutationProps<T>) => {
  return useMutation<T, any, any>({
    mutationFn: (data: any) => axiosService.post<T>(url, data),
    ...options,
  });
};

// ====================
// Mutations (PUT)
// ====================
export const usePutData = <T>({ url, options }: MutationProps<T>) => {
  return useMutation<T, any, any>({
    mutationFn: (data: any) => axiosService.put<T>(url, data),
    ...options,
  });
};

// ====================
// Mutations (DELETE)
// ====================
export const useDeleteData = <T>({ url, options }: MutationProps<T>) => {
  return useMutation<T, any, any>({
    mutationFn: (params: any) => axiosService.delete<T>(url, params),
    ...options,
  });
};
