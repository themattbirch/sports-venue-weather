// api/weather.js
const axios = require("axios");

// Fetch the environment variable
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

// Log the API key for debugging
console.log("OPENWEATHER_API_KEY:", OPENWEATHER_API_KEY);

module.exports = async (req, res) => {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: "Missing latitude or longitude" });
  }

  try {
    const response = await axios.get(
      "https://api.openweathermap.org/data/2.5/weather",
      {
        params: {
          lat,
          lon,
          units: "imperial",
          appid: OPENWEATHER_API_KEY,
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching weather data:", error.message);
    res.status(500).json({ error: "Failed to fetch weather data" });
  }
};
