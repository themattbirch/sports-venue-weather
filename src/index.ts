// /src/index.ts
import './styles/styles.css';
import { safeGetItem, safeSetItem } from './utils/storage';
import SettingsManager from './settings';
import { StadiumInfo, WeatherData, WeatherDataResponse } from './types';

let OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || '';

function checkApiKey() {
  if (!OPENWEATHER_API_KEY) {
    throw new Error('OpenWeather API key not found in environment variables');
  }
}

class GameDayWeather {
  private nflStadiums: StadiumInfo[] = [];
  private ncaaStadiums: StadiumInfo[] = [];
  private mlbStadiums: StadiumInfo[] = [];
  private mlsStadiums: StadiumInfo[] = [];

  constructor() {
    this.init();
  }

  async init(): Promise<void> {
    try {
      // Read API key from safe storage
      const storedApiKey = safeGetItem('openweatherApiKey');
      if (storedApiKey) {
        OPENWEATHER_API_KEY = storedApiKey;
      }

      // Read dark mode
      const darkModeVal = safeGetItem('darkModeEnabled');
      if (darkModeVal === 'true') {
        document.body.classList.add('dark-mode');
      }

      this.setupEventListeners();
      await this.loadFootballStadiumData();
      await this.loadBaseballSoccerData();
    } catch (err: any) {
      console.error('Initialization error:', err);
      this.showError('Initialization Error', err.message);
    }
  }

  setupEventListeners(): void {
    const refreshBtn = document.querySelector('#refresh') as HTMLButtonElement;
    if (refreshBtn) {
      refreshBtn.onclick = () => this.refreshWeather();
    }

    const dateInput = document.querySelector('#weather-date') as HTMLInputElement;
    if (dateInput) {
      dateInput.onchange = () => this.refreshWeather();
    }

    const settingsBtn = document.querySelector('#settings') as HTMLButtonElement;
    if (settingsBtn) {
      settingsBtn.onclick = () => this.openSettings();
    }

    const nflDD = document.querySelector('#nflDropdown') as HTMLSelectElement;
    const ncaaDD = document.querySelector('#ncaaDropdown') as HTMLSelectElement;
    const mlbDD = document.querySelector('#mlbDropdown') as HTMLSelectElement;
    const mlsDD = document.querySelector('#mlsDropdown') as HTMLSelectElement;

    if (nflDD) {
      nflDD.addEventListener('change', () => {
        if (ncaaDD) ncaaDD.value = 'all';
        if (mlbDD) mlbDD.value = 'all';
        if (mlsDD) mlsDD.value = 'all';
        this.refreshWeather();
      });
    }
    if (ncaaDD) {
      ncaaDD.addEventListener('change', () => {
        if (nflDD) nflDD.value = 'all';
        if (mlbDD) mlbDD.value = 'all';
        if (mlsDD) mlsDD.value = 'all';
        this.refreshWeather();
      });
    }
    if (mlbDD) {
      mlbDD.addEventListener('change', () => {
        if (nflDD) nflDD.value = 'all';
        if (ncaaDD) ncaaDD.value = 'all';
        if (mlsDD) mlsDD.value = 'all';
        this.refreshWeather();
      });
    }
    if (mlsDD) {
      mlsDD.addEventListener('change', () => {
        if (nflDD) nflDD.value = 'all';
        if (ncaaDD) ncaaDD.value = 'all';
        if (mlbDD) mlbDD.value = 'all';
        this.refreshWeather();
      });
    }
  }

  // LOAD FOOTBALL STADIUM DATA
  async loadFootballStadiumData(): Promise<void> {
    try {
      const resp = await fetch('/data/stadium_coordinates.json');
      if (!resp.ok) throw new Error('Failed to load stadium data');

      const data = await resp.json(); // Corrected variable name

      this.nflStadiums = Object.entries(data.nfl).map(
        ([stadiumName, info]: [string, any]): StadiumInfo => ({
          name: stadiumName,
          team: info.team,
          latitude: info.latitude,
          longitude: info.longitude,
          // ...other properties
        })
      );

      this.ncaaStadiums = Object.entries(data.ncaa).map(
        ([stadiumName, info]: [string, any]): StadiumInfo => ({
          name: stadiumName,
          team: info.team,
          latitude: info.latitude,
          longitude: info.longitude,
          // ...other properties
        })
      );

      this.populateNflDropdown();
      this.populateNcaaDropdown();
    } catch (err: any) {
      console.error('Error loading football data:', err);
      this.showError('Could not load football data', 'Check connection');
    }
  }

