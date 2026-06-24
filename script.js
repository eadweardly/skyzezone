const WMO = {
  0:"Clear sky",1:"Mainly clear",2:"Partly cloudy",3:"Overcast",
  45:"Foggy",48:"Icy fog",51:"Light drizzle",53:"Drizzle",55:"Dense drizzle",
  61:"Slight rain",63:"Moderate rain",65:"Heavy rain",
  71:"Slight snow",73:"Moderate snow",75:"Heavy snow",77:"Snow grains",
  80:"Slight showers",81:"Showers",82:"Violent showers",
  85:"Slight snow showers",86:"Heavy snow showers",
  95:"Thunderstorm",96:"Thunderstorm w/ hail",99:"Thunderstorm w/ heavy hail"
};
const ICON = {
  0:"☀️",1:"🌤️",2:"⛅",3:"☁️",45:"🌫️",48:"🌫️",
  51:"🌦️",53:"🌦️",55:"🌧️",61:"🌧️",63:"🌧️",65:"🌧️",
  71:"🌨️",73:"🌨️",75:"❄️",77:"❄️",80:"🌦️",81:"🌧️",82:"⛈️",
  85:"🌨️",86:"❄️",95:"⛈️",96:"⛈️",99:"⛈️"
};
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Stars
function generateStars() {
  const container = document.getElementById('stars');
  if (!container) return;
  const count = 80;
  let html = '';
  for (let i = 0; i < count; i++) {
    const size = Math.random() * 2.5 + 0.5;
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    const dur = (Math.random() * 4 + 2).toFixed(1);
    const delay = (Math.random() * 5).toFixed(1);
    html += `<div class="star" style="width:${size}px;height:${size}px;left:${x}%;top:${y}%;--dur:${dur}s;--delay:-${delay}s;"></div>`;
  }
  container.innerHTML = html;
}
generateStars();

// Theme
const html = document.documentElement;
const saved = localStorage.getItem('skyze-theme') || 'dark';
setTheme(saved);

document.getElementById('themeToggle').addEventListener('click', () => {
  const current = html.getAttribute('data-theme');
  setTheme(current === 'dark' ? 'light' : 'dark');
});

function setTheme(theme) {
  html.setAttribute('data-theme', theme);
  localStorage.setItem('skyze-theme', theme);
  const icon = document.getElementById('themeIcon');
  const label = document.getElementById('themeLabel');
  if (theme === 'dark') {
    icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
    label.textContent = 'Light';
  } else {
    icon.innerHTML = '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>';
    label.textContent = 'Dark';
  }
}

// Clock
function updateClock() {
  const now = new Date();
  const el = document.getElementById('headerTime');
  if (el) el.innerHTML = `${DAYS_SHORT[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}<br>${now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}`;
}
updateClock();
setInterval(updateClock, 1000);

// Search
let debounceT;
const input = document.getElementById('locInput');
const suggestionsEl = document.getElementById('suggestions');
const searchWrap = document.querySelector('.search-wrap');

input.addEventListener('input', () => {
  clearTimeout(debounceT);
  debounceT = setTimeout(fetchSuggestions, 380);
});
input.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
document.getElementById('btnSearch').addEventListener('click', doSearch);
document.getElementById('btnGps').addEventListener('click', useGPS);
document.getElementById('btnGpsBig').addEventListener('click', useGPS);
document.addEventListener('click', e => {
  if (!searchWrap.contains(e.target)) hideSugg();
});

const geocodeHeaders = { 'Accept-Language': 'en' };

function sanitize(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseCoordinates(query) {
  const match = query.match(/^\s*([-+]?\d{1,3}(?:\.\d+)?)[,\s]+([-+]?\d{1,3}(?:\.\d+)?)\s*$/);
  return match ? { lat: match[1], lon: match[2] } : null;
}

function formatGeocodeLabel(place) {
  if (!place || !place.address) return place?.display_name || '';
  const addr = place.address;
  const locality = addr.road || addr.neighbourhood || addr.suburb || addr.village || addr.town || addr.city || addr.municipality || addr.county;
  const region = addr.state || addr.state_district || addr.region;
  const country = addr.country;
  return [locality, region, country].filter(Boolean).join(', ');
}

function suggestionDetails(place) {
  if (!place || !place.address) return '';
  const addr = place.address;
  const details = [
    addr.neighbourhood,
    addr.suburb,
    addr.road,
    addr.city,
    addr.town,
    addr.village,
    addr.municipality,
    addr.county,
    addr.state
  ].filter(Boolean);
  return details.slice(0, 3).join(', ');
}

async function fetchGeocode(query, limit = 6) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', String(limit));

  const response = await fetch(url.toString(), { headers: geocodeHeaders });
  if (!response.ok) throw new Error('Geocoding failed');
  return response.json();
}

