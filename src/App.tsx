// src/App.tsx

import React, { useEffect, useState } from 'react';
import './styles/styles.css';
import { safeGetItem } from './utils/storage';
import SettingsManager from './settings'; // Singleton instance
import {
  StadiumInfo,
  WeatherData,
  WeatherDataResponse,
  LeagueType,
  StadiumsMap,
} from './types';
import { WeatherCard } from './components/WeatherCard';

const ENV_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || '';

const App: React.FC = () => {
  const [stadiumsMap, setStadiumsMap] = useState<StadiumsMap>({
    nfl: [],
    ncaa: [],
    mlb: [],
    mls: [],
  });
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
  const [error, setError] = useState<{
    title: string;
    message?: string;
    isApiError?: boolean;
  } | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [temperatureUnit, setTemperatureUnit] = useState<'F' | 'C'>('F');

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Check API key from storage or environment
      const storedApiKey = safeGetItem('openweatherApiKey');
      const finalApiKey = storedApiKey || ENV_API_KEY;
      if (!finalApiKey) {
        throw new Error('OpenWeather API key not found in environment variables');
      }

      // Load settings
      const storedSettings = SettingsManager.getAll();
      setDarkMode(storedSettings.darkMode || false);
      setTemperatureUnit(storedSettings.temperatureUnit || 'F');

      if (storedSettings.darkMode) {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }

      // Load stadium data
      const stadiumData = await loadStadiumData();
      setStadiumsMap(stadiumData);

      // Setup global listeners for now
      setupGlobalEventListeners();
    } catch (err: any) {
      console.error('Initialization error:', err);
      showError('Initialization Error', err.message, true);
    }
  };

  const loadStadiumData = async (): Promise<StadiumsMap> => {
    try {
      // We'll keep fetch('/data/...'), so ensure we have a rewrite to handle /app/data -> /data
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

      return {
        nfl: processStadiumData(footballData.nfl),
        ncaa: processStadiumData(footballData.ncaa),
        mlb: processStadiumData(otherData.mlb),
        mls: processStadiumData(otherData.mls),
      };
    } catch (err: any) {
      console.error('Error loading stadium data:', err);
      showError('Could not load stadium data', 'Check your connection and try again.', true);
      throw err;
    }
  };

  const processStadiumData = (data: Record<string, any>): StadiumInfo[] => {
    return Object.entries(data).map(([name, info]) => ({
      name,
      team: info.team,
      latitude: info.latitude,
      longitude: info.longitude,
    }));
  };

  const showError = (
    title: string,
    message?: string,
    isApiError: boolean = false
  ): void => {
    setError({ title, message, isApiError });
  };

  const handleSettingsChange = () => {
    const updatedSettings = SettingsManager.getAll();
    setDarkMode(updatedSettings.darkMode);
    setTemperatureUnit(updatedSettings.temperatureUnit);
    if (updatedSettings.darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    refreshWeather();
  };

  const setupGlobalEventListeners = () => {
    // Listen for settings changes
    window.addEventListener('settingsChanged', handleSettingsChange);

    // (Optionally) close dropdowns if clicking outside
    document.addEventListener('click', (e) => {
      if (!(e.target as HTMLElement).closest('.custom-dropdown')) {
        closeAllDropdowns();
      }
    });
  };

  // Called after stadium data is loaded => sets up the actual dropdown logic
  useEffect(() => {
    if (stadiumsMap.nfl.length > 0) {
      console.log('Stadium data loaded. Setting up dropdowns now...');
      initializeDropdowns();
    }
  }, [stadiumsMap]);

  const initializeDropdowns = () => {
    populateAllDropdowns(stadiumsMap);

    const leagues: LeagueType[] = ['nfl', 'ncaa', 'mlb', 'mls'];
    leagues.forEach((league) => {
      const dropdown = document.getElementById(`${league}Dropdown`) as HTMLElement;
      if (dropdown) {
        initializeCustomDropdown(dropdown, league);
      }
    });
  };

  const populateAllDropdowns = (data: StadiumsMap) => {
    Object.keys(data).forEach((league) => {
      populateDropdown(league as LeagueType, data[league as LeagueType]);
    });
  };

  const populateDropdown = (league: LeagueType, stadiums: StadiumInfo[]) => {
    const dropdown = document.getElementById(`${league}Dropdown`);
    if (!dropdown) return;

    const list = dropdown.querySelector('.dropdown-list') as HTMLElement;
    if (!list) return;

    // Clear existing except the search row
    list.innerHTML = `<li class="dropdown-search"><input type="text" placeholder="Search teams..." /></li>`;

    // Build set of unique teams
    const teamNames = new Set<string>();
    stadiums.forEach((s) => {
      if (s.team) {
        s.team.split(/,|\//).forEach((t) => teamNames.add(t.trim()));
      }
    });

    // 'All Teams'
    const allOption = document.createElement('li');
    allOption.textContent = `All ${league.toUpperCase()} Teams`;
    allOption.dataset.value = 'all';
    list.appendChild(allOption);

    // Individual teams
    Array.from(teamNames)
      .sort()
      .forEach((team) => {
        const li = document.createElement('li');
        li.textContent = team;
        li.dataset.value = team;
        list.appendChild(li);
      });
  };

  const initializeCustomDropdown = (dropdown: HTMLElement, league: LeagueType) => {
    const selected = dropdown.querySelector('.dropdown-selected') as HTMLElement;
    const list = dropdown.querySelector('.dropdown-list') as HTMLElement;
    const searchInput = list.querySelector('.dropdown-search input') as HTMLInputElement;

    dropdown.addEventListener('click', (e) => {
      console.log('Clicked dropdown for:', league); // debug
      e.stopPropagation();

      // If user didn't click inside search, toggle
      if (!e.target || !(e.target as HTMLElement).closest('.dropdown-search')) {
        closeAllDropdowns(dropdown);
        dropdown.classList.toggle('active');
        if (dropdown.classList.contains('active')) {
          searchInput.focus();
        }
      }
    });

    // Option selection
    list.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = e.target as HTMLElement;
      if (target.tagName.toLowerCase() === 'li' && !target.classList.contains('dropdown-search')) {
        const value = target.dataset.value;
        const text = target.textContent || '';
        if (selected) {
          selected.textContent = text;
          dropdown.classList.remove('active');
          handleDropdownSelection(league, value);
        }
      }
    });

    // Searching
    searchInput.addEventListener('input', () => {
      const filterVal = searchInput.value.toLowerCase();
      const items = list.querySelectorAll('li:not(.dropdown-search)');
      items.forEach((item) => {
        const txt = item.textContent?.toLowerCase() || '';
        (item as HTMLElement).style.display = txt.includes(filterVal) ? '' : 'none';
      });
    });
  };

  const closeAllDropdowns = (current?: HTMLElement) => {
    const allActive = document.querySelectorAll('.custom-dropdown.active');
    allActive.forEach((dd) => {
      if (dd !== current) {
        dd.classList.remove('active');
      }
    });
  };

  const handleDropdownSelection = async (league: LeagueType, selectedValue: string | undefined) => {
    if (!selectedValue) return;
    // Reset other leagues
    ['nfl', 'ncaa', 'mlb', 'mls'].forEach((l) => {
      if (l !== league) {
        const dd = document.getElementById(`${l}Dropdown`);
        const sel = dd?.querySelector('.dropdown-selected');
        if (sel) {
          sel.textContent = `Select ${l.toUpperCase()} Team`;
        }
      }
    });
    await refreshWeather();
  };

  // --- WEATHER ---

  const refreshWeather = async () => {
    const teams = getSelectedTeams();
    const dateInput = document.getElementById('weather-date') as HTMLInputElement;
    const dateVal = dateInput?.value || new Date().toISOString().split('T')[0];

    if (teams.length === 0) {
      showError('No team selected', 'Please select at least one team.', false);
      return;
    }

    try {
      const storedKey = safeGetItem('openweatherApiKey');
      const finalApiKey = storedKey || ENV_API_KEY;
      if (!finalApiKey) {
        throw new Error('OpenWeather API key not found in environment variables');
      }

      const results = await Promise.all(
        teams.map((stadium) => fetchWeatherForStadium(stadium, dateVal, finalApiKey))
      );
      setWeatherData(results);
      setError(null);
    } catch (err: any) {
      console.error('Error in refreshWeather:', err);
      showError('Could not fetch weather data', err.message, true);
    }
  };

  const getSelectedTeams = (): StadiumInfo[] => {
    const out: StadiumInfo[] = [];
    const leagues: LeagueType[] = ['nfl', 'ncaa', 'mlb', 'mls'];
    leagues.forEach((l) => {
      const dd = document.getElementById(`${l}Dropdown`);
      const selected = dd?.querySelector('.dropdown-selected')?.textContent;
      if (selected && !selected.includes('Select') && !selected.includes('Team')) {
        if (selected === `All ${l.toUpperCase()} Teams`) {
          out.push(...stadiumsMap[l]);
        } else {
          const matches = stadiumsMap[l].filter((s) => {
            return s.team.split(/,|\//).map((x) => x.trim()).includes(selected);
          });
          out.push(...matches);
        }
      }
    });
    return out;
  };

  const fetchWeatherForStadium = async (
    stadium: StadiumInfo,
    date: string,
    apiKey: string
  ): Promise<WeatherData> => {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${stadium.latitude}&lon=${stadium.longitude}&units=${
      temperatureUnit === 'C' ? 'metric' : 'imperial'
    }&appid=${apiKey}`;

    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`Weather fetch error: ${resp.statusText}`);
    }
    const json: WeatherDataResponse = await resp.json();
    return { stadium, weather: json };
  };

  const displayWeather = (): JSX.Element[] => {
    return weatherData.map(({ stadium, weather }) => (
      <WeatherCard key={stadium.name} stadium={stadium} weather={weather} />
    ));
  };

  const toggleTheme = () => {
    const newDark = !darkMode;
    setDarkMode(newDark);
    const current = SettingsManager.getAll();
    SettingsManager.saveSettings({ ...current, darkMode: newDark });
    if (newDark) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 min-h-screen relative">
      {/* Header */}
      <header className="header p-4 flex justify-between items-center bg-green-800 rounded-lg">
        <div className="flex items-center w-full">
          <button
            onClick={toggleTheme}
            className="icon-button theme-toggle focus:outline-none mr-4"
            aria-label="Toggle Dark Mode"
          >
            {darkMode ? '🌞' : '🌙'}
          </button>
          <h1 className="text-2xl font-bold text-white flex-grow text-center">
            Stadium Weather
          </h1>
          <button id="settings" className="icon-button">⚙</button>
        </div>
      </header>

      {/* Controls */}
      <div className="controls flex items-center space-x-4 p-4">
        <input
          type="date"
          id="weather-date"
          className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-800"
          defaultValue={new Date().toISOString().split('T')[0]}
        />

        <button
          id="refresh"
          className="primary-button bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => refreshWeather()}
        >
          Refresh
        </button>

        <button
          id="settings-btn"
          className="primary-button bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          onClick={() => SettingsManager.openModal()}
        >
          Settings
        </button>
      </div>

      {/* Dropdowns */}
      <div className="dropdowns-container relative p-4">
        <div className="custom-dropdown" id="nflDropdown">
          <label className="block text-gray-700 dark:text-gray-300">NFL</label>
          <div className="dropdown-selected">Select NFL Team</div>
          <ul className="dropdown-list" role="listbox">
            <li className="dropdown-search">
              <input type="text" placeholder="Search teams..." />
            </li>
          </ul>
        </div>

        <div className="custom-dropdown" id="ncaaDropdown">
          <label className="block text-gray-700 dark:text-gray-300">
            NCAA Football
          </label>
          <div className="dropdown-selected">Select NCAA Team</div>
          <ul className="dropdown-list" role="listbox">
            <li className="dropdown-search">
              <input type="text" placeholder="Search teams..." />
            </li>
          </ul>
        </div>

        <div className="custom-dropdown" id="mlbDropdown">
          <label className="block text-gray-700 dark:text-gray-300">MLB</label>
          <div className="dropdown-selected">Select MLB Team</div>
          <ul className="dropdown-list" role="listbox">
            <li className="dropdown-search">
              <input type="text" placeholder="Search teams..." />
            </li>
          </ul>
        </div>

        <div className="custom-dropdown" id="mlsDropdown">
          <label className="block text-gray-700 dark:text-gray-300">MLS</label>
          <div className="dropdown-selected">Select MLS Team</div>
          <ul className="dropdown-list" role="listbox">
            <li className="dropdown-search">
              <input type="text" placeholder="Search teams..." />
            </li>
          </ul>
        </div>
      </div>

      {/* Weather List */}
      <div id="weatherList" className="mt-6 space-y-4 p-4">
        {weatherData.length > 0 ? (
          displayWeather()
        ) : (
          <div>No weather data available.</div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message bg-yellow-100 border border-yellow-200 text-yellow-800 p-4 rounded m-4">
          <strong>{error.title}</strong>
          {error.message && <p>{error.message}</p>}
          <button
            className="primary-button mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            onClick={() => {
              if (error.isApiError) {
                SettingsManager.openModal();
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
