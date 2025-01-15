// /src/types.ts

export interface StadiumInfo {
  name: string;
  team: string;
  latitude: number;
  longitude: number;
}

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
  deg?: number; 
}

export interface WeatherRain {
  '1h': number;
}

export interface WeatherSnow {
  '1h': number;
}

export interface WeatherDataResponse {
  weather: WeatherCondition[];
  main: WeatherMain;
  wind: WeatherWind;
  rain?: WeatherRain; 
  snow?: WeatherSnow; 
}

export interface WeatherData {
  stadium: StadiumInfo;
  weather: WeatherDataResponse;
}

// New additions:
export type LeagueType = 'nfl' | 'ncaa' | 'mlb' | 'mls';

export interface StadiumsMap {
  nfl: StadiumInfo[];
  ncaa: StadiumInfo[];
  mlb: StadiumInfo[];
  mls: StadiumInfo[];
}