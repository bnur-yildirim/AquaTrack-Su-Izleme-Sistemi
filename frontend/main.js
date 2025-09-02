// ======================
// AquaTrack Main JavaScript
// ======================

let forecastChart = null;
let lakesData = {};

// Yardımcı fonksiyonlar
function formatNumber(num, decimals = 0) {
    if (num === null || num === undefined || isNaN(num)) return '--';
    if (num > 1000000) return (num / 1000000).toFixed(decimals) + ' km²';
    if (num > 1000) return (num / 1000).toFixed(decimals) + 'k m²';
    return num.toFixed(decimals) + ' m²';
}

function formatDate(dateStr) {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getChangeClass(percent) {
    if (percent > 2) return 'positive';
    if (percent < -2) return 'negative';
    return 'neutral';
}

// API çağrıları
const API_BASE_URL = 'http://127.0.0.1:5000'; // Geliştirme için sabit

async function fetchLakes() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/lakes`);
        if (!response.ok) throw new Error('API yanıtı başarısız: ' + response.status);
        const data = await response.json();
        console.log('Fetched lakes data:', data);
        lakesData = data.lakes || {};
        return data;
    } catch (error) {
        console.error('Lakes fetch error:', error);
        alert('Göl verileri yüklenemedi. Lütfen sunucuyu kontrol edin ve sayfayı yenileyin.');
        return null;
    }
}

async function fetchForecast(lakeId) {
    try {
        console.log(`Fetching forecast for lake: ${lakeId}`);
        const response = await fetch(`${API_BASE_URL}/api/forecast?lake_id=${lakeId}`);
        if (!response.ok) throw new Error('API yanıtı başarısız: ' + response.status);
        const data = await response.json();
        console.log(`Forecast response for ${lakeId}:`, data);
        return data;
    } catch (error) {
        console.error(`Forecast fetch error for ${lakeId}:`, error);
        return null;
    }
}

async function fetchQuality(lakeId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/quality/forecast?lake_id=${lakeId}`);
        if (!response.ok) throw new Error('API yanıtı başarısız: ' + response.status);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Quality fetch error for ${lakeId}:`, error);
        return null;
    }
}

async function fetchStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/status`);
        if (!response.ok) throw new Error('API yanıtı başarısız: ' + response.status);
        const data = await response.json();
        console.log('Status:', data);
        return data;
    } catch (error) {
        console.error('Status fetch error:', error);
        return null;
    }
}

// Göl kartları oluştur
function createLakeCard(lakeKey, lakeInfo) {
    const card = document.createElement('div');
    card.className = 'lake-card';
    card.innerHTML = `
        <div class="lake-header">
            <h3>${lakeInfo.name || 'Bilinmeyen Göl'}</h3>
            <span class="lake-status unknown">Yükleniyor...</span>
        </div>
        <div class="lake-stats">
            <div class="stat">
                <span class="label">Güncel Alan:</span>
                <span class="value" id="area-${lakeKey}">--</span>
            </div>
            <div class="stat">
                <span class="label">3 Ay Tahmini:</span>
                <span class="value" id="prediction-${lakeKey}">--</span>
            </div>
            <div class="stat">
                <span class="label">Değişim:</span>
                <span class="value" id="change-${lakeKey}">--</span>
            </div>
        </div>
        <div class="lake-actions">
            <button onclick="selectLakeForForecast('${lakeKey}')">Detaylı Tahmin</button>
        </div>
    `;
    return card;
}

