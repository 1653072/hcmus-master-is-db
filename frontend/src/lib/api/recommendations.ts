import { apiClient } from './client';

export const recommendationsApi = {
  similarBooks: async (id: string) => {
    const { data } = await apiClient.get(`/books/${id}/similar`);
    return data;
  },
  seriesBooks: async (id: string) => {
    const { data } = await apiClient.get(`/books/${id}/series`);
    return data;
  },
};
