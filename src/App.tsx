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

  // Dark mode & temperature unit from settings
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [temperatureUnit, setTemperatureUnit] = useState<'F' | 'C'>('F');

  // 1) On mount, load user settings, apply .dark if needed, load stadium data, setup listeners
  useEffect(() => {
    (async () => {
      try {
        // 1a) Load user settings
        const storedSettings = SettingsManager.getAll();
        setDarkMode(storedSettings.darkMode);
        setTemperatureUnit(storedSettings.temperatureUnit);

        // 1b) Apply .dark on <html> if dark mode is on
        if (storedSettings.darkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }

        // 1c) Check OpenWeather API key
        const storedApiKey = safeGetItem('openweatherApiKey');
        const finalApiKey = storedApiKey || ENV_API_KEY;
        if (!finalApiKey) {
          throw new Error(
            'OpenWeather API key not found in environment variables'
          );
        }

        // 1d) Load stadium data
        const stadiumData = await loadStadiumData();
        setStadiumsMap(stadiumData);

        // 1e) Setup global event listeners
        setupGlobalEventListeners();
      } catch (err: any) {
        console.error('Initialization error:', err);
        showError('Initialization Error', err.message, true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  // 2) If the temperature unit changes, and we already have a selected team, refresh weather
  useEffect(() => {
    const selectedTeams = getSelectedTeams();
    if (selectedTeams.length > 0) {
      refreshWeather();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [temperatureUnit]);

  // 3) Once stadium data is loaded, initialize dropdowns
  useEffect(() => {
    if (stadiumsMap.nfl.length > 0) {
      initializeDropdowns();
    }
  }, [stadiumsMap]);

  // --- CORE LOGIC ---

  const loadStadiumData = async (): Promise<StadiumsMap> => {
    try {
      // fetch both files in parallel
      const [footballResp, otherResp] = await Promise.all([
        fetch('/data/stadium_coordinates.json'),
        fetch('/data/more_stadium_coordinates.json'),
      ]);

      if (!footballResp.ok)
        throw new Error('Failed to load football stadium data');
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

  const setupGlobalEventListeners = () => {
    // Listen for settings changes (dark mode, temperature unit)
    window.addEventListener('settingsChanged', handleSettingsChange);

    // Close any open dropdown if user clicks outside
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

    // Toggle .dark on <html>
    if (updatedSettings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // 4) Initialize dropdowns after stadium data loaded
  const initializeDropdowns = () => {
    populateAllDropdowns(stadiumsMap);

    const leagues: LeagueType[] = ['nfl', 'ncaa', 'mlb', 'mls'];
    leagues.forEach((league) => {
      const dropdown = document.getElementById(
        `${league}Dropdown`
      ) as HTMLElement;
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

    // Clear except search row
    list.innerHTML = `<li class="dropdown-search"><input type="text" placeholder="Search teams..." /></li>`;

    const teamNames = new Set<string>();
    stadiums.forEach((s) => {
      if (s.team) {
        // some stadiums might have multiple teams
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

  const initializeCustomDropdown = (
    dropdown: HTMLElement,
    league: LeagueType
  ) => {
    const selected = dropdown.querySelector(
      '.dropdown-selected'
    ) as HTMLElement;
    const list = dropdown.querySelector('.dropdown-list') as HTMLElement;
    const searchInput = list.querySelector(
      '.dropdown-search input'
    ) as HTMLInputElement;

    // Toggle open/close on click (unless clicking in search)
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

    // Handle selection
    list.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = e.target as HTMLElement;
      if (
        target.tagName.toLowerCase() === 'li' &&
        !target.classList.contains('dropdown-search')
      ) {
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
        (item as HTMLElement).style.display = txt.includes(filterVal)
          ? ''
          : 'none';
      });
    });
  };

  const closeAllDropdowns = (current?: HTMLElement) => {
    const activeDropdowns = document.querySelectorAll(
      '.custom-dropdown.active'
    );
    activeDropdowns.forEach((dd) => {
      if (dd !== current) {
        dd.classList.remove('active');
      }
    });
  };

  const handleDropdownSelection = async (
    league: LeagueType,
    selectedValue: string | undefined
  ) => {
    if (!selectedValue) return;

    // Reset other leagues
    const leagues: LeagueType[] = ['nfl', 'ncaa', 'mlb', 'mls'];
    leagues.forEach((l) => {
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

  // 5) Weather fetch logic
  const refreshWeather = async () => {
    const teams = getSelectedTeams();
    const dateInput = document.getElementById(
      'weather-date'
    ) as HTMLInputElement;
    const dateVal = dateInput?.value || new Date().toISOString().split('T')[0];

    if (teams.length === 0) {
      showError('No team selected', 'Please select at least one team.', false);
      return;
    }

    try {
      const storedKey = safeGetItem('openweatherApiKey');
      const finalApiKey = storedKey || ENV_API_KEY;
      if (!finalApiKey) {
        throw new Error(
          'OpenWeather API key not found in environment variables'
        );
      }

      const results = await Promise.all(
        teams.map((stadium) =>
          fetchWeatherForStadium(stadium, dateVal, finalApiKey)
        )
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
      if (
        selected &&
        !selected.includes('Select') &&
        !selected.includes('Team')
      ) {
        if (selected === `All ${l.toUpperCase()} Teams`) {
          out.push(...stadiumsMap[l]);
        } else {
          // handle multi-team stadium
          const matches = stadiumsMap[l].filter((s) =>
            s.team
              .split(/,|\//)
              .map((x) => x.trim())
              .includes(selected)
          );
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
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${
      stadium.latitude
    }&lon=${stadium.longitude}&units=${
      temperatureUnit === 'C' ? 'metric' : 'imperial'
    }&appid=${apiKey}`;

    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`Weather fetch error: ${resp.statusText}`);
    }
    const json = await resp.json();

    // Convert selected date to timestamp for comparison
    const selectedDate = new Date(date);
    selectedDate.setHours(12, 0, 0, 0); // Noon on selected date
    const targetTimestamp = selectedDate.getTime() / 1000;

    // Find forecast closest to selected date
    const forecast = json.list.reduce((closest: any, current: any) => {
      if (!closest) return current;

      return Math.abs(current.dt - targetTimestamp) <
        Math.abs(closest.dt - targetTimestamp)
        ? current
        : closest;
    });

    return {
      stadium,
      weather: {
        ...forecast,
        main: forecast.main,
        weather: forecast.weather,
        wind: forecast.wind,
        rain: forecast.rain || null,
        snow: forecast.snow || null,
      },
    };
  };

  // 6) Renders the weather cards
  const displayWeather = (): JSX.Element[] => {
    return weatherData.map(({ stadium, weather }) => (
      <WeatherCard
        key={stadium.name}
        stadium={stadium}
        weather={weather}
        temperatureUnit={temperatureUnit}
      />
    ));
  };

  // 7) Toggle theme manually from the header button
  const toggleTheme = () => {
    const newDark = !darkMode;
    setDarkMode(newDark);
    const current = SettingsManager.getAll();
    SettingsManager.saveSettings({ ...current, darkMode: newDark });

    if (newDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <div className="app-background min-h-screen">
      <div className="app-card mx-auto mt-6 mb-6 p-4 max-w-md rounded-lg shadow-lg bg-white dark:bg-gray-800">
        {/* Header */}
        <header className="header mb-4 p-3 bg-green-800 rounded text-white flex justify-between items-center">
          <button
            onClick={toggleTheme}
            className="icon-button theme-toggle focus:outline-none mr-3"
            aria-label="Toggle Dark Mode"
          >
            {darkMode ? '🌞' : '🌙'}
          </button>
          <h1 className="text-xl font-bold flex-grow text-center">
            Sports Venue Weather
          </h1>
          <button
            id="football-icon"
            className="icon-button"
            onClick={() => SettingsManager.openModal()}
            aria-label="Open Settings"
          >
            <svg>
              <use href="/icons/football_icon.svg#football-icon"></use>
            </svg>
          </button>
        </header>
        {/* Dropdowns */}
        <div className="dropdowns-container mb-4">
          {/* NFL */}
          <div className="custom-dropdown" id="nflDropdown">
            <label className="block text-gray-800 dark:text-gray-200 mb-1">
              NFL
            </label>
            <div className="dropdown-selected">Select NFL Team</div>
            <ul className="dropdown-list" role="listbox">
              <li className="dropdown-search">
                <input type="text" placeholder="Search teams..." />
              </li>
            </ul>
          </div>
          {/* NCAA */}
          <div className="custom-dropdown" id="ncaaDropdown">
            <label className="block text-gray-800 dark:text-gray-200 mb-1">
              NCAA Football
            </label>
            <div className="dropdown-selected">Select NCAA Team</div>
            <ul className="dropdown-list" role="listbox">
              <li className="dropdown-search">
                <input type="text" placeholder="Search teams..." />
              </li>
            </ul>
          </div>
          {/* MLB */}
          <div className="custom-dropdown" id="mlbDropdown">
            <label className="block text-gray-800 dark:text-gray-200 mb-1">
              MLB
            </label>
            <div className="dropdown-selected">Select MLB Team</div>
            <ul className="dropdown-list" role="listbox">
              <li className="dropdown-search">
                <input type="text" placeholder="Search teams..." />
              </li>
            </ul>
          </div>
          {/* MLS */}
          <div className="custom-dropdown" id="mlsDropdown">
            <label className="block text-gray-800 dark:text-gray-200 mb-1">
              MLS
            </label>
            <div className="dropdown-selected">Select MLS Team</div>
            <ul className="dropdown-list" role="listbox">
              <li className="dropdown-search">
                <input type="text" placeholder="Search teams..." />
              </li>
            </ul>
          </div>
        </div>

        {/* Controls */}
        <div className="controls flex items-center justify-center gap-2 sm:gap-4 mb-4">
          <button
            id="refresh"
            className="primary-button text-sm px-3 sm:px-4 py-1.5 sm:py-2"
            onClick={() => refreshWeather()}
          >
            Refresh
          </button>

          <div className="date-input-wrapper relative flex items-center">
            <input
              type="date"
              id="weather-date"
              className="
        px-2 sm:px-3 py-1.5 sm:py-2
        border border-gray-300 dark:border-gray-600
        rounded
        bg-white dark:bg-gray-700
        text-gray-800 dark:text-gray-100
        focus:outline-none focus:ring-2 focus:ring-primary
        transition-colors
        w-auto
        text-sm sm:text-base
      "
              style={{ minWidth: '8rem' }} /* optional inline style */
              min={new Date().toISOString().split('T')[0]}
              max={
                new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
                  .toISOString()
                  .split('T')[0]
              }
              defaultValue={new Date().toISOString().split('T')[0]}
              onChange={() => refreshWeather()}
            />

            {/* This button is only visible on pointer: coarse (mobile).
        On desktop (pointer: fine), it hides automatically in CSS. */}
            <button
              type="button"
              className="calendar-icon"
              onClick={() => {
                const dateEl = document.getElementById(
                  'weather-date'
                ) as HTMLInputElement;
                // Attempt to open date picker on mobile
                // Some browsers now support .showPicker()
                if (dateEl?.showPicker) {
                  dateEl.showPicker();
                } else {
                  dateEl?.click();
                }
              }}
            />
          </div>

          <button
            id="settings-btn"
            className="primary-button text-sm px-3 sm:px-4 py-1.5 sm:py-2"
            onClick={() => SettingsManager.openModal()}
          >
            Settings
          </button>
        </div>

        {/* Weather List Container */}
        <div id="weatherList" className="text-center mb-4">
          {' '}
          {/* Added text-center */}
          {weatherData.length > 0 ? (
            displayWeather()
          ) : (
            <div className="text-gray-600 dark:text-gray-300">
              Weather data will load here when you choose a venue.
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div
            className="error-message rounded p-4 mt-4 flex flex-col items-center text-center"
            style={{
              background: 'rgba(234, 179, 8, 0.08)',
              border: '1px solid rgba(234, 179, 8, 0.2)',
              color: '#92400e',
            }}
          >
            <strong>{error.title}</strong>
            {error.message && <p>{error.message}</p>}
            <button
              className="primary-button mt-2"
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
    </div>
  );
};

export default App;
