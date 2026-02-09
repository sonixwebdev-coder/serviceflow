import API from '../utils/api';

// ============== Website CRUD ==============

export const fetchWebsite = async () => {
  const response = await API.get('/website');
  return response.data?.data ?? null;
};

export const createWebsite = async (payload) => {
  const response = await API.post('/website', payload);
  return response.data?.data || response.data;
};

export const updateWebsite = async (websiteId, payload) => {
  const response = await API.patch(`/website/${websiteId}`, payload);
  return response.data?.data || response.data;
};

export const deleteWebsite = async (websiteId) => {
  const response = await API.delete(`/website/${websiteId}`);
  return response.data?.data || response.data;
};

export const checkSubdomainAvailability = async (subdomain) => {
  const response = await API.get('/website/check-subdomain', { params: { subdomain } });
  return response.data?.data || response.data;
};

export const publishWebsite = async (websiteId, isPublished) => {
  const response = await API.post(`/website/${websiteId}/publish`, { isPublished });
  return response.data?.data || response.data;
};

export const verifyDomain = async (websiteId, domain) => {
  const response = await API.post(`/website/${websiteId}/verify-domain`, { domain });
  return response.data?.data || response.data;
};

// ============== CRM Data ==============

export const fetchCrmData = async (dataType) => {
  const response = await API.get(`/website/crm-data/${dataType}`);
  return response.data?.data || response.data;
};

// ============== Page CRUD ==============

export const fetchPages = async (websiteId, params = {}) => {
  const response = await API.get(`/website/${websiteId}/pages`, { params });
  return response.data?.data || response.data;
};

export const fetchPageById = async (websiteId, pageId) => {
  const response = await API.get(`/website/${websiteId}/pages/${pageId}`);
  return response.data?.data || response.data;
};

export const createPage = async (websiteId, payload) => {
  const response = await API.post(`/website/${websiteId}/pages`, payload);
  return response.data?.data || response.data;
};

export const updatePage = async (websiteId, pageId, payload) => {
  const response = await API.patch(`/website/${websiteId}/pages/${pageId}`, payload);
  return response.data?.data || response.data;
};

export const deletePage = async (websiteId, pageId) => {
  const response = await API.delete(`/website/${websiteId}/pages/${pageId}`);
  return response.data?.data || response.data;
};

export const reorderPages = async (websiteId, pageIds) => {
  const response = await API.post(`/website/${websiteId}/pages/reorder`, { pageIds });
  return response.data?.data || response.data;
};

// ============== Lead CRUD ==============

export const fetchLeads = async (websiteId, params = {}) => {
  const response = await API.get(`/website/${websiteId}/leads`, { params });
  return response.data?.data || response.data;
};

export const fetchLeadById = async (websiteId, leadId) => {
  const response = await API.get(`/website/${websiteId}/leads/${leadId}`);
  return response.data?.data || response.data;
};

export const updateLead = async (websiteId, leadId, payload) => {
  const response = await API.patch(`/website/${websiteId}/leads/${leadId}`, payload);
  return response.data?.data || response.data;
};

export const deleteLead = async (websiteId, leadId) => {
  const response = await API.delete(`/website/${websiteId}/leads/${leadId}`);
  return response.data?.data || response.data;
};

export const convertLeadToClient = async (websiteId, leadId) => {
  const response = await API.post(`/website/${websiteId}/leads/${leadId}/convert`);
  return response.data?.data || response.data;
};

export default {
  // Website
  fetchWebsite,
  createWebsite,
  updateWebsite,
  deleteWebsite,
  checkSubdomainAvailability,
  publishWebsite,
  verifyDomain,
  // CRM Data
  fetchCrmData,
  // Pages
  fetchPages,
  fetchPageById,
  createPage,
  updatePage,
  deletePage,
  reorderPages,
  // Leads
  fetchLeads,
  fetchLeadById,
  updateLead,
  deleteLead,
  convertLeadToClient,
};
