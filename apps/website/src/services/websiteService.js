import axios from 'axios';
import { runtimeConfig } from '../config/runtime';

const API_BASE = runtimeConfig.apiUrl;

const api = axios.create({
  baseURL: API_BASE,
});

export const websiteService = {
  /**
   * Get website configuration by subdomain
   */
  async getWebsite(subdomain) {
    const response = await api.get(`/sites/${subdomain}`);
    return response.data.data;
  },

  /**
   * Get page content by slug
   */
  async getPage(subdomain, slug = 'home') {
    const response = await api.get(`/sites/${subdomain}/page/${slug}`);
    return response.data.data;
  },

  /**
   * Submit lead/contact form
   */
  async submitLead(subdomain, leadData) {
    const response = await api.post(`/sites/${subdomain}/lead`, leadData);
    return response.data.data;
  },

  /**
   * Submit a review/testimonial
   */
  async submitReview(subdomain, reviewData) {
    const response = await api.post(`/sites/${subdomain}/review`, reviewData);
    return response.data;
  },

  /**
   * Get approved reviews for public display
   */
  async getApprovedReviews(subdomain) {
    const response = await api.get(`/sites/${subdomain}/reviews`);
    return response.data.data;
  },

  /**
   * Get CRM data for dynamic blocks
   */
  async getCrmData(subdomain, dataType) {
    const response = await api.get(`/sites/${subdomain}/crm/${dataType}`);
    return response.data.data;
  },

  // ─── Booking APIs ──────────────────────────────────────

  /**
   * Get organization info for booking (locations, sector config)
   */
  async getOrganization(slug) {
    const response = await api.get(`/portal/public/${slug}`);
    return response.data;
  },

  /**
   * Get available dates for booking
   */
  async getAvailableDates(slug) {
    const response = await api.get(`/portal/public/${slug}/dates`);
    return response.data;
  },

  /**
   * Get available time slots for a date
   */
  async getAvailableSlots(slug, date, locationId = null) {
    const params = { date };
    if (locationId) {
      params.locationId = locationId;
    }
    const response = await api.get(`/portal/public/${slug}/slots`, { params });
    return response.data;
  },

  /**
   * Create a booking
   */
  async createBooking(slug, data) {
    const response = await api.post(`/portal/public/${slug}/book`, data);
    return response.data;
  },
};

export default websiteService;
