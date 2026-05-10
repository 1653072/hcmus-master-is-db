import { apiClient } from './client';

export const recommendationsApi = {
  similarBooks: async (id: string) => {
    const { data } = await apiClient.get(`/books/${id}/similar`);
    return data?.data || data;
  },
  seriesBooks: async (id: string) => {
    const { data } = await apiClient.get(`/books/${id}/series`);
    return data?.data || data;
  },
  getBestSellers: async () => {
    const { data } = await apiClient.get('/best-sellers');
    return data?.data || data;
  },
  getTopDailyViewed: async () => {
    const { data } = await apiClient.get('/most-viewed/daily');
    return data?.data;
  },
  getTopMostViewed30Days: async () => {
    const { data } = await apiClient.get('/most-viewed/30days');
    return data?.data;
  },
};
