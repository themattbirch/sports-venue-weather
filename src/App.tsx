// src/App.tsx

import React, { useEffect, useState } from 'react';
import './styles/styles.css';
import { safeGetItem } from './utils/storage';
import SettingsManager from './settings';
import {
  StadiumInfo,
  WeatherData,
  WeatherDataResponse,
  LeagueType,
  StadiumsMap,
} from './types';
import { WeatherCard } from './components/WeatherCard'; // Named import

const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || '';

const App: React.FC = () => {
  const [stadiumsMap, setStadiumsMap] = useState<StadiumsMap>({
    nfl: [],
    ncaa: [],
    mlb: [],
    mls: [],
  });
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
  const [error, setError] = useState<{ title: string; message?: string; isApiError?: boolean } | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(false);

  useEffect(() => {
    initializeApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setupEventListeners();
    initializeDropdowns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stadiumsMap]);

  const initializeApp = async () => {
    try {
      // Retrieve API key from safe storage if available
      const storedApiKey = safeGetItem('openweatherApiKey');
      const apiKey = storedApiKey || OPENWEATHER_API_KEY;
      if (!apiKey) {
        throw new Error('OpenWeather API key not found in environment variables');
      }

      // Retrieve dark mode preference
      const darkModeVal = safeGetItem('darkModeEnabled');
      if (darkModeVal === 'true') {
        setDarkMode(true);
        document.body.classList.add('dark-mode');
      }

      // Load stadium data
      const stadiumData = await loadStadiumData();
      setStadiumsMap(stadiumData);

      // Setup dropdowns
      populateAllDropdowns(stadiumData);
    } catch (err: any) {
      console.error('Initialization error:', err);
      showError('Initialization Error', err.message);
    }
  };

  const loadStadiumData = async (): Promise<StadiumsMap> => {
    try {
      const [footballResp, otherResp] = await Promise.all([
        fetch('/data/stadium_coordinates.json'),
        fetch('/data/more_stadium_coordinates.json'),
      ]);

      if (!footballResp.ok) throw new Error('Failed to load football stadium data');
      if (!otherResp.ok) throw new Error('Failed to load MLB/MLS stadium data');

      const [footballData, otherData] = await Promise.all([
        footballResp.json(),
        otherResp.json(),
      ]);

      const newStadiumsMap: StadiumsMap = {
        nfl: processStadiumData(footballData.nfl),
        ncaa: processStadiumData(footballData.ncaa),
        mlb: processStadiumData(otherData.mlb),
        mls: processStadiumData(otherData.mls),
      };

      return newStadiumsMap;
    } catch (err: any) {
      console.error('Error loading stadium data:', err);
      showError('Could not load stadium data', 'Check your connection and try again.');
      throw err; // Re-throw to be caught by initializeApp
    }
  };

  const processStadiumData = (data: Record<string, any>): StadiumInfo[] => {
    return Object.entries(data).map(([name, info]: [string, any]) => ({
      name,
      team: info.team,
      latitude: info.latitude,
      longitude: info.longitude,
    }));
  };

  const populateAllDropdowns = (data: StadiumsMap) => {
    Object.keys(data).forEach((type) => {
      populateDropdown(type as LeagueType, data[type as LeagueType]);
    });
  };

  const populateDropdown = (type: LeagueType, stadiums: StadiumInfo[]) => {
    const dropdown = document.getElementById(`${type}Dropdown`);
    if (!dropdown) return;

    const list = dropdown.querySelector('.dropdown-list') as HTMLElement;
    if (!list) return;

    // Clear existing options except search
    list.innerHTML = '<li class="dropdown-search"><input type="text" placeholder="Search teams..." /></li>';

    // Get unique team names
    const teamNames = new Set<string>();
    stadiums.forEach((stadium) => {
      if (stadium.team) {
        stadium.team.split(/,|\//).forEach((team) => teamNames.add(team.trim()));
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
  };

  const setupEventListeners = () => {
    // Setup refresh button
    const refreshBtn = document.getElementById('refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => refreshWeather());
    }

    // Setup settings button
    const settingsBtn = document.getElementById('settings');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => openSettings());
    }

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      if (!(e.target as HTMLElement).closest('.custom-dropdown')) {
        closeAllDropdowns();
      }
    });
  };

  const initializeDropdowns = () => {
    const dropdownTypes: LeagueType[] = ['nfl', 'ncaa', 'mlb', 'mls'];

    dropdownTypes.forEach((type) => {
      const dropdown = document.getElementById(`${type}Dropdown`) as HTMLElement;
      if (dropdown) {
        initializeCustomDropdown(dropdown, type);
      }
    });
  };

  const initializeCustomDropdown = (dropdown: HTMLElement, type: LeagueType): void => {
    const selected = dropdown.querySelector('.dropdown-selected') as HTMLElement;
    const list = dropdown.querySelector('.dropdown-list') as HTMLElement;
    const searchInput = dropdown.querySelector('.dropdown-search input') as HTMLInputElement;

    // Toggle dropdown
    dropdown.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!e.target || !(e.target as HTMLElement).closest('.dropdown-search')) {
        closeAllDropdowns(dropdown);
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
          handleDropdownSelection(type, selectedValue);
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
  };

  const closeAllDropdowns = (currentDropdown?: HTMLElement): void => {
    const dropdowns = document.querySelectorAll('.custom-dropdown.active');
    dropdowns.forEach((dropdown) => {
      if (dropdown !== currentDropdown) {
        dropdown.classList.remove('active');
      }
    });
  };

  const handleDropdownSelection = async (type: LeagueType, selectedValue: string | undefined): Promise<void> => {
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

    await refreshWeather();
  };

  const refreshWeather = async (): Promise<void> => {
    const teams = getSelectedTeams();
    const dateInput = document.getElementById('weather-date') as HTMLInputElement;
    const dateVal = dateInput?.value || new Date().toISOString().split('T')[0];

    if (teams.length === 0) {
      showError('No team selected', 'Please select at least one team.');
      return;
    }

    try {
      checkApiKey();
      const weatherPromises = teams.map((stadium) => fetchWeatherForStadium(stadium, dateVal));
      const weatherResults = await Promise.all(weatherPromises);
      setWeatherData(weatherResults);
    } catch (error: any) {
      console.error('Error in refreshWeather:', error);
      showError('Could not fetch weather data', error.message);
    }
  };

  const getSelectedTeams = (): StadiumInfo[] => {
    const teams: StadiumInfo[] = [];
    const types: LeagueType[] = ['nfl', 'ncaa', 'mlb', 'mls'];

    types.forEach((type) => {
      const dropdown = document.getElementById(`${type}Dropdown`);
      const selected = dropdown?.querySelector('.dropdown-selected')?.textContent;

      if (selected && selected !== `Select ${type.toUpperCase()} Team`) {
        if (selected === `All ${type.toUpperCase()} Teams`) {
          teams.push(...stadiumsMap[type]);
        } else {
          const filtered = stadiumsMap[type].filter((s) => s.team.includes(selected));
          teams.push(...filtered);
        }
      }
    });

    return teams;
  };

  const fetchWeatherForStadium = async (stadium: StadiumInfo, date: string): Promise<WeatherData> => {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${stadium.latitude}&lon=${stadium.longitude}&units=imperial&appid=${OPENWEATHER_API_KEY}`;
    const resp = await fetch(url);

    if (!resp.ok) {
      throw new Error(`Weather fetch error: ${resp.statusText}`);
    }

    const weather: WeatherDataResponse = await resp.json();
    return { stadium, weather };
  };

  const displayWeather = (): JSX.Element[] => {
    return weatherData.map(({ stadium, weather }) => (
      <WeatherCard key={stadium.name} stadium={stadium} weather={weather} />
    ));
  };

  const showError = (title: string, message?: string, isApiError: boolean = false): void => {
    setError({ title, message, isApiError });
  };

  const openSettings = (): void => {
    const mgr = new SettingsManager();
    mgr.openModal();
  };

  const checkApiKey = (): void => {
    if (!OPENWEATHER_API_KEY) {
      throw new Error('OpenWeather API key not found in environment variables');
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-900 min-h-screen`}>
      <header className="header">
        <h1>Stadium Weather</h1>
        <button id="settings" className="icon-button absolute top-4 right-4">
          {/* SVG Icon */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
            <path
              d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5zm7.43-2.53c.04-.32.07-.64.07-.97 0-.33-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65A.488.488 0 0 0 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98 0 .33.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zm-7.43.03c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
            />
          </svg>
        </button>
      </header>

      <div className="controls">
        <input
          type="date"
          id="weather-date"
          className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-800"
          defaultValue={new Date().toISOString().split('T')[0]}
        />

        <button id="refresh" className="primary-button bg-blue-600 text-white">
          Refresh
        </button>

        <button id="settings-btn" className="primary-button bg-green-600 text-white">
          Settings
        </button>
      </div>

      <div className="dropdowns-container">
        <div className="custom-dropdown" id="nflDropdown">
          <label>NFL</label>
          <div className="dropdown-selected">Select NFL Team</div>
          <ul className="dropdown-list" role="listbox">
            <li className="dropdown-search">
              <input type="text" placeholder="Search teams..." />
            </li>
          </ul>
        </div>

        <div className="custom-dropdown" id="ncaaDropdown">
          <label>NCAA Football</label>
          <div className="dropdown-selected">Select NCAA Team</div>
          <ul className="dropdown-list" role="listbox">
            <li className="dropdown-search">
              <input type="text" placeholder="Search teams..." />
            </li>
          </ul>
        </div>

        <div className="custom-dropdown" id="mlbDropdown">
          <label>MLB</label>
          <div className="dropdown-selected">Select MLB Team</div>
          <ul className="dropdown-list" role="listbox">
            <li className="dropdown-search">
              <input type="text" placeholder="Search teams..." />
            </li>
          </ul>
        </div>

        <div className="custom-dropdown" id="mlsDropdown">
          <label>MLS</label>
          <div className="dropdown-selected">Select MLS Team</div>
          <ul className="dropdown-list" role="listbox">
            <li className="dropdown-search">
              <input type="text" placeholder="Search teams..." />
            </li>
          </ul>
        </div>
      </div>

      <div id="weatherList" className="mt-6 space-y-4">
        {weatherData.length > 0 ? displayWeather() : <div>No weather data available.</div>}
      </div>

      {error && (
        <div className="error-message bg-yellow-100 border border-yellow-200 text-yellow-800 p-4 rounded">
          <strong>{error.title}</strong>
          {error.message && <p>{error.message}</p>}
          <button
            className="primary-button mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            onClick={() => {
              if (error.isApiError) {
                openSettings();
              } else {
                window.location.reload();
              }
            }}
          >
            {error.isApiError ? 'Configure API Key' : 'Try Again'}
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
