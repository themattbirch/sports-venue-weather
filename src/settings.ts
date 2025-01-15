// src/settings.ts

import { safeGetItem, safeSetItem } from './utils/storage';
import './styles/styles.css';

interface Settings {
  darkMode: boolean;
  temperatureUnit: 'F' | 'C';
  refreshInterval: number;
  retryAttempts: number;
  cacheExpiry: number;
  // Add other settings as needed
}

class SettingsManager {
  modal: HTMLElement | null = null;

  private defaultSettings: Settings = {
    darkMode: false,
    temperatureUnit: 'F',
    refreshInterval: 300000, // 5 minutes
    retryAttempts: 3,
    cacheExpiry: 3600000, // 1 hour
};

settings: Settings = this.defaultSettings;

  constructor() {
    this.loadSettings();
  }

  // Load settings from localStorage or use defaults
  loadSettings(): void {
    const stored = safeGetItem('settings');
    if (stored) {
      try {
        this.settings = JSON.parse(stored);
      } catch {
        console.warn('Failed to parse settings. Using default settings.');
        this.settings = { ...this.defaultSettings };
      }
    } else {
      this.settings = { ...this.defaultSettings };
    }
  }

  // Save updated settings to localStorage
  saveSettings(newSettings: Partial<Settings>): void {
    this.settings = { ...this.settings, ...newSettings };
    safeSetItem('settings', JSON.stringify(this.settings));
  }

  // Method to retrieve all settings
  getAll(): Settings {
    return this.settings;
  }

  // Create the settings modal
  createSettingsModal(): HTMLElement {
    const modal = document.createElement('div');
    modal.className = 'settings-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="settings-content bg-white dark:bg-gray-800 p-6 rounded shadow-lg w-full max-w-md relative">
        <h2 class="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Settings</h2>

        <div class="settings-section mb-4">
            <div class="setting-item mb-2">
                <label for="darkMode" class="block text-gray-700 dark:text-gray-300">Dark Mode</label>
                <input type="checkbox" id="darkMode" ${this.settings.darkMode ? "checked" : ""} class="mt-2">
            </div>
            <div class="setting-item mb-2">
                <label for="temperatureUnit" class="block text-gray-700 dark:text-gray-300">Temperature Unit</label>
                <select id="temperatureUnit" class="mt-1 block w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary">
                    <option value="F" ${this.settings.temperatureUnit === "F" ? "selected" : ""}>Fahrenheit (°F)</option>
                    <option value="C" ${this.settings.temperatureUnit === "C" ? "selected" : ""}>Celsius (°C)</option>
                </select>
            </div>
        </div>

        <div class="button-group flex justify-end space-x-2">
            <button class="cancel-btn bg-gray-500 text-white px-4 py-2 rounded mr-2 hover:bg-gray-600">Cancel</button>
            <button class="save-btn bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Save</button>
        </div>
      </div>
    `;
    return modal;
  }

  // Open the settings modal
  openModal(): void {
    if (this.modal) this.closeModal();
    this.modal = this.createSettingsModal();
    document.body.appendChild(this.modal);

    const saveBtn = this.modal.querySelector('.save-btn') as HTMLElement;
    const cancelBtn = this.modal.querySelector('.cancel-btn') as HTMLElement;

    saveBtn.addEventListener('click', () => this.saveAndClose());
    cancelBtn.addEventListener('click', () => this.closeModal());

    // Close if user clicks outside content
    this.modal.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).classList.contains('settings-modal')) {
        this.closeModal();
      }
    });
  }

  // Close the settings modal
  closeModal(): void {
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
  }

  // Save settings and close modal
  saveAndClose(): void {
    if (!this.modal) return;

    const darkModeCheckbox = this.modal.querySelector('#darkMode') as HTMLInputElement;
    const temperatureSelect = this.modal.querySelector('#temperatureUnit') as HTMLSelectElement;

    const newSettings: Partial<Settings> = {
      darkMode: darkModeCheckbox.checked,
      temperatureUnit: temperatureSelect.value as 'F' | 'C',
    };

    this.saveSettings(newSettings);
    this.closeModal();
    window.dispatchEvent(new Event('settingsChanged')); // Notify other parts of the app if needed
  }
}

// Create and export a singleton instance of SettingsManager
const settingsManager = new SettingsManager();

export default settingsManager;
