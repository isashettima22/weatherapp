/**
 * Aether Atmospheric Weather Matrix - Core Frontend Client
 * Handles real-time communication with the backend API (/api/weather & /api/forecast)
 */

(function () {
  'use strict';

  // Application State
  const state = {
    unit: 'C', // 'C' or 'F'
    currentCity: 'New York',
    currentWeather: null,
    currentForecast: null,
    isLoading: false,
    savedCities: ['New York', 'Los Angeles', 'Tokyo', 'London', 'Paris'],
    otherCitiesList: ['London', 'Tokyo', 'Paris', 'Dubai']
  };

  // DOM Elements Cache
  const elements = {
    // Search
    searchInput: document.getElementById('citySearchInput') || document.querySelector('header input[type="text"]'),
    mobileSearchBtn: document.getElementById('mobileSearchBtn'),
    geoLocateBtn: document.getElementById('geoLocateBtn'),
    searchForm: document.getElementById('searchForm'),
    
    // Header Telemetry
    headerClock: document.getElementById('headerClock'),
    headerStatusText: document.getElementById('headerStatusText'),
    savedCitiesRow: document.getElementById('savedCitiesRow'),
    
    // Unit Buttons
    btnCelsius: document.getElementById('btnCelsius'),
    btnFahrenheit: document.getElementById('btnFahrenheit'),
    
    // Hero Weather Display
    heroCityName: document.getElementById('heroCityName'),
    heroLiveBadge: document.getElementById('heroLiveBadge'),
    heroConditionText: document.getElementById('heroConditionText'),
    heroUpdateTime: document.getElementById('heroUpdateTime'),
    heroTemp: document.getElementById('heroTemp'),
    heroTempUnit: document.getElementById('heroTempUnit'),
    heroTempHigh: document.getElementById('heroTempHigh'),
    heroTempLow: document.getElementById('heroTempLow'),
    heroSummaryText: document.getElementById('heroSummaryText'),
    heroIllustration: document.getElementById('heroIllustration'),
    
    // Ribbon Metrics
    metricPrecipitation: document.getElementById('metricPrecipitation'),
    metricHumidity: document.getElementById('metricHumidity'),
    metricWind: document.getElementById('metricWind'),
    metricUV: document.getElementById('metricUV'),
    metricPressure: document.getElementById('metricPressure'),
    metricVisibility: document.getElementById('metricVisibility'),
    
    // Solar & AQI
    aqiValue: document.getElementById('aqiValue'),
    aqiLabel: document.getElementById('aqiLabel'),
    aqiProgress: document.getElementById('aqiProgress'),
    solarDaylight: document.getElementById('solarDaylight'),
    sunriseTime: document.getElementById('sunriseTime'),
    sunsetTime: document.getElementById('sunsetTime'),
    sunPositionMarker: document.getElementById('sunPositionMarker'),
    
    // Containers
    hourlyForecastContainer: document.getElementById('hourlyForecastContainer'),
    sevenDayForecastContainer: document.getElementById('sevenDayForecastContainer'),
    otherCitiesContainer: document.getElementById('otherCitiesContainer'),
    
    // Toast Notification
    toast: document.getElementById('appToast'),
    toastMessage: document.getElementById('toastMessage'),
    loadingOverlay: document.getElementById('loadingOverlay')
  };

  // Utility Functions
  function convertTemp(celsius) {
    if (celsius === undefined || celsius === null) return '--';
    if (state.unit === 'F') {
      return Math.round((celsius * 9) / 5 + 32);
    }
    return Math.round(celsius);
  }

  function formatTemp(celsius, includeDegree = true) {
    const val = convertTemp(celsius);
    if (val === '--') return '--';
    return includeDegree ? `${val}°` : `${val}`;
  }

  function formatWind(speedMetersSec) {
    if (!speedMetersSec && speedMetersSec !== 0) return '--';
    if (state.unit === 'F') {
      return `${Math.round(speedMetersSec * 2.237)} mph`;
    }
    return `${Math.round(speedMetersSec * 3.6)} km/h`;
  }

  function formatVisibility(meters) {
    if (!meters && meters !== 0) return '--';
    if (state.unit === 'F') {
      return `${(meters / 1609.34).toFixed(1)} mi`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  }

  function getWindDirection(deg) {
    if (deg === undefined) return 'VAR';
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return directions[Math.round(deg / 22.5) % 16];
  }

  function showToast(message, type = 'info') {
    if (!elements.toast) return;
    elements.toastMessage.textContent = message;
    elements.toast.classList.remove('opacity-0', 'translate-y-4', 'pointer-events-none');
    elements.toast.classList.add('opacity-100', 'translate-y-0');

    if (type === 'error') {
      elements.toast.classList.add('border-error/50', 'bg-error-container/90', 'text-on-error-container');
    } else {
      elements.toast.classList.remove('border-error/50', 'bg-error-container/90', 'text-on-error-container');
    }

    clearTimeout(elements.toast._timeout);
    elements.toast._timeout = setTimeout(() => {
      elements.toast.classList.add('opacity-0', 'translate-y-4', 'pointer-events-none');
      elements.toast.classList.remove('opacity-100', 'translate-y-0');
    }, 4000);
  }

  function setLoading(loading) {
    state.isLoading = loading;
    if (elements.loadingOverlay) {
      if (loading) {
        elements.loadingOverlay.classList.remove('hidden', 'opacity-0');
        elements.loadingOverlay.classList.add('opacity-100');
      } else {
        elements.loadingOverlay.classList.add('opacity-0');
        setTimeout(() => elements.loadingOverlay.classList.add('hidden'), 300);
      }
    }
    if (elements.heroLiveBadge) {
      elements.heroLiveBadge.textContent = loading ? 'SYNCING...' : 'LIVE';
      if (loading) {
        elements.heroLiveBadge.classList.add('animate-pulse');
      } else {
        elements.heroLiveBadge.classList.remove('animate-pulse');
      }
    }
  }

  // Get Material Symbol for OpenWeather Condition
  function getWeatherIcon(condition, iconCode = '') {
    const isNight = iconCode.includes('n');
    const cond = (condition || '').toLowerCase();

    if (cond.includes('thunder')) return 'thunderstorm';
    if (cond.includes('drizzle')) return 'grain';
    if (cond.includes('rain')) return 'rainy';
    if (cond.includes('snow')) return 'weather_snowy';
    if (cond.includes('clear')) return isNight ? 'bedtime' : 'wb_sunny';
    if (cond.includes('cloud')) {
      if (cond.includes('few') || cond.includes('scattered')) {
        return isNight ? 'nights_stay' : 'partly_cloudy_day';
      }
      return 'cloud';
    }
    if (cond.includes('mist') || cond.includes('fog') || cond.includes('haze')) return 'foggy';
    return 'wb_cloudy';
  }

  // Render Hero Weather Illustration Vector
  function updateHeroIllustration(weather) {
    if (!elements.heroIllustration) return;
    const cond = (weather.weather?.[0]?.main || '').toLowerCase();
    const isNight = (weather.weather?.[0]?.icon || '').includes('n');

    let sunOrMoonSvg = '';
    let boltSvg = '';
    let rainSvg = '';

    if (isNight) {
      sunOrMoonSvg = `<circle cx="132" cy="74" fill="url(#moonGrad)" filter="url(#glow)" r="32"></circle>`;
    } else {
      sunOrMoonSvg = `<circle cx="132" cy="74" fill="url(#sunGrad)" filter="url(#glow)" r="34"></circle>`;
    }

    if (cond.includes('thunder')) {
      boltSvg = `<path d="M106 112 L92 142 H108 L98 174 L126 134 H110 L120 112 Z" fill="url(#boltGrad)" filter="url(#glow)"></path>`;
    }

    if (cond.includes('rain') || cond.includes('drizzle') || cond.includes('thunder')) {
      rainSvg = `
        <circle cx="72" cy="146" fill="#38BDF8" opacity="0.85" r="3.2"></circle>
        <circle cx="86" cy="158" fill="#38BDF8" opacity="0.6" r="3"></circle>
        <circle cx="138" cy="150" fill="#38BDF8" opacity="0.9" r="3.2"></circle>
        <circle cx="110" cy="162" fill="#38BDF8" opacity="0.75" r="3"></circle>
      `;
    } else if (cond.includes('snow')) {
      rainSvg = `
        <circle cx="72" cy="146" fill="#E0F2FE" opacity="0.9" r="4"></circle>
        <circle cx="96" cy="158" fill="#E0F2FE" opacity="0.7" r="3.5"></circle>
        <circle cx="130" cy="152" fill="#E0F2FE" opacity="0.85" r="4"></circle>
      `;
    }

    elements.heroIllustration.innerHTML = `
      <svg class="w-full h-full relative z-10 drop-shadow-[0_20px_25px_rgba(0,0,0,0.6)]" fill="none" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="sunGrad" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stop-color="#FFDD80"></stop>
            <stop offset="100%" stop-color="#EE9800"></stop>
          </linearGradient>
          <linearGradient id="moonGrad" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stop-color="#E2E8F0"></stop>
            <stop offset="100%" stop-color="#94A3B8"></stop>
          </linearGradient>
          <linearGradient id="cloudGrad" x1="0%" x2="0%" y1="0%" y2="100%">
            <stop offset="0%" stop-color="#FFFFFF"></stop>
            <stop offset="70%" stop-color="#DAE2FD"></stop>
            <stop offset="100%" stop-color="#87929A"></stop>
          </linearGradient>
          <linearGradient id="boltGrad" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stop-color="#FFF066"></stop>
            <stop offset="100%" stop-color="#FFB95F"></stop>
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur result="coloredBlur" stdDeviation="3.5"></feGaussianBlur>
            <feMerge>
              <feMergeNode in="coloredBlur"></feMergeNode>
              <feMergeNode in="SourceGraphic"></feMergeNode>
            </feMerge>
          </filter>
        </defs>
        ${sunOrMoonSvg}
        <path d="M68 126 C52 126 40 114 40 98 C40 84 50 72 64 70 C68 52 84 40 104 40 C124 40 140 54 144 72 C156 74 166 84 166 96 C166 112 152 126 134 126 Z" fill="url(#cloudGrad)"></path>
        ${boltSvg}
        ${rainSvg}
      </svg>
    `;
  }

  // Fetch Weather & Forecast from backend
  async function fetchWeatherData(queryParam) {
    try {
      setLoading(true);

      let weatherUrl = '/api/weather?';
      let forecastUrl = '/api/forecast?';

      if (typeof queryParam === 'object' && queryParam.lat && queryParam.lon) {
        const coords = `lat=${encodeURIComponent(queryParam.lat)}&lon=${encodeURIComponent(queryParam.lon)}`;
        weatherUrl += coords;
        forecastUrl += coords;
      } else {
        const city = typeof queryParam === 'string' ? queryParam : state.currentCity;
        const q = `city=${encodeURIComponent(city)}`;
        weatherUrl += q;
        forecastUrl += q;
      }

      const [weatherRes, forecastRes] = await Promise.all([
        fetch(weatherUrl),
        fetch(forecastUrl)
      ]);

      const weatherData = await weatherRes.json();
      const forecastData = await forecastRes.json();

      if (!weatherRes.ok) {
        throw new Error(weatherData.message || 'Failed to fetch weather data');
      }

      state.currentWeather = weatherData;
      state.currentForecast = forecastRes.ok ? forecastData : null;
      state.currentCity = weatherData.name;

      renderDashboard();
      showToast(`Atmospheric telemetry synced for ${weatherData.name}, ${weatherData.sys?.country || ''}`, 'success');

      // Update URL hash without reload
      if (elements.searchInput) {
        elements.searchInput.value = '';
        elements.searchInput.placeholder = `${weatherData.name}, ${weatherData.sys?.country || ''}`;
      }
    } catch (err) {
      console.error('Fetch error:', err);
      showToast(err.message || 'Error communicating with weather server', 'error');
    } finally {
      setLoading(false);
    }
  }

  // Render All Dashboard Components
  function renderDashboard() {
    const w = state.currentWeather;
    if (!w) return;

    // 1. Hero Card
    if (elements.heroCityName) {
      elements.heroCityName.textContent = `${w.name}, ${w.sys?.country || ''}`;
    }

    const mainCond = w.weather?.[0]?.main || 'Clear';
    const descCond = w.weather?.[0]?.description || 'Clear Sky';
    const capitalizedDesc = descCond.charAt(0).toUpperCase() + descCond.slice(1);

    if (elements.heroConditionText) {
      elements.heroConditionText.textContent = capitalizedDesc;
    }

    if (elements.heroUpdateTime) {
      const now = new Date();
      elements.heroUpdateTime.textContent = `Updated ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    if (elements.heroTemp) {
      elements.heroTemp.textContent = formatTemp(w.main?.temp, false);
    }
    if (elements.heroTempUnit) {
      elements.heroTempUnit.textContent = `°${state.unit}`;
    }

    if (elements.heroTempHigh) {
      elements.heroTempHigh.innerHTML = `<span class="material-symbols-outlined text-[14px]">arrow_upward</span> H: ${formatTemp(w.main?.temp_max)}`;
    }
    if (elements.heroTempLow) {
      elements.heroTempLow.innerHTML = `<span class="material-symbols-outlined text-[14px]">arrow_downward</span> L: ${formatTemp(w.main?.temp_min)}`;
    }

    // Dynamic Summary
    if (elements.heroSummaryText) {
      const windDir = getWindDirection(w.wind?.deg);
      const windSpd = formatWind(w.wind?.speed);
      elements.heroSummaryText.textContent = `${capitalizedDesc} observed. Winds from ${windDir} at ${windSpd}. Humidity is at ${w.main?.humidity}%, with atmospheric pressure at ${w.main?.pressure} hPa.`;
    }

    // Dynamic Illustration
    updateHeroIllustration(w);

    // 2. Metrics Ribbon
    if (elements.metricPrecipitation) {
      const pop = state.currentForecast?.list?.[0]?.pop;
      const precipPercent = pop !== undefined ? Math.round(pop * 100) : (w.clouds?.all || 0);
      elements.metricPrecipitation.textContent = `${precipPercent}%`;
    }
    if (elements.metricHumidity) {
      elements.metricHumidity.textContent = `${w.main?.humidity || 0}%`;
    }
    if (elements.metricWind) {
      elements.metricWind.textContent = formatWind(w.wind?.speed);
    }
    if (elements.metricUV) {
      // Estimated UV Index or Feels Like
      elements.metricUV.textContent = formatTemp(w.main?.feels_like);
    }
    if (elements.metricPressure) {
      elements.metricPressure.textContent = `${w.main?.pressure || 1013} hPa`;
    }
    if (elements.metricVisibility) {
      elements.metricVisibility.textContent = formatVisibility(w.visibility);
    }

    // 3. Solar Cycle & Ephemeris
    if (w.sys?.sunrise && w.sys?.sunset) {
      const timezoneOffset = w.timezone || 0; // seconds
      const formatLocalTime = (unixSeconds) => {
        const utcDate = new Date((unixSeconds + timezoneOffset) * 1000);
        return utcDate.toUTCString().slice(17, 22);
      };

      const sunriseStr = formatLocalTime(w.sys.sunrise);
      const sunsetStr = formatLocalTime(w.sys.sunset);

      if (elements.sunriseTime) elements.sunriseTime.textContent = `${sunriseStr} UTC${timezoneOffset >= 0 ? '+' : ''}${timezoneOffset / 3600}`;
      if (elements.sunsetTime) elements.sunsetTime.textContent = `${sunsetStr} UTC${timezoneOffset >= 0 ? '+' : ''}${timezoneOffset / 3600}`;

      const daylightSeconds = w.sys.sunset - w.sys.sunrise;
      const hours = Math.floor(daylightSeconds / 3600);
      const mins = Math.floor((daylightSeconds % 3600) / 60);
      if (elements.solarDaylight) elements.solarDaylight.textContent = `${hours}h ${mins}m light`;

      // Position marker along arc
      const nowSec = Math.floor(Date.now() / 1000);
      let progress = (nowSec - w.sys.sunrise) / daylightSeconds;
      progress = Math.max(0.05, Math.min(0.95, progress));
      if (elements.sunPositionMarker) {
        const cx = 15 + progress * 130;
        const cy = 50 - Math.sin(progress * Math.PI) * 35;
        elements.sunPositionMarker.setAttribute('cx', cx);
        elements.sunPositionMarker.setAttribute('cy', cy);
      }
    }

    // 4. Air Quality Score Estimation
    if (elements.aqiValue) {
      const humidity = w.main?.humidity || 50;
      const visibility = (w.visibility || 10000) / 1000;
      const aqiScore = Math.min(100, Math.max(15, Math.round(100 - (visibility * 5) + (humidity * 0.3))));
      elements.aqiValue.textContent = aqiScore;
      if (elements.aqiProgress) elements.aqiProgress.style.width = `${aqiScore}%`;
      if (elements.aqiLabel) {
        elements.aqiLabel.textContent = aqiScore < 50 ? 'Optimal' : aqiScore < 75 ? 'Moderate' : 'Unhealthy';
      }
    }

    // 5. Hourly Forecast
    renderHourlyForecast();

    // 6. 7-Day / Daily Forecast
    renderDailyForecast();

    // 7. Saved Cities Navigation Highlight
    renderSavedCities();
  }

  // Render 24-hour Hourly Forecast Cards
  function renderHourlyForecast() {
    if (!elements.hourlyForecastContainer || !state.currentForecast?.list) return;

    const list = state.currentForecast.list.slice(0, 8); // 8 intervals * 3 hours = 24h
    elements.hourlyForecastContainer.innerHTML = '';

    list.forEach((item, index) => {
      const date = new Date(item.dt * 1000);
      const hourStr = index === 0 ? 'Now' : date.toLocaleTimeString([], { hour: 'numeric', hour12: true });
      const temp = formatTemp(item.main?.temp);
      const icon = getWeatherIcon(item.weather?.[0]?.main, item.weather?.[0]?.icon);
      const popPercent = Math.round((item.pop || 0) * 100);
      const isNow = index === 0;

      const card = document.createElement('div');
      card.className = isNow
        ? 'snap-start min-w-[84px] flex-1 flex flex-col items-center py-space-md px-space-xs rounded-2xl bg-primary-container/15 shadow-[0_0_20px_-2px_rgba(56,189,248,0.25)] text-center group cursor-pointer relative overflow-hidden transition-all'
        : 'snap-start min-w-[84px] flex-1 flex flex-col items-center py-space-md px-space-xs rounded-2xl bg-surface-container-high/60 hover:bg-surface-container-high transition-all text-center group cursor-pointer';

      card.innerHTML = `
        ${isNow ? '<div class="absolute top-1.5 px-2 py-0.2 rounded-full bg-primary-container text-on-primary-container font-label-sm text-[9px] uppercase tracking-wider font-semibold">Now</div>' : ''}
        <span class="font-label-md text-label-md ${isNow ? 'text-primary font-semibold mt-3 mb-1' : 'text-outline group-hover:text-on-surface mb-2'}">${hourStr}</span>
        <div class="w-10 h-10 rounded-xl ${isNow ? 'bg-primary-container/20 text-primary-container' : 'bg-surface-container-highest/60 text-on-surface-variant'} flex items-center justify-center my-1 shadow-inner">
          <span class="material-symbols-outlined text-[22px]">${icon}</span>
        </div>
        <span class="font-title-sm text-title-sm text-on-surface font-bold mt-2">${temp}</span>
        <div class="w-8 h-1 bg-surface-container-highest rounded-full mt-3 overflow-hidden">
          <div class="${isNow ? 'bg-primary-container' : 'bg-primary'} h-full rounded-full" style="width: ${Math.max(10, popPercent)}%"></div>
        </div>
        <span class="font-label-sm text-label-sm text-outline mt-1">${popPercent}%</span>
      `;

      elements.hourlyForecastContainer.appendChild(card);
    });
  }

  // Render Daily Forecast (Grouped by Day)
  function renderDailyForecast() {
    if (!elements.sevenDayForecastContainer || !state.currentForecast?.list) return;

    // Group 3-hour forecasts by day
    const daysMap = {};
    state.currentForecast.list.forEach(item => {
      const dayName = new Date(item.dt * 1000).toLocaleDateString([], { weekday: 'long' });
      if (!daysMap[dayName]) {
        daysMap[dayName] = {
          dayName,
          temps: [],
          conditions: [],
          icons: []
        };
      }
      daysMap[dayName].temps.push(item.main.temp);
      daysMap[dayName].conditions.push(item.weather[0]?.main || 'Clear');
      daysMap[dayName].icons.push(item.weather[0]?.icon || '');
    });

    elements.sevenDayForecastContainer.innerHTML = '';
    const days = Object.values(daysMap).slice(0, 6); // Up to 6 days

    days.forEach((day, idx) => {
      const minTemp = Math.min(...day.temps);
      const maxTemp = Math.max(...day.temps);
      const primaryCond = day.conditions[Math.floor(day.conditions.length / 2)] || 'Clouds';
      const icon = getWeatherIcon(primaryCond, day.icons[0]);

      const row = document.createElement('div');
      row.className = 'py-2.5 flex items-center justify-between hover:bg-surface-container-high/40 px-2 rounded-xl transition-all cursor-pointer';
      row.innerHTML = `
        <span class="font-body-md text-body-md text-on-surface font-medium w-24">${idx === 0 ? 'Today' : day.dayName}</span>
        <div class="flex items-center gap-2 flex-1 justify-center">
          <span class="material-symbols-outlined text-primary-container text-[20px]">${icon}</span>
          <span class="font-label-md text-label-md text-outline hidden sm:inline">${primaryCond}</span>
        </div>
        <div class="flex items-center gap-2 text-right">
          <span class="font-title-sm text-title-sm text-on-surface font-semibold">${formatTemp(maxTemp)}</span>
          <span class="font-body-md text-body-md text-outline">${formatTemp(minTemp)}</span>
        </div>
      `;
      elements.sevenDayForecastContainer.appendChild(row);
    });
  }

  // Render Saved Cities Bar
  function renderSavedCities() {
    if (!elements.savedCitiesRow) return;
    elements.savedCitiesRow.innerHTML = '';

    state.savedCities.forEach(cityName => {
      const isActive = state.currentCity.toLowerCase() === cityName.toLowerCase();
      const chip = document.createElement('button');
      chip.className = `px-space-sm py-0.5 rounded-full ${
        isActive
          ? 'bg-primary-container text-on-primary-container font-semibold shadow-[0_0_12px_rgba(56,189,248,0.3)]'
          : 'bg-surface-container/80 text-on-surface-variant hover:bg-surface-container-high hover:text-primary'
      } font-label-md text-label-md flex items-center gap-1 transition-all shrink-0`;

      chip.innerHTML = `<span>${cityName}</span>`;
      chip.addEventListener('click', (e) => {
        e.preventDefault();
        fetchWeatherData(cityName);
      });
      elements.savedCitiesRow.appendChild(chip);
    });
  }

  // Load "Other Cities" Grid Telemetry
  async function loadOtherCitiesGrid() {
    if (!elements.otherCitiesContainer) return;
    elements.otherCitiesContainer.innerHTML = '';

    for (const city of state.otherCitiesList) {
      try {
        const res = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
        if (!res.ok) continue;
        const data = await res.json();

        const card = document.createElement('div');
        card.className = 'p-space-md rounded-2xl bg-surface-container-high/60 hover:bg-surface-container-high backdrop-blur-md transition-all duration-300 flex items-center justify-between cursor-pointer group shadow-sm hover:scale-[1.02]';
        
        const icon = getWeatherIcon(data.weather?.[0]?.main, data.weather?.[0]?.icon);
        const condName = data.weather?.[0]?.main || 'Clear';

        card.innerHTML = `
          <div class="flex items-center gap-space-sm">
            <div class="w-10 h-10 rounded-xl bg-primary-container/15 flex items-center justify-center text-primary-container group-hover:scale-110 transition-transform">
              <span class="material-symbols-outlined text-[24px]">${icon}</span>
            </div>
            <div class="flex flex-col">
              <span class="font-title-sm text-title-sm text-on-surface group-hover:text-primary transition-colors font-medium">${data.name}</span>
              <span class="font-label-sm text-label-sm text-outline">${condName} • ${data.sys?.country || ''}</span>
            </div>
          </div>
          <div class="flex items-baseline">
            <span class="font-headline-md text-headline-md font-light text-on-surface other-city-temp" data-celsius="${data.main?.temp}">${formatTemp(data.main?.temp, false)}</span>
            <span class="text-sm font-light text-primary">°</span>
          </div>
        `;

        card.addEventListener('click', () => {
          fetchWeatherData(data.name);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        elements.otherCitiesContainer.appendChild(card);
      } catch (e) {
        console.error('Other city load error:', e);
      }
    }
  }

  // Geolocation Support
  function handleGeolocation() {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser', 'error');
      return;
    }

    showToast('Detecting atmospheric coordinates via GPS...', 'info');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fetchWeatherData({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude
        });
      },
      (err) => {
        console.warn('Geolocation denied/failed:', err);
        showToast('Location access denied. Enter a city name manually.', 'error');
      },
      { timeout: 8000 }
    );
  }

  // Unit Switching (°C / °F)
  function setUnit(newUnit) {
    if (state.unit === newUnit) return;
    state.unit = newUnit;

    if (elements.btnCelsius && elements.btnFahrenheit) {
      if (newUnit === 'C') {
        elements.btnCelsius.className = 'px-space-sm py-1 rounded bg-primary-container text-on-primary-container font-semibold transition-all shadow-sm';
        elements.btnFahrenheit.className = 'px-space-sm py-1 rounded hover:text-on-surface transition-all text-on-surface-variant';
      } else {
        elements.btnFahrenheit.className = 'px-space-sm py-1 rounded bg-primary-container text-on-primary-container font-semibold transition-all shadow-sm';
        elements.btnCelsius.className = 'px-space-sm py-1 rounded hover:text-on-surface transition-all text-on-surface-variant';
      }
    }

    // Re-render current dashboard & other cities cards with new unit
    renderDashboard();

    document.querySelectorAll('.other-city-temp').forEach(el => {
      const c = parseFloat(el.getAttribute('data-celsius'));
      if (!isNaN(c)) {
        el.textContent = formatTemp(c, false);
      }
    });
  }

  // Setup Event Listeners
  function initListeners() {
    // 1. Search Input Submit
    const handleSearch = (e) => {
      e.preventDefault();
      const val = (elements.searchInput?.value || '').trim();
      if (val) {
        fetchWeatherData(val);
      }
    };

    if (elements.searchForm) {
      elements.searchForm.addEventListener('submit', handleSearch);
    }
    if (elements.searchInput) {
      elements.searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          handleSearch(e);
        }
      });
    }

    // 2. Keyboard shortcut ⌘K / Ctrl+K
    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        elements.searchInput?.focus();
        elements.searchInput?.select();
      }
    });

    // 3. Geolocation button
    if (elements.geoLocateBtn) {
      elements.geoLocateBtn.addEventListener('click', (e) => {
        e.preventDefault();
        handleGeolocation();
      });
    }

    // 4. Mobile search button
    if (elements.mobileSearchBtn) {
      elements.mobileSearchBtn.addEventListener('click', () => {
        const city = prompt('Enter city name (e.g. Tokyo, London, Paris):');
        if (city && city.trim()) {
          fetchWeatherData(city.trim());
        }
      });
    }

    // 5. Unit buttons
    if (elements.btnCelsius) {
      elements.btnCelsius.addEventListener('click', () => setUnit('C'));
    }
    if (elements.btnFahrenheit) {
      elements.btnFahrenheit.addEventListener('click', () => setUnit('F'));
    }

    // 6. Header Clock Live Ticker
    setInterval(() => {
      if (elements.headerClock) {
        const now = new Date();
        elements.headerClock.textContent = `${now.toUTCString().slice(17, 22)} UTC • Live Atmospheric Feed`;
      }
    }, 1000);
  }

  // Initialization
  document.addEventListener('DOMContentLoaded', () => {
    initListeners();
    // Load initial city
    fetchWeatherData('New York');
    // Load other cities cards
    loadOtherCitiesGrid();
  });

})();
