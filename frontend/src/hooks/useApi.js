/**
 * API çağrıları için custom React hook
 * Loading, error ve data state'lerini yönetir
 */

import { useState, useEffect, useCallback } from 'react';
import apiService from '../services/apiService';

/**
 * API çağrısı için generic hook
 */
export function useApi(apiCall, dependencies = []) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await apiCall();
            setData(result);
        } catch (err) {
            setError(err.message);
            console.error('API Error:', err);
        } finally {
            setLoading(false);
        }
    }, dependencies);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { data, loading, error, refetch: fetchData };
}

/**
 * Göl listesi için hook
 */
export function useLakes() {
    return useApi(() => apiService.getLakes());
}

/**
 * Göl tahmin verileri için hook
 */
export function useForecastData(lakeId) {
    return useApi(
        () => lakeId ? apiService.getForecastData(lakeId) : Promise.resolve(null),
        [lakeId]
    );
}

/**
 * Zaman serisi verileri için hook
 */
export function useTimeseriesData(lakeId, limit = 1000) {
    return useApi(
        () => lakeId ? apiService.getTimeseriesData(lakeId, limit) : Promise.resolve(null),
        [lakeId, limit]
    );
}

/**
 * Gelecek tahminleri için hook
 */
export function useFuturePredictions(lakeId) {
    return useApi(
        () => lakeId ? apiService.getFuturePredictions(lakeId) : Promise.resolve(null),
        [lakeId]
    );
}

/**
 * Normalize edilmiş metrikler için hook
 */
export function useNormalizedMetrics() {
    return useApi(() => apiService.getNormalizedMetrics());
}

/**
 * Su kalitesi verileri için hook
 */
export function useWaterQuality(lakeId) {
    return useApi(
        () => lakeId ? apiService.getWaterQuality(lakeId) : Promise.resolve(null),
        [lakeId]
    );
}

/**
 * Sistem durumu için hook
 */
export function useSystemStatus() {
    return useApi(() => apiService.getSystemStatus());
}
