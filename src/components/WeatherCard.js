export class WeatherCard {
  constructor() {
    console.log('WeatherCard component initialized');
    this.container = null;
    this.initialize();
  }

  initialize() {
    console.log('Initializing WeatherCard');
    this.container = document.createElement('div');
    this.container.className = 'game-card';
  }

  updateWeather(weatherData, stadium) {
    console.log('Updating weather card - Full data:', JSON.stringify({ weatherData, stadium }, null, 2));
    
    if (!weatherData || !stadium) {
      console.error('Missing weather data or stadium info');
      return this.container;
    }
    
    const { main, weather, wind = {} } = weatherData;
    const windDirection = wind.deg ? this.getWindDirection(wind.deg) : 'N/A';
    const windSpeed = wind.speed ? Math.round(wind.speed) : 0;

    this.container.innerHTML = `
      <div class="weather-icon-container">
        <img class="weather-icon" 
             src="https://openweathermap.org/img/w/${weather[0].icon}.png" 
             alt="${weather[0].description}">
        <div class="temperature">${Math.round(main.temp)}°F</div>
      </div>
      <div class="game-info">
        <h3>${stadium.name}</h3>
        <div class="team-name">${stadium.team}</div>
        <div class="conditions">${weather[0].description}</div>
        <div class="weather-details">
          <div class="detail">
            <span class="label">Feels like:</span> 
            <span class="value">${Math.round(main.feels_like)}°F</span>
          </div>
          <div class="detail">
            <span class="label">Wind:</span> 
            <span class="value">${windSpeed} mph ${windDirection}</span>
          </div>
          <div class="detail">
            <span class="label">Humidity:</span> 
            <span class="value">${main.humidity}%</span>
          </div>
          ${this.getPrecipitationInfo(weatherData)}
        </div>
      </div>
    `;

    return this.container;
  }

  getPrecipitationInfo(weatherData) {
    const rain = weatherData?.rain?.['1h'] || 0;
    const snow = weatherData?.snow?.['1h'] || 0;
    
    if (rain > 0 || snow > 0) {
      return `
        <div class="detail precipitation">
          ${rain > 0 ? `<span class="label">Rain:</span> <span class="value">${rain} mm/h</span>` : ''}
          ${snow > 0 ? `<span class="label">Snow:</span> <span class="value">${snow} mm/h</span>` : ''}
        </div>
      `;
    }
    return '';
  }

  getWindDirection(degrees) {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                       'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  }

  render() {
    return this.container;
  }
} 