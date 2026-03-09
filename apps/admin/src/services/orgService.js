import api from '@/utils/api';

const BASE = '/api/super-admin/organizations';

export const getOrganizations = async (params) => {
  const { data } = await api.get(BASE, { params });
  return data.data;
};

export const getOrganization = async (id) => {
  const { data } = await api.get(`${BASE}/${id}`);
  return data.data;
};

export const updateOrganization = async ({ id, ...body }) => {
  const { data } = await api.patch(`${BASE}/${id}`, body);
  return data.data;
};

export const suspendOrganization = async (id) => {
  const { data } = await api.post(`${BASE}/${id}/suspend`);
  return data.data;
};

export const activateOrganization = async (id) => {
  const { data } = await api.post(`${BASE}/${id}/activate`);
  return data.data;
};

export const grantPlan = async ({ id, ...body }) => {
  const { data } = await api.post(`${BASE}/${id}/grant-plan`, body);
  return data.data;
};

export const revokeOverride = async ({ id, ...body }) => {
  const { data } = await api.post(`${BASE}/${id}/revoke-override`, body);
  return data.data;
};
