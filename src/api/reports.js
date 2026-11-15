import { apiClient } from './client';

export const reportsApi = {
  getReport: (reportType, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/reports/${reportType}${query ? `?${query}` : ''}`);
  },
  downloadCsv: (reportType, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.download(
      `/reports/${reportType}/export/csv${query ? `?${query}` : ''}`,
      `finai_${reportType}_report.csv`
    );
  },
  downloadPdf: (reportType, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.download(
      `/reports/${reportType}/export/pdf${query ? `?${query}` : ''}`,
      `finai_${reportType}_report.pdf`
    );
  },
};
