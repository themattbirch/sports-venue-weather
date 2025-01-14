// src/main.tsx

import './styles/styles.css';

async function loadStadiumData() {
  const response = await fetch('/data/stadium_coordinates.json');
  if (!response.ok) {
    throw new Error('Error loading stadium data');
  }
  const stadiumData = await response.json();
  // transform data as needed, e.g., your transformStadiumData logic
  return stadiumData;
}

function showSettings() {
  // open your settings modal
}

// a simple function to call OpenWeather
async function fetchWeather(latitude: number, longitude: number) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=...`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('OpenWeather fetch failed');
  }
  return await response.json();
}

document.addEventListener('DOMContentLoaded', () => {
  // your init code
  loadStadiumData().then(data => {
    // Populate UI, set up event listeners, etc.
  }).catch(err => {
    // handle error
  });
});
