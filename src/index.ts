// /src/index.ts

import './styles/styles.css';
import { safeGetItem, safeSetItem } from './utils/storage';
import SettingsManager from './settings';
import { StadiumInfo, WeatherData, WeatherDataResponse, LeagueType, StadiumsMap } from './types';
import { WeatherCard } from './components/WeatherCard'; 

let OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || '';

function checkApiKey() {
  if (!OPENWEATHER_API_KEY) {
    throw new Error('OpenWeather API key not found in environment variables');
  }
}

class GameDayWeather {
  private stadiumsMap: StadiumsMap = {
    nfl: [],
    ncaa: [],
    mlb: [],
    mls: [],
  };

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

      await this.loadStadiumData();
      this.setupCustomDropdowns();
      this.setupEventListeners();
    } catch (err: any) {
      console.error('Initialization error:', err);
      this.showError('Initialization Error', err.message);
    }
  }

  setupEventListeners(): void {
    // Setup refresh button
    const refreshBtn = document.getElementById('refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshWeather());
    }

    // Setup settings button
    const settingsBtn = document.getElementById('settings');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => this.openSettings());
    }

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      if (!(e.target as HTMLElement).closest('.custom-dropdown')) {
        this.closeAllDropdowns();
      }
    });
  }

  setupCustomDropdowns(): void {
    const dropdownTypes: LeagueType[] = ['nfl', 'ncaa', 'mlb', 'mls'];

    dropdownTypes.forEach((type) => {
      const dropdown = document.getElementById(`${type}Dropdown`) as HTMLElement;
      if (dropdown) {
        this.initializeCustomDropdown(dropdown, type);
      }
    });
  }

  initializeCustomDropdown(dropdown: HTMLElement, type: LeagueType): void {
    const selected = dropdown.querySelector('.dropdown-selected') as HTMLElement;
    const list = dropdown.querySelector('.dropdown-list') as HTMLElement;
    const searchInput = dropdown.querySelector('.dropdown-search input') as HTMLInputElement;

    // Toggle dropdown
    dropdown.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!e.target || !(e.target as HTMLElement).closest('.dropdown-search')) {
        this.closeAllDropdowns(dropdown);
        dropdown.classList.toggle('active');
        if (dropdown.classList.contains('active')) {
          searchInput.focus();
        }
      }
    });

    // Handle option selection
    list.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = e.target as HTMLElement;
      if (target.tagName.toLowerCase() === 'li' && !target.classList.contains('dropdown-search')) {
        const selectedValue = target.dataset.value;
        const selectedText = target.textContent;
        if (selected && selectedText) {
          selected.textContent = selectedText;
          dropdown.classList.remove('active');
          this.handleDropdownSelection(type, selectedValue);
        }
      }
    });

    // Search functionality
    searchInput.addEventListener('input', (e) => {
      const filter = searchInput.value.toLowerCase();
      const items = list.querySelectorAll('li:not(.dropdown-search)');
      items.forEach((item) => {
        const text = item.textContent?.toLowerCase() || '';
        (item as HTMLElement).style.display = text.includes(filter) ? '' : 'none';
      });
    });

    // Keyboard navigation
    dropdown.addEventListener('keydown', (e) => {
      const active = dropdown.classList.contains('active');

      switch (e.key) {
        case 'Enter':
          e.preventDefault();
          if (active) {
            const visibleItems = Array.from(
              list.querySelectorAll('li:not(.dropdown-search):not([style*="display: none"])')
            ) as HTMLElement[];
            if (visibleItems.length > 0) {
              visibleItems[0].click();
            }
          } else {
            dropdown.click();
          }
          break;

        case 'Escape':
          if (active) {
            dropdown.classList.remove('active');
          }
          break;

        case 'ArrowDown':
          if (active) {
            e.preventDefault();
            const visibleItems = Array.from(
              list.querySelectorAll('li:not(.dropdown-search):not([style*="display: none"])')
            ) as HTMLElement[];
            if (visibleItems.length > 0) {
              visibleItems[0].focus();
            }
          }
          break;
      }
    });
  }

  closeAllDropdowns(currentDropdown?: HTMLElement): void {
    const dropdowns = document.querySelectorAll('.custom-dropdown.active');
    dropdowns.forEach((dropdown) => {
      if (dropdown !== currentDropdown) {
        dropdown.classList.remove('active');
      }
    });
  }

  async handleDropdownSelection(type: LeagueType, selectedValue: string | undefined): Promise<void> {
    if (!selectedValue) return;

    // Reset other dropdowns
    const allTypes: LeagueType[] = ['nfl', 'ncaa', 'mlb', 'mls'];
    allTypes.forEach((t) => {
      if (t !== type) {
        const dropdown = document.getElementById(`${t}Dropdown`);
        const selected = dropdown?.querySelector('.dropdown-selected');
        if (selected) {
          selected.textContent = `Select ${t.toUpperCase()} Team`;
        }
      }
    });

    await this.refreshWeather();
  }

  async loadStadiumData(): Promise<void> {
    try {
      const [footballResp, otherResp] = await Promise.all([
        fetch('/data/stadium_coordinates.json'),
        fetch('/data/more_stadium_coordinates.json')
      ]);

      if (!footballResp.ok) throw new Error('Failed to load football stadium data');
      if (!otherResp.ok) throw new Error('Failed to load MLB/MLS stadium data');

      const [footballData, otherData] = await Promise.all([
        footballResp.json(),
        otherResp.json()
      ]);

      // Process football data
      this.stadiumsMap.nfl = this.processStadiumData(footballData.nfl);
      this.stadiumsMap.ncaa = this.processStadiumData(footballData.ncaa);

      // Process other sports data
      this.stadiumsMap.mlb = this.processStadiumData(otherData.mlb);
      this.stadiumsMap.mls = this.processStadiumData(otherData.mls);

      // Populate all dropdowns
      Object.keys(this.stadiumsMap).forEach((type) => {
        this.populateDropdown(type as LeagueType, this.stadiumsMap[type as LeagueType]);
      });

    } catch (err: any) {
      console.error('Error loading stadium data:', err);
      this.showError('Could not load stadium data', 'Check your connection and try again.');
    }
  }

  processStadiumData(data: Record<string, any>): StadiumInfo[] {
    return Object.entries(data).map(([name, info]: [string, any]) => ({
      name,
      team: info.team,
      latitude: info.latitude,
      longitude: info.longitude
    }));
  }

  populateDropdown(type: LeagueType, stadiums: StadiumInfo[]): void {
    const dropdown = document.getElementById(`${type}Dropdown`);
    if (!dropdown) return;

    const list = dropdown.querySelector('.dropdown-list');
    if (!list) return;

    // Clear existing options except search
    list.innerHTML = '<li class="dropdown-search"><input type="text" placeholder="Search teams..." /></li>';

    // Get unique team names
    const teamNames = new Set<string>();
    stadiums.forEach((stadium) => {
      if (stadium.team) {
        stadium.team.split(/,|\//).forEach(team => teamNames.add(team.trim()));
      }
    });

    // Add 'All Teams' option
    const allOption = document.createElement('li');
    allOption.textContent = `All ${type.toUpperCase()} Teams`;
    allOption.dataset.value = 'all';
    list.appendChild(allOption);

    // Add individual teams
    Array.from(teamNames)
      .sort()
      .forEach((team) => {
        const li = document.createElement('li');
        li.textContent = team;
        li.dataset.value = team;
        list.appendChild(li);
      });
  }

  async refreshWeather(): Promise<void> {
    const selectedTeams = this.getSelectedTeams();
    const dateEl = document.querySelector('#weather-date') as HTMLInputElement;
    const dateVal = dateEl?.value || new Date().toISOString().split('T')[0];

    if (selectedTeams.length === 0) {
      this.showError('No team selected', 'Please select at least one team.');
      return;
    }

    const weatherList = document.getElementById('weatherList');
    if (!weatherList) return;

    weatherList.innerHTML = '<div class="loading">Loading weather data...</div>';

    try {
      checkApiKey();
      const requests = selectedTeams.map((stadium) => this.fetchWeatherForStadium(stadium, dateVal));
      const results = await Promise.all(requests);
      this.displayWeather(results);
    } catch (error: any) {
      console.error('Error in refreshWeather:', error);
      this.showError('Could not fetch weather data', error.message);
    }
  }

  getSelectedTeams(): StadiumInfo[] {
    const teams: StadiumInfo[] = [];
    const types: LeagueType[] = ['nfl', 'ncaa', 'mlb', 'mls'];

    types.forEach((type) => {
      const dropdown = document.getElementById(`${type}Dropdown`);
      const selected = dropdown?.querySelector('.dropdown-selected')?.textContent;

      if (selected && selected !== `Select ${type.toUpperCase()} Team`) {
        if (selected === `All ${type.toUpperCase()} Teams`) {
          teams.push(...this.stadiumsMap[type]);
        } else {
          const filtered = this.stadiumsMap[type].filter(s => s.team.includes(selected));
          teams.push(...filtered);
        }
      }
    });

    return teams;
  }

  async fetchWeatherForStadium(stadium: StadiumInfo, date: string): Promise<WeatherData> {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${stadium.latitude}&lon=${stadium.longitude}&units=imperial&appid=${OPENWEATHER_API_KEY}`;
    const resp = await fetch(url);

    if (!resp.ok) {
      throw new Error(`Weather fetch error: ${resp.statusText}`);
    }

    const weather: WeatherDataResponse = await resp.json();
    return { stadium, weather };
  }

  displayWeather(weatherDataArray: WeatherData[]): void {
  const weatherList = document.getElementById('weatherList');
  if (!weatherList) return;

  weatherList.innerHTML = ''; // Clear existing content

  weatherDataArray.forEach(({ stadium, weather }) => {
    // Instantiate a new WeatherCard
    const card = new WeatherCard();
    card.updateWeather(weather, stadium);

    // Append the card to the weather list
    weatherList.appendChild(card.render());
  });
}

  showError(title: string, message?: string, isApiError: boolean = false): void {
    const weatherList = document.getElementById('weatherList');
    if (!weatherList) return;

    weatherList.innerHTML = '';

    const errorDiv = document.createElement('div');
    errorDiv.className = `error-message bg-yellow-100 border border-yellow-200 text-yellow-800 p-4 rounded`;

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
    button.className = 'primary-button mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700';
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
