// /src/types.ts

// Interface for Stadium Information
export interface StadiumInfo {
  name: string;
  team: string;
  latitude: number;
  longitude: number;
}

// Interfaces for Weather Data as per OpenWeather API Response
export interface WeatherCondition {
  main: string;
  description: string;
  icon: string;
}

export interface WeatherMain {
  temp: number;
  feels_like: number;
  humidity: number;
}

export interface WeatherWind {
  speed: number;
}

export interface WeatherDataResponse {
  weather: WeatherCondition[];
  main: WeatherMain;
  wind: WeatherWind;
}

// Interface for Combined Stadium and Weather Data
export interface WeatherData {
  stadium: StadiumInfo;
  weather: WeatherDataResponse;
}