  // LOAD BASEBALL + SOCCER STADIUM DATA
  async loadBaseballSoccerData(): Promise<void> {
    try {
      const resp = await fetch('/data/more_stadium_coordinates.json');
      if (!resp.ok) throw new Error('Failed to load MLB/MLS data');

      const data = await resp.json(); // Corrected variable name

      this.mlbStadiums = Object.entries(data.mlb).map(
        ([stadiumName, info]: [string, any]): StadiumInfo => ({
          name: stadiumName,
          team: info.team,
          latitude: info.latitude,
          longitude: info.longitude,
          // ...other properties
        })
      );

      this.mlsStadiums = Object.entries(data.mls).map(
        ([stadiumName, info]: [string, any]): StadiumInfo => ({
          name: stadiumName,
          team: info.team,
          latitude: info.latitude,
          longitude: info.longitude,
          // ...other properties
        })
      );

      this.populateMlbDropdown();
      this.populateMlsDropdown();
    } catch (err: any) {
      console.error('Error loading baseball/soccer data:', err);
      this.showError('Could not load MLB/MLS data', 'Check connection');
    }
  }

  // POPULATE DROPDOWNS
  populateNflDropdown(): void {
    const el = document.querySelector('#nflDropdown') as HTMLSelectElement;
    if (!el) return;
    el.innerHTML = `
      <option value="all">All NFL Stadiums</option>
      ${this.nflStadiums
        .map((s: StadiumInfo) => `<option value="${s.team}">${s.name} - ${s.team}</option>`)
        .join('')}
    `;
  }

  populateNcaaDropdown(): void {
    const el = document.querySelector('#ncaaDropdown') as HTMLSelectElement;
    if (!el) return;
    el.innerHTML = `
      <option value="all">All NCAA Stadiums</option>
      ${this.ncaaStadiums
        .map((s: StadiumInfo) => `<option value="${s.team}">${s.name} - ${s.team}</option>`)
        .join('')}
    `;
  }

  populateMlbDropdown(): void {
    const el = document.querySelector('#mlbDropdown') as HTMLSelectElement;
    if (!el) return;
    el.innerHTML = `
      <option value="all">All MLB Stadiums</option>
      ${this.mlbStadiums
        .map((s: StadiumInfo) => `<option value="${s.team}">${s.name} - ${s.team}</option>`)
        .join('')}
    `;
  }

  populateMlsDropdown(): void {
    const el = document.querySelector('#mlsDropdown') as HTMLSelectElement;
    if (!el) return;
    el.innerHTML = `
      <option value="all">All MLS Stadiums</option>
      ${this.mlsStadiums
        .map((s: StadiumInfo) => `<option value="${s.team}">${s.name} - ${s.team}</option>`)
        .join('')}
    `;
  }

