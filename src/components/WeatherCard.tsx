// src/components/WeatherCard.tsx
import React from 'react';
import { StadiumInfo, WeatherDataResponse } from '../types';

interface WeatherCardProps {
  stadium: StadiumInfo;
  weather: WeatherDataResponse;
  temperatureUnit: 'F' | 'C';
}

export const WeatherCard: React.FC<WeatherCardProps> = ({
  stadium,
  weather,
  temperatureUnit,
}) => {
  const getWindDirection = (degrees: number): string => {
    const directions = [
      'N',
      'NNE',
      'NE',
      'ENE',
      'E',
      'ESE',
      'SE',
      'SSE',
      'S',
      'SSW',
      'SW',
      'WSW',
      'W',
      'WNW',
      'NW',
      'NNW',
    ];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  };

  const getPrecipitationInfo = (
    weatherData: WeatherDataResponse
  ): JSX.Element | null => {
    const rain = weatherData.rain?.['1h'] || 0;
    const snow = weatherData.snow?.['1h'] || 0;
    if (rain > 0 || snow > 0) {
      return (
        <div className="mt-4 grid grid-cols-2 gap-4">
          {rain > 0 && (
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M13 5v6h6"
                />
              </svg>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-200">Rain</p>
                <p className="font-medium">{rain} mm/h</p>
              </div>
            </div>
          )}
          {snow > 0 && (
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-blue-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m8.66-11.66l-.707.707M6.343 6.343l-.707.707M21 12h-1M4 12H3m16.95 7.95l-.707-.707M6.343 17.657l-.707-.707"
                />
              </svg>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-200">Snow</p>
                <p className="font-medium">{snow} mm/h</p>
              </div>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const { main, weather: weatherArray, wind } = weather;
  const windDirection = wind.deg ? getWindDirection(wind.deg) : 'N/A';
  const windSpeed = wind.speed ? Math.round(wind.speed) : 0;

  const weatherDescription =
    weatherArray.length > 0
      ? weatherArray[0].description
      : 'No description available';
  const weatherIcon = weatherArray.length > 0 ? weatherArray[0].icon : '01d';

  return (
    <div className="weather-card p-2">
      {/* Stadium Name + Team */}
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold">{stadium.name}</h3>
        <p className="text-sm text-gray-400 dark:text-gray-200">
          {stadium.team}
        </p>
      </div>

      <div className="relative">
        <div className="grid grid-cols-2 gap-6 px-8">
          {/* Left side: Temperature */}
          <div className="flex items-start justify-start gap-3">
            <svg
              className="h-6 w-6 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5z"
              />
            </svg>
            <div className="text-left">
              <p className="text-sm text-gray-500 dark:text-gray-100">
                Temperature
              </p>
              <p className="font-medium">
                {Math.round(main.temp)}°{temperatureUnit}
              </p>
            </div>
          </div>

          {/* Right side: Wind Speed (use items-center) */}
          <div className="flex items-center justify-end gap-3">
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-200">
                Wind Speed
              </p>
              <p className="font-medium">
                {windSpeed} mph {windDirection}
              </p>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-gray-500 dark:text-gray-200"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16h4m0 0h-4m4 0v-4m0 4l-6-6m6 6L11 6"
              />
            </svg>
          </div>

          {/* Left side: Humidity */}
          <div className="flex items-start justify-start gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a7.5 7.5 0 0 1 7.5 7.5c0 3.354-2.4 6.2-5.5 6.2H11.5c-3.1 0-5.5-2.854-5.5-6.2a7.5 7.5 0 0 1 7.5-7.5z"
              />
            </svg>
            <div className="text-left">
              <p className="text-sm text-gray-500 dark:text-gray-200">
                Humidity
              </p>
              <p className="font-medium">{main.humidity}%</p>
            </div>
          </div>

          {/* Right side: Feels Like (use items-center) */}
          <div className="flex items-center justify-end gap-3">
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-200">
                Feels Like
              </p>
              <p className="font-medium">
                {Math.round(main.feels_like)}°{temperatureUnit}
              </p>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 3v1m0 16v1m8.66-11.66l-.707.707M6.343 6.343l-.707.707M21 12h-1M4 12H3m16.95 7.95l-.707-.707M6.343 17.657l-.707-.707"
              />
            </svg>
          </div>
        </div>

        {/* Centered Weather Icon */}
        <img
          src={`https://openweathermap.org/img/wn/${weatherIcon}@2x.png`}
          alt={weatherDescription}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16"
        />
      </div>

      {/* Optional Snow or Rain Data */}
      <div className="text-center mt-4">{getPrecipitationInfo(weather)}</div>
    </div>
  );
};
