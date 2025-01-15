// /src/settings.ts

import { safeGetItem, safeSetItem } from './utils/storage';
import './styles/styles.css';

interface AlertSettings {
  highTemp: number;
  lowTemp: number;
  windSpeed: number;
  rainAmount: number;
  snowAmount: number;
}

interface DisplaySettings {
  showTrends: boolean;
  showAlerts: boolean;
  temperature: 'F' | 'C';
  refreshInterval: number;
}

interface Settings {
  alerts: AlertSettings;
  display: DisplaySettings;
}

class SettingsManager {
  modal: HTMLElement | null = null;
  settings!: Settings;

  private defaultSettings: Settings = {
    alerts: {
      highTemp: 90,
      lowTemp: 32,
      windSpeed: 20,
      rainAmount: 5,
      snowAmount: 2,
    },
    display: {
      showTrends: true,
      showAlerts: true,
      temperature: 'F',
      refreshInterval: 30,
    },
  };

  constructor() {
    this.loadSettings();
  }

  loadSettings(): void {
    const stored = safeGetItem('settings');
    if (stored) {
      this.settings = JSON.parse(stored);
    } else {
      this.settings = { ...this.defaultSettings };
    }
  }

  saveSettings(newSettings: Partial<Settings>): void {
    this.settings = { ...this.settings, ...newSettings };
    safeSetItem('settings', JSON.stringify(this.settings));
  }

  createSettingsModal(): HTMLElement {
    const modal = document.createElement('div');
    modal.className = 'settings-modal';
    modal.innerHTML = `
      <div class="settings-content">
        <h2>Weather Settings</h2>

        <div class="settings-section">
          <h3>Alert Thresholds</h3>
          <div class="setting-item">
            <label>High Temperature Alert (°F)</label>
            <input type="number" id="highTemp" value="${this.settings.alerts.highTemp}">
          </div>
          <div class="setting-item">
            <label>Low Temperature Alert (°F)</label>
            <input type="number" id="lowTemp" value="${this.settings.alerts.lowTemp}">
          </div>
          <div class="setting-item">
            <label>Wind Speed Alert (mph)</label>
            <input type="number" id="windSpeed" value="${this.settings.alerts.windSpeed}">
          </div>
        </div>

        <div class="settings-section">
          <h3>Display Options</h3>
          <div class="setting-item">
            <label>
              <input type="checkbox" id="showTrends"
                ${this.settings.display.showTrends ? 'checked' : ''}>
              Show Weather Trends
            </label>
          </div>
          <div class="setting-item">
            <label>Temperature Unit</label>
            <select id="tempUnit">
              <option value="F" ${this.settings.display.temperature === 'F' ? 'selected' : ''}>Fahrenheit</option>
              <option value="C" ${this.settings.display.temperature === 'C' ? 'selected' : ''}>Celsius</option>
            </select>
          </div>
        </div>

        <div class="button-group">
          <button id="saveSettings" class="primary save-btn">Save Settings</button>
          <button id="closeSettings" class="cancel-btn">Cancel</button>
        </div>
      </div>
    `;
    return modal;
  }

  openModal(): void {
    if (this.modal) this.closeModal();
    this.modal = this.createSettingsModal();
    document.body.appendChild(this.modal);

    const saveBtn = this.modal.querySelector('#saveSettings') as HTMLButtonElement;
    const closeBtn = this.modal.querySelector('#closeSettings') as HTMLButtonElement;

    saveBtn.addEventListener('click', () => this.saveAndClose());
    closeBtn.addEventListener('click', () => this.closeModal());

    // Close if user clicks outside content
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.closeModal();
      }
    });
  }

  closeModal(): void {
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
  }

  saveAndClose(): void {
    const modalEl = this.modal!;
    const newSettings: Partial<Settings> = {
      alerts: {
        highTemp: parseInt((modalEl.querySelector('#highTemp') as HTMLInputElement).value),
        lowTemp: parseInt((modalEl.querySelector('#lowTemp') as HTMLInputElement).value),
        windSpeed: parseInt((modalEl.querySelector('#windSpeed') as HTMLInputElement).value),
        rainAmount: this.settings.alerts.rainAmount,
        snowAmount: this.settings.alerts.snowAmount,
      },
      display: {
        showTrends: (modalEl.querySelector('#showTrends') as HTMLInputElement).checked,
        showAlerts: this.settings.display.showAlerts,
        temperature: (modalEl.querySelector('#tempUnit') as HTMLSelectElement).value as 'F' | 'C',
        refreshInterval: this.settings.display.refreshInterval,
      },
    };

    this.saveSettings(newSettings);
    this.closeModal();
    window.dispatchEvent(new Event('settingsChanged'));
  }
}

export default SettingsManager;