// Göl kartlarını güncelle
async function updateLakeCards(forecasts = {}) {
    const lakesGrid = document.getElementById('lakes-grid');
    if (!lakesGrid) {
        console.error('lakes-grid elemanı bulunamadı');
        return;
    }

    for (const [lakeKey, lakeInfo] of Object.entries(lakesData)) {
        const forecast = forecasts[lakeKey] || (await fetchForecast(lakeKey));
        if (forecast) {
            const actualValues = (forecast.actual || []).filter(v => v !== null && v !== undefined);
            const currentArea = actualValues.length > 0 ? actualValues[actualValues.length - 1] : null;
            const prediction3m = (forecast.predictions_3months || []).length > 0 ? forecast.predictions_3months[0] : null;
            const changePercent = forecast.change_percent || 0;

            const areaEl = document.getElementById(`area-${lakeKey}`);
            const predictionEl = document.getElementById(`prediction-${lakeKey}`);
            const changeEl = document.getElementById(`change-${lakeKey}`);
            const statusEl = document.querySelector(`#lakes-grid .lake-card:has(#area-${lakeKey}) .lake-status`);

            if (areaEl) areaEl.textContent = formatNumber(currentArea);
            if (predictionEl) predictionEl.textContent = formatNumber(prediction3m);
            if (changeEl) {
                changeEl.textContent = `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%`;
                changeEl.className = `value ${getChangeClass(changePercent)}`;
            }
            if (statusEl) {
                statusEl.textContent = changePercent < -10 ? 'Risk' : changePercent < -5 ? 'Dikkat' : 'Normal';
                statusEl.className = `lake-status ${changePercent < -10 ? 'warning' : changePercent < -5 ? 'caution' : 'normal'}`;
            }
        } else {
            console.warn(`Forecast data not available for lake: ${lakeKey}`);
        }
    }
}

// Tahmin grafiğini oluştur
function createForecastChart(data) {
    const ctx = document.getElementById('forecastChart')?.getContext('2d');
    if (!ctx) {
        console.error('forecastChart elemanı bulunamadı');
        return;
    }

    if (forecastChart) forecastChart.destroy();

    const years = data.years || [];
    const actual = data.actual || [];
    const predicted = data.predicted || [];

    const actualKm2 = actual.map(val => (val !== null && val !== undefined ? val / 1000000 : null));
    const predictedKm2 = predicted.map(val => (val !== null && val !== undefined ? val / 1000000 : null));

    forecastChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: years,
            datasets: [
                {
                    label: 'Gerçek Değerler',
                    data: actualKm2,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.1,
                    spanGaps: false
                },
                {
                    label: 'Tahmin Değerleri',
                    data: predictedKm2,
                    borderColor: '#dc2626',
                    backgroundColor: 'rgba(220, 38, 38, 0.1)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.1,
                    spanGaps: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { x: { title: { display: true, text: 'Yıl' } }, y: { title: { display: true, text: 'Su Alanı (km²)' }, beginAtZero: false } },
            plugins: { legend: { position: 'top' }, title: { display: true, text: `${data.lake_name} - Su Alanı Trend ve Tahminleri` } }
        }
    });
}

// Tahmin panelini güncelle
async function updateForecastPanel(lakeKey) {
    const statusEl = document.getElementById('forecast-status');
    if (statusEl) statusEl.textContent = 'Yükleniyor...';

    const forecast = await fetchForecast(lakeKey);
    if (!forecast) {
        if (statusEl) statusEl.textContent = 'Veri yüklenemedi';
        console.error(`No forecast data for lake: ${lakeKey}`);
        return;
    }

    document.getElementById('forecast-title').textContent = `${forecast.lake_name} - 3 Aylık Tahmin`;
    if (statusEl) statusEl.textContent = `✓ ${forecast.data_points || 0} veri noktası`;
    document.getElementById('forecast-last-update').textContent = formatDate(forecast.last_update);
    document.getElementById('forecast-datapoints').textContent = forecast.data_points || 0;

    const predictions = forecast.predictions_3months || [];
    ['pred-1m', 'pred-2m', 'pred-3m'].forEach((id, i) => {
        const el = document.getElementById(id);
        if (el) el.textContent = formatNumber(predictions[i]);
    });

    createForecastChart(forecast);
}

// Su kalitesi panelini güncelle
async function updateQualityPanel(lakeKey) {
    const statusEl = document.getElementById('quality-status');
    if (statusEl) statusEl.textContent = 'Yükleniyor...';

    const quality = await fetchQuality(lakeKey);
    if (!quality) {
        if (statusEl) statusEl.textContent = 'Veri yüklenemedi';
        console.error(`No quality data for lake: ${lakeKey}`);
        return;
    }

    document.getElementById('quality-title').textContent = `${quality.lake_name} - Su Kalitesi`;
    if (statusEl) statusEl.textContent = '⚠️ Örnek veriler';

    const current = quality.current || {};
    document.getElementById('q-ph').textContent = current.pH || '--';
    document.getElementById('q-turb').textContent = current.Turbidite || '--';
    document.getElementById('q-do').textContent = current['Çözünmüş Oksijen'] || '--';

    const forecasts = quality.next_3months || [];
    ['q1', 'q2', 'q3'].forEach((prefix, i) => {
        const forecast = forecasts[i] || {};
        document.getElementById(`${prefix}-ph`).textContent = forecast.pH || '--';
        document.getElementById(`${prefix}-turb`).textContent = forecast.Turbidite || '--';
        document.getElementById(`${prefix}-do`).textContent = forecast['Çözünmüş Oksijen'] || '--';
    });
}

// Select box'ları doldur
function populateSelects() {
    const forecastSelect = document.getElementById('lake-select');
    const qualitySelect = document.getElementById('quality-lake-select');

    [forecastSelect, qualitySelect].forEach(select => {
        if (!select) {
            console.error('Select elemanı bulunamadı:', select);
            return;
        }
        select.innerHTML = '';
        for (const [key, info] of Object.entries(lakesData)) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = info.name;
            select.appendChild(option);
        }
    });
}

// Event handlers
function selectLakeForForecast(lakeKey) {
    const select = document.getElementById('lake-select');
    if (select) {
        select.value = lakeKey;
        updateForecastPanel(lakeKey);
    } else {
        console.error('lake-select elemanı bulunamadı');
    }
}

// Başlangıç istatistikleri güncelle
async function updateHeroStats() {
    const status = await fetchStatus();
    if (status) {
        document.getElementById('total-lakes').textContent = Object.keys(lakesData).length || '7';
        document.getElementById('last-update').textContent = formatDate(status.timestamp);
    } else {
        console.warn('Status verisi alınamadı');
    }

    const activeAlertsEl = document.getElementById('active-alerts');
    if (activeAlertsEl) {
        let alertCount = 0;
        const forecastPromises = Object.keys(lakesData).map(key => fetchForecast(key));
        const forecasts = await Promise.all(forecastPromises);
        forecasts.forEach((forecast, i) => {
            if (forecast && forecast.change_percent < -10) alertCount++;
        });
        activeAlertsEl.textContent = alertCount;
    } else {
        console.error('active-alerts elemanı bulunamadı');
    }
}

// Sayfa yüklendiğinde çalışacak ana fonksiyon
async function initializeApp() {
    console.log('Initializing AquaTrack app...');

    const lakesResponse = await fetchLakes();
    if (!lakesResponse) return;

    console.log('Lakes loaded:', lakesData);

    const lakesGrid = document.getElementById('lakes-grid');
    if (lakesGrid) {
        lakesGrid.innerHTML = '';
        for (const [lakeKey, lakeInfo] of Object.entries(lakesData)) {
            lakesGrid.appendChild(createLakeCard(lakeKey, lakeInfo));
        }
        const forecastPromises = Object.keys(lakesData).map(key => fetchForecast(key));
        const forecasts = await Promise.all(forecastPromises);
        const forecastMap = forecasts.reduce((acc, data, i) => {
            if (data) acc[Object.keys(lakesData)[i]] = data;
            return acc;
        }, {});
        await updateLakeCards(forecastMap);
    } else {
        console.error('lakes-grid elemanı bulunamadı');
    }

    populateSelects();
    await updateHeroStats();

    const firstLakeKey = Object.keys(lakesData)[0];
    if (firstLakeKey) {
        await updateForecastPanel(firstLakeKey);
        await updateQualityPanel(firstLakeKey);
    } else {
        console.warn('İlk göl anahtarı bulunamadı');
    }

    const forecastSelect = document.getElementById('lake-select');
    const qualitySelect = document.getElementById('quality-lake-select');

    if (forecastSelect) {
        forecastSelect.addEventListener('change', (e) => updateForecastPanel(e.target.value));
    } else {
        console.error('lake-select elemanı bulunamadı');
    }
    if (qualitySelect) {
        qualitySelect.addEventListener('change', (e) => updateQualityPanel(e.target.value));
    } else {
        console.error('quality-lake-select elemanı bulunamadı');
    }

    console.log('AquaTrack app initialized successfully!');
}

document.addEventListener('DOMContentLoaded', initializeApp);