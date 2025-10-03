/**
 * Profesyonel API Servis Sınıfı
 * Tüm backend API çağrılarını merkezi olarak yönetir
 */

class ApiService {
    constructor() {
        this.baseURL = 'http://localhost:5000';
        this.timeout = 10000; // 10 saniye timeout
    }

    /**
     * HTTP isteği gönder
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            timeout: this.timeout,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);
            
            const response = await fetch(url, {
                ...config,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('İstek zaman aşımına uğradı');
            }
            throw error;
        }
    }

    /**
     * Göl listesini getir
     */
    async getLakes() {
        return this.request('/api/lakes');
    }

    /**
     * Belirli bir göl için tahmin verilerini getir
     */
    async getForecastData(lakeId) {
        return this.request(`/api/forecast?lake_id=${lakeId}`);
    }

    /**
     * Göl için zaman serisi verilerini getir
     */
    async getTimeseriesData(lakeId, limit = 1000) {
        return this.request(`/api/forecast/timeseries?lake_id=${lakeId}&limit=${limit}`);
    }

    /**
     * Gelecek tahminlerini getir
     */
    async getFuturePredictions(lakeId) {
        return this.request(`/api/forecast/predictions?lake_id=${lakeId}`);
    }

    /**
     * Normalize edilmiş model metriklerini getir
     */
    async getNormalizedMetrics() {
        return this.request('/api/forecast/metrics/normalized');
    }

    /**
     * Su kalitesi verilerini getir
     */
    async getWaterQuality(lakeId) {
        return this.request(`/api/quality?lake_id=${lakeId}`);
    }

    /**
     * Sistem durumunu kontrol et
     */
    async getSystemStatus() {
        return this.request('/api/system/status');
    }

    /**
     * Debug bilgilerini getir (sadece development)
     */
    async getDebugInfo(lakeId) {
        if (process.env.NODE_ENV === 'development') {
            return this.request(`/api/forecast/debug?lake_id=${lakeId}`);
        }
        throw new Error('Debug endpoint sadece development modunda kullanılabilir');
    }
}

// Singleton instance
const apiService = new ApiService();

export default apiService;
