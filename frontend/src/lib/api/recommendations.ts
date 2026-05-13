import { apiClient } from './client';
import type { BestSellerBook, MostViewedBook, SeriesBook, SimilarBook } from '@/lib/types';

function unwrapData<T>(response: any): T {
  return response?.data ?? response;
}

function asArray<T>(value: any, nestedKey?: string): T[] {
  if (Array.isArray(value)) return value;
  if (nestedKey && Array.isArray(value?.[nestedKey])) return value[nestedKey];
  return [];
}

export const recommendationsApi = {
  similarBooks: async (id: string): Promise<SimilarBook[]> => {
    const { data } = await apiClient.get(`/books/${id}/similar`);
    return asArray<SimilarBook>(unwrapData(data), 'similar_books');
  },
  seriesBooks: async (id: string): Promise<SeriesBook[]> => {
    const { data } = await apiClient.get(`/books/${id}/series`);
    return asArray<SeriesBook>(unwrapData(data), 'series_books');
  },
  getBestSellers: async (): Promise<BestSellerBook[]> => {
    const { data } = await apiClient.get('/best-sellers');
    return asArray<BestSellerBook>(unwrapData(data));
  },
  getTopDailyViewed: async (): Promise<MostViewedBook[]> => {
    const { data } = await apiClient.get('/most-viewed/daily');
    return asArray<MostViewedBook>(unwrapData(data));
  },
  getTopMostViewed30Days: async (): Promise<MostViewedBook[]> => {
    const { data } = await apiClient.get('/most-viewed/30days');
    return asArray<MostViewedBook>(unwrapData(data));
  },
};
