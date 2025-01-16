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

const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || '';

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
    // We won't do advanced DOM event listeners until stadium data is loaded.
  }, []);

  // Once stadiumsMap is loaded, do the DOM-based dropdown logic
  useEffect(() => {
    if (stadiumsMap.nfl.length > 0) {
      setupEventListeners();
      initializeDropdowns();
    }
  }, [stadiumsMap]);

  const initializeApp = async () => {
    try {
      // Retrieve API key from safe storage if available
      const storedApiKey = safeGetItem('openweatherApiKey');
      const apiKey = storedApiKey || OPENWEATHER_API_KEY;
      if (!apiKey) {
        throw new Error('OpenWeather API key not found in environment variables');
      }

      // Retrieve dark mode and temperature unit preferences
      const storedSettings = SettingsManager.getAll();
      setDarkMode(storedSettings.darkMode || false);
      setTemperatureUnit(storedSettings.temperatureUnit || 'F');

      // Apply dark mode if enabled
      if (storedSettings.darkMode) {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }

      // Load stadium data
      // Make sure the files exist in /public/data
      const stadiumData = await loadStadiumData();
      setStadiumsMap(stadiumData);
    } catch (err: any) {
      console.error('Initialization error:', err);
      showError('Initialization Error', err.message, true);
    }
  };

  const loadStadiumData = async (): Promise<StadiumsMap> => {
    try {
      // Since they're in /public/data, we fetch them by absolute path "/data"
      // (Vercel rewrites handle the /app route).
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
      showError(
        'Could not load stadium data',
        'Check your connection and try again.',
        true
      );
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

  const checkApiKey = (): void => {
    if (!OPENWEATHER_API_KEY) {
      throw new Error('OpenWeather API key not found in environment variables');
    }
  };

  // --- DROPDOWN + EVENT HANDLING LOGIC ---

  // This populates the <li> elements for each league
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
    list.innerHTML = `<li class="dropdown-search"><input type="text" placeholder="Search teams..." /></li>`;

    // Gather all teams from stadium data
    const teamNames = new Set<string>();
    stadiums.forEach((stadium) => {
      if (stadium.team) {
        // Some stadiums might hold multiple teams, so we split
        stadium.team.split(/,|\//).forEach((t) => teamNames.add(t.trim()));
      }
    });

    // 'All Teams' entry
    const allOption = document.createElement('li');
    allOption.textContent = `All ${type.toUpperCase()} Teams`;
    allOption.dataset.value = 'all';
    list.appendChild(allOption);

    // Each team
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

    // Setup settings buttons (both 'settings' and 'settings-btn')
    const settingsBtn = document.getElementById('settings');
    const settingsBtnText = document.getElementById('settings-btn');

    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => SettingsManager.openModal());
    }
    if (settingsBtnText) {
      settingsBtnText.addEventListener('click', () => SettingsManager.openModal());
    }

    // Listen for settings changes
    window.addEventListener('settingsChanged', handleSettingsChange);

    // Close dropdowns if clicking outside
    document.addEventListener('click', (e) => {
      if (!(e.target as HTMLElement).closest('.custom-dropdown')) {
        closeAllDropdowns();
      }
    });
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
    refreshWeather(); // Update displayed weather if unit changed
  };

  const initializeDropdowns = () => {
    // Populate data first
    populateAllDropdowns(stadiumsMap);

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
      // If user didn't click inside the search box, toggle open/close
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
        const selectedValue = target.dataset.value;
        const selectedText = target.textContent || '';
        if (selected) {
          selected.textContent = selectedText;
          dropdown.classList.remove('active');
          handleDropdownSelection(type, selectedValue);
        }
      }
    });

    // Searching
    searchInput.addEventListener('input', () => {
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
              list.querySelectorAll(
                'li:not(.dropdown-search):not([style*="display: none"])'
              )
            ) as HTMLElement[];
            if (visibleItems.length > 0) {
              visibleItems[0].click();
            }
          } else {
            dropdown.click();
          }
          break;
        case 'Escape':
          if (active) dropdown.classList.remove('active');
          break;
        case 'ArrowDown':
          if (active) {
            e.preventDefault();
            const visibleItems = Array.from(
              list.querySelectorAll(
                'li:not(.dropdown-search):not([style*="display: none"])'
              )
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
    dropdowns.forEach((dd) => {
      if (dd !== currentDropdown) {
        dd.classList.remove('active');
      }
    });
  };

  const handleDropdownSelection = async (type: LeagueType, selectedValue: string | undefined) => {
    if (!selectedValue) return;

    // When user selects one league's team, reset the others
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
      checkApiKey();
      const results = await Promise.all(
        teams.map((stadium) => fetchWeatherForStadium(stadium, dateVal))
      );
      setWeatherData(results);
      setError(null);
    } catch (err: any) {
      console.error('Error in refreshWeather:', err);
      showError('Could not fetch weather data', err.message, true);
    }
  };

  const getSelectedTeams = (): StadiumInfo[] => {
    const chosen: StadiumInfo[] = [];
    const types: LeagueType[] = ['nfl', 'ncaa', 'mlb', 'mls'];

    types.forEach((type) => {
      const dropdown = document.getElementById(`${type}Dropdown`);
      const selected = dropdown?.querySelector('.dropdown-selected')?.textContent;
      if (selected && !selected.includes('Select') && !selected.includes('Team')) {
        // Check if user clicked 'All TEAMS'
        if (selected === `All ${type.toUpperCase()} Teams`) {
          chosen.push(...stadiumsMap[type]);
        } else {
          // Some stadium objects have multiple possible 'team' text
          const filtered = stadiumsMap[type].filter((s) => {
            // s.team can be "Team A / Team B", so we check if selected is in that string
            return s.team.split(/,|\//).map((x) => x.trim()).includes(selected);
          });
          chosen.push(...filtered);
        }
      }
    });
    return chosen;
  };

  const fetchWeatherForStadium = async (stadium: StadiumInfo, date: string): Promise<WeatherData> => {
    // The date param is not used by OpenWeather's current endpoint,
    // but you can incorporate it later if you add historical/forecast logic.
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${
      stadium.latitude
    }&lon=${
      stadium.longitude
    }&units=${
      temperatureUnit === 'C' ? 'metric' : 'imperial'
    }&appid=${OPENWEATHER_API_KEY}`;

    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`Weather fetch error: ${resp.statusText}`);
    }
    const weatherJson: WeatherDataResponse = await resp.json();

    return { stadium, weather: weatherJson };
  };

  const displayWeather = (): JSX.Element[] => {
    return weatherData.map(({ stadium, weather }) => (
      <WeatherCard key={stadium.name} stadium={stadium} weather={weather} />
    ));
  };

  const toggleTheme = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);

    // Save to settings manager
    const currentSettings = SettingsManager.getAll();
    SettingsManager.saveSettings({
      ...currentSettings,
      darkMode: newDarkMode,
    });

    // Update DOM
    if (newDarkMode) {
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
          {/* Moon/Sun SVG for Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="icon-button theme-toggle focus:outline-none mr-4"
            aria-label="Toggle Dark Mode"
          >
            {darkMode ? (
              // Sun Icon for Light Mode
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="#eab308"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v2m0 14v2M5.45 5.45l1.41 1.41m10.28 10.28l1.41 1.41M3 12h2m14 0h2M5.45 18.55l1.41-1.41m10.28-10.28l1.41-1.41M12 7a5 5 0 110 10 5 5 0 010-10z"
                />
              </svg>
            ) : (
              // Moon Icon for Dark Mode
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-gray-800 dark:text-gray-200"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"
                />
              </svg>
            )}
          </button>

          <h1 className="text-2xl font-bold text-white flex-grow text-center">
            Stadium Weather
          </h1>

          <button id="settings" className="icon-button">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              width="24"
              height="24"
            >
              <path
                d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5zm7.43-2.53c.04-.32.07-.64.07-.97 0-.33-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65A.488.488 0 0 0 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98 0 .33.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65z"
              />
            </svg>
          </button>
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
        >
          Refresh
        </button>

        <button
          id="settings-btn"
          className="primary-button bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Settings
        </button>
      </div>

      {/* Dropdowns */}
      <div className="dropdowns-container">
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
