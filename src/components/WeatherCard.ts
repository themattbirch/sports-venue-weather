// /src/components/WeatherCard.ts

import { StadiumInfo, WeatherDataResponse } from '../types'; 

export class WeatherCard {
  private container: HTMLElement;

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'weather-card bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4 flex flex-col';
  }

  updateWeather(weatherData: WeatherDataResponse, stadium: StadiumInfo): HTMLElement {
    console.log('Updating weather card - Full data:', JSON.stringify({ weatherData, stadium }, null, 2));

    if (!weatherData || !stadium) {
      console.error('Missing weather data or stadium info');
      this.container.innerHTML = `
        <div class="error-message bg-yellow-100 border border-yellow-200 text-yellow-800 p-4 rounded">
          <strong>Error:</strong> Missing weather data or stadium information.
        </div>
      `;
      return this.container;
    }

    // Destructure without default value
    const { main, weather, wind } = weatherData;

    // Access properties with proper type safety
    const windDirection = wind.deg ? this.getWindDirection(wind.deg) : 'N/A';
    const windSpeed = wind.speed ? Math.round(wind.speed) : 0;

    // Handle cases where weather array might be empty
    const weatherDescription = weather.length > 0 ? weather[0].description : 'No description available';

    // Define SVG icons
    const temperatureIcon = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 1v11m0 0l4-4m-4 4l-4-4m6 13a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    `;
    const humidityIcon = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a7.5 7.5 0 017.5 7.5c0 3.354-2.4 6.2-5.5 6.2H11.5C8.4 17.054 6 14.2 6 10.854a7.5 7.5 0 017.5-7.5z" />
      </svg>
    `;
    const windIcon = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16h4m0 0h-4m4 0v-4m0 4l-6-6m6 6L11 6" />
      </svg>
    `;
    const feelsLikeIcon = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12h18M9 16h6" />
      </svg>
    `;

    // Build the HTML content
    this.container.innerHTML = `
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold">${stadium.name}</h3>
          <p class="text-sm text-gray-500">${stadium.team}</p>
        </div>
        <img 
          src="https://openweathermap.org/img/wn/${weather[0]?.icon}@2x.png" 
          alt="${weatherDescription}" 
          class="w-12 h-12"
        />
      </div>
      <div class="mt-4 grid grid-cols-2 gap-4">
        <div class="flex items-center gap-2">
          ${temperatureIcon}
          <div>
            <p class="text-sm text-gray-500">Temperature</p>
            <p class="font-medium">${Math.round(main.temp)}°F</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          ${humidityIcon}
          <div>
            <p class="text-sm text-gray-500">Humidity</p>
            <p class="font-medium">${main.humidity}%</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          ${windIcon}
          <div>
            <p class="text-sm text-gray-500">Wind Speed</p>
            <p class="font-medium">${windSpeed} mph ${windDirection}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          ${feelsLikeIcon}
          <div>
            <p class="text-sm text-gray-500">Feels Like</p>
            <p class="font-medium">${Math.round(main.feels_like)}°F</p>
          </div>
        </div>
      </div>
      ${this.getPrecipitationInfo(weatherData)}
    `;

    return this.container;
  }

  private getPrecipitationInfo(weatherData: WeatherDataResponse): string {
    const rain = weatherData.rain?.['1h'] || 0;
    const snow = weatherData.snow?.['1h'] || 0;

    if (rain > 0 || snow > 0) {
      return `
        <div class="mt-4 grid grid-cols-2 gap-4">
          ${rain > 0 ? `
            <div class="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M13 5v6h6" />
              </svg>
              <div>
                <p class="text-sm text-gray-500">Rain</p>
                <p class="font-medium">${rain} mm/h</p>
              </div>
            </div>
          ` : ''}
          ${snow > 0 ? `
            <div class="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m8.66-11.66l-.707.707M6.343 6.343l-.707.707M21 12h-1M4 12H3m16.95 7.95l-.707-.707M6.343 17.657l-.707-.707" />
              </svg>
              <div>
                <p class="text-sm text-gray-500">Snow</p>
                <p class="font-medium">${snow} mm/h</p>
              </div>
            </div>
          ` : ''}
        </div>
      `;
    }
    return '';
  }

  private getWindDirection(degrees: number): string {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                       'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  }

  render(): HTMLElement {
    return this.container;
  }
}