async function fetchSuggestions() {
  const q = input.value.trim();
  if (q.length < 3) { hideSugg(); return; }
  try {
    const data = await fetchGeocode(q, 6);
    if (!Array.isArray(data) || !data.length) { hideSugg(); return; }

    suggestionsEl.innerHTML = data.map(place => {
      const label = formatGeocodeLabel(place) || place.display_name || 'Unknown location';
      const info = suggestionDetails(place);
      return `
        <div class="suggestion-item" data-lat="${sanitize(place.lat)}" data-lon="${sanitize(place.lon)}" data-name="${sanitize(label)}">
          <div class="suggestion-main">${sanitize(label)}</div>
          <div class="suggestion-secondary">${sanitize(info)}</div>
        </div>`;
    }).join('');

    suggestionsEl.style.display = 'block';
    suggestionsEl.querySelectorAll('.suggestion-item').forEach(item => {
      item.addEventListener('click', () => {
        input.value = item.dataset.name;
        hideSugg();
        loadWeather(item.dataset.lat, item.dataset.lon, item.dataset.name);
      });
    });
  } catch (e) {
    hideSugg();
  }
}

async function doSearch() {
  const q = input.value.trim();
  if (!q) return;
  showLoading();
  hideSugg();

  const coords = parseCoordinates(q);
  if (coords) {
    const numericLabel = `${Number(coords.lat).toFixed(4)}, ${Number(coords.lon).toFixed(4)}`;
    input.value = numericLabel;
    return loadWeather(coords.lat, coords.lon, numericLabel);
  }

  try {
    const data = await fetchGeocode(q, 6);
    if (!Array.isArray(data) || !data.length) { showError('Location not found. Please try a sharper name.'); return; }
    const best = data.sort((a, b) => (b.importance || 0) - (a.importance || 0))[0];
    const name = formatGeocodeLabel(best) || best.display_name || q;
    input.value = name;
    loadWeather(best.lat, best.lon, name);
  } catch (e) {
    showError('Unable to locate that place. Try a city or barangay name again.');
  }
}

function hideSugg() { suggestionsEl.style.display = 'none'; }

function useGPS() {
  if (!navigator.geolocation) { showError('Geolocation is not supported by this browser.'); return; }
  showLoading('📍 Getting your location…');
  navigator.geolocation.getCurrentPosition(async pos => {
    const { latitude: lat, longitude: lon } = pos.coords;
    try {
      const url = new URL('https://nominatim.openstreetmap.org/reverse');
      url.searchParams.set('lat', lat);
      url.searchParams.set('lon', lon);
      url.searchParams.set('format', 'jsonv2');
      url.searchParams.set('addressdetails', '1');
      const response = await fetch(url.toString(), { headers: geocodeHeaders });
      const data = await response.json();
      const name = formatGeocodeLabel(data) || data.display_name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
      input.value = name;
      loadWeather(lat, lon, name);
    } catch (e) {
      const fallbackName = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
      input.value = fallbackName;
      loadWeather(lat, lon, fallbackName);
    }
  }, () => { showError('Location access denied. Please search manually.'); });
}

async function loadWeather(lat, lon, name) {
  showLoading();
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code,uv_index` +
      `&hourly=temperature_2m,precipitation_probability,weather_code` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset` +
      `&timezone=auto&forecast_days=7`;
    const r = await fetch(url);
    const d = await r.json();
    renderWeather(d, name);
  } catch (e) { showError("Failed to load weather data. Please try again."); }
}