  // REFRESH WEATHER DATA
  async refreshWeather() {
    const weatherList = document.getElementById('weatherList');
    if (!weatherList) return;
    weatherList.innerHTML = '<div class="loading">Loading weather data...</div>';

    const dateEl = document.querySelector('#weather-date') as HTMLInputElement;
    const dateVal = dateEl?.value || new Date().toISOString().split('T')[0];

    const nflVal = (document.querySelector('#nflDropdown') as HTMLSelectElement).value;
    const ncaaVal = (document.querySelector('#ncaaDropdown') as HTMLSelectElement).value;
    const mlbVal = (document.querySelector('#mlbDropdown') as HTMLSelectElement).value;
    const mlsVal = (document.querySelector('#mlsDropdown') as HTMLSelectElement).value;

    const toFetch: StadiumInfo[] = [];
    if (nflVal !== 'all') {
      toFetch.push(...this.nflStadiums.filter((s) => s.team === nflVal));
    }
    if (ncaaVal !== 'all') {
      toFetch.push(...this.ncaaStadiums.filter((s) => s.team === ncaaVal));
    }
    if (mlbVal !== 'all') {
      toFetch.push(...this.mlbStadiums.filter((s) => s.team === mlbVal));
    }
    if (mlsVal !== 'all') {
      toFetch.push(...this.mlsStadiums.filter((s) => s.team === mlsVal));
    }

    if (toFetch.length === 0) {
      weatherList.innerHTML = '<p class="text-center">No stadium selected.</p>';
      return;
    }

    try {
      checkApiKey();
      const requests = toFetch.map((stadium) => this.fetchWeatherForStadium(stadium, dateVal));
      const results: WeatherData[] = await Promise.all(requests);
      this.displayWeather(results);
    } catch (error: any) {
      console.error('Error in refreshWeather:', error);
      this.showError('Could not fetch weather data');
    }
  }

  // FETCH WEATHER DATA FOR A STADIUM
  async fetchWeatherForStadium(stadium: StadiumInfo, date: string): Promise<WeatherData> {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${stadium.latitude}&lon=${stadium.longitude}&units=imperial&appid=${OPENWEATHER_API_KEY}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Weather fetch error: ${resp.statusText}`);
    const weather: WeatherDataResponse = await resp.json();
    return { stadium, weather };
  }

  // DISPLAY WEATHER DATA
  displayWeather(weatherDataArray: WeatherData[]) {
    const weatherList = document.getElementById('weatherList');
    if (!weatherList) return;
    weatherList.innerHTML = '';

    weatherDataArray.forEach((data) => {
      const { stadium, weather } = data;
      const iconCode = weather.weather[0].icon;
      const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

      const card = document.createElement('div');
      card.className =
        'weather-card bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex flex-col gap-2 w-full text-black dark:text-white';

      card.innerHTML = `
        <div class="text-lg font-bold">${stadium.name}</div>
        <div class="text-sm mb-1">${stadium.team}</div>
        <div class="flex flex-row items-center justify-between">
          <div>
            <div class="text-xl font-bold mb-1">
              ${Math.round(weather.main.temp)}°F
            </div>
            <div class="conditions text-sm mb-1">
              <p>${weather.weather[0].main}</p>
              <p>Feels like: ${Math.round(weather.main.feels_like)}°F</p>
            </div>
            <div class="details text-sm">
              <p>Humidity: ${weather.main.humidity}%</p>
              <p>Wind: ${Math.round(weather.wind.speed)} mph</p>
            </div>
          </div>
          <div>
            <img
              src="${iconUrl}"
              alt="${weather.weather[0].description}"
              class="w-12 h-12"
            />
          </div>
        </div>
      `;
      weatherList.appendChild(card);
    });
  }

  // SHOW ERROR MESSAGE
  showError(title: string, message?: string, isApiError: boolean = false) {
    const weatherList = document.getElementById('weatherList');
    if (!weatherList) return;
    weatherList.innerHTML = '';

    const errorDiv = document.createElement('div');
    errorDiv.className = `error-message ${isApiError ? 'api-key-missing' : ''}`;

    const titleEl = document.createElement('strong');
    titleEl.textContent = title;
    errorDiv.appendChild(titleEl);

    if (message) {
      const msgP = document.createElement('p');
      msgP.textContent = message;
      errorDiv.appendChild(msgP);
    }

    const button = document.createElement('button');
    button.textContent = isApiError ? 'Configure API Key' : 'Try Again';
    button.addEventListener('click', () => {
      if (isApiError) {
        this.openSettings();
      } else {
        window.location.reload();
      }
    });
    errorDiv.appendChild(button);

    weatherList.appendChild(errorDiv);
  }

  // OPEN SETTINGS MODAL
  openSettings(): void {
    const mgr = new SettingsManager();
    mgr.openModal();
  }
}

// Initialize the application
function main() {
  new GameDayWeather();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
