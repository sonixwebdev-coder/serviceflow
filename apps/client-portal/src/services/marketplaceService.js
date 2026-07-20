import axios from 'axios';
import { runtimeConfig } from '../config/runtime';

const API_BASE_URL = runtimeConfig.apiUrl;

const publicApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

export const marketplaceService = {
  async listOrganizations({ search, sector, city, page = 1, limit = 12 } = {}) {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (sector) params.append('sector', sector);
    if (city) params.append('city', city);
    params.append('page', page);
    params.append('limit', limit);

    const response = await publicApi.get(`/portal/public/marketplace?${params.toString()}`);
    return response.data;
  },

  async getOrganization(slug) {
    const response = await publicApi.get(`/portal/public/marketplace/${slug}`);
    return response.data;
  },

  async getStats() {
    const response = await publicApi.get('/portal/public/marketplace/stats');
    return response.data;
  },

  async getFilters() {
    const response = await publicApi.get('/portal/public/marketplace/filters');
    return response.data;
  },
};