function renderWeather(d, name) {
  const c = d.current;
  const daily = d.daily;
  const hourly = d.hourly;
  const now = new Date();

  const nameParts = name.split(',');
  const locMain = nameParts[0].trim();
  const locSub = nameParts.slice(1, 3).map(s => s.trim()).filter(Boolean).join(', ');
  const windDir = ['N','NE','E','SE','S','SW','W','NW'][Math.round(c.wind_direction_10m / 45) % 8];

  const todayStr = now.toISOString().split('T')[0];
  const todayIdx = hourly.time.findIndex(t => t.startsWith(todayStr));
  const nowHour = now.getHours();
  const startIdx = todayIdx >= 0 ? todayIdx + nowHour : 0;
  const hoursToShow = hourly.time.slice(startIdx, startIdx + 12);

  const hourlyHTML = hoursToShow.map((t, i) => {
    const idx = startIdx + i;
    const hr = new Date(t);
    const label = i === 0 ? 'Now' : hr.getHours() === 0 ? '12 AM' : hr.getHours() > 12 ? `${hr.getHours() - 12} PM` : `${hr.getHours()} AM`;
    const code = hourly.weather_code[idx] ?? 0;
    const pop = hourly.precipitation_probability[idx] ?? 0;
    return `<div class="hourly-card ${i === 0 ? 'active' : ''}">
      <div class="hourly-time">${label}</div>
      <div class="hourly-emoji">${ICON[code] || '🌡️'}</div>
      <div class="hourly-temp">${Math.round(hourly.temperature_2m[idx] ?? 0)}°</div>
      <div class="hourly-pop">${pop}%</div>
    </div>`;
  }).join('');

  const dailyHTML = daily.time.map((t, i) => {
    const date = new Date(t + 'T00:00:00');
    const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : DAYS_SHORT[date.getDay()];
    const code = daily.weather_code[i] ?? 0;
    const pop = daily.precipitation_probability_max[i] ?? 0;
    const max = Math.round(daily.temperature_2m_max[i] ?? 0);
    const min = Math.round(daily.temperature_2m_min[i] ?? 0);
    return `<div class="daily-row">
      <div class="daily-day">${label}</div>
      <div class="daily-emoji">${ICON[code] || '🌡️'}</div>
      <div class="daily-desc">${WMO[code] || '—'}</div>
      <div class="daily-pop-wrap">
        <div class="daily-pop-bar"><div class="daily-pop-fill" style="width:${pop}%"></div></div>
        <div class="daily-pop-pct">${pop}%</div>
      </div>
      <div class="daily-temps">
        <span class="daily-max">${max}°</span>
        <span class="daily-min">${min}°</span>
      </div>
    </div>`;
  }).join('');

  const sunrise = daily.sunrise?.[0] ? new Date(daily.sunrise[0]).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : '—';
  const sunset = daily.sunset?.[0] ? new Date(daily.sunset[0]).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : '—';

  document.getElementById('content').innerHTML = `
    <div class="glass-card current">
      <div class="current-top">
        <div>
          <div class="location-name">${locMain}</div>
          <div class="location-sub">${locSub || 'Local weather'}</div>
        </div>
        <div style="text-align:right;font-size:0.78rem;color:var(--text-dim)">
          ${now.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
      </div>
      <div class="current-main">
        <div class="temp-display">${Math.round(c.temperature_2m)}<span class="temp-unit">°C</span></div>
        <div class="current-info">
          <div class="weather-emoji">${ICON[c.weather_code] || '🌡️'}</div>
          <div class="weather-desc">${WMO[c.weather_code] || '—'}</div>
          <div class="feels-like">Feels like ${Math.round(c.apparent_temperature)}°C</div>
        </div>
      </div>
      <div class="metrics-row">
        <div class="metric-pill"><div class="metric-label">Humidity</div><div class="metric-val">${c.relative_humidity_2m}%</div></div>
        <div class="metric-pill"><div class="metric-label">Wind</div><div class="metric-val">${Math.round(c.wind_speed_10m)} <span style="font-size:0.7rem;color:var(--text-muted)">km/h ${windDir}</span></div></div>
        <div class="metric-pill"><div class="metric-label">UV Index</div><div class="metric-val">${Math.round(c.uv_index ?? 0)}</div></div>
        <div class="metric-pill"><div class="metric-label">Sunrise</div><div class="metric-val" style="font-size:0.9rem">${sunrise}</div></div>
        <div class="metric-pill"><div class="metric-label">Sunset</div><div class="metric-val" style="font-size:0.9rem">${sunset}</div></div>
        <div class="metric-pill"><div class="metric-label">Timezone</div><div class="metric-val" style="font-size:0.72rem;color:var(--text-muted)">${d.timezone || '—'}</div></div>
      </div>
    </div>
    <div class="section-label">Hourly forecast — next 12 hours</div>
    <div class="hourly-scroll">${hourlyHTML}</div>
    <div class="section-label">7-day forecast</div>
    <div class="daily-list">${dailyHTML}</div>
  `;
}

function showLoading(msg) {
  document.getElementById('content').innerHTML = `
    <div class="loading-wrap">
      <div class="loading-dots"><span></span><span></span><span></span></div>
      <div class="loading-text">${msg || 'Loading weather data…'}</div>
    </div>`;
}

function showError(message) {
  document.getElementById('content').innerHTML = `
    <div class="status">
      <div class="status-icon">⚠️</div>
      <div class="status-text">${sanitize(message)}</div>
      <div class="status-sub">Try a barangay, city, municipality, or province name.</div>
    </div>`;
}

function showError(msg) {
  document.getElementById('content').innerHTML = `<div class="error-msg">⚠️ ${msg}</div>`;
}