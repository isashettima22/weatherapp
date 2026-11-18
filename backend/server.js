require("dotenv").config();
const express = require("express");
const app = express();
const path = require("path");
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.OPEN_WEATHER_API_KEY;

const frontendPath = path.join(__dirname, '..', "frontend");
app.use(express.static(frontendPath));
app.use(express.json());

app.get("/health", (_req, res) => {
    return res.json({ status: "ok" });
});

if (!API_KEY) {
    console.error("Please provide OPEN_WEATHER_API_KEY");
    process.exit(1);
}



app.get("/api/weather", async (req, res) => {
    const { city, lat, lon } = req.query;
    if (!city && (!lat || !lon)) {
        return res.status(400).json({ message: "Please provide a city name or coordinates" });
    }
    try {
        const url = (lat && lon)
            ? `https://api.openweathermap.org/data/2.5/weather?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&units=metric&appid=${API_KEY}`
            : `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`;

        const weatherRes = await fetch(url);
        const data = await weatherRes.json();

        if (!weatherRes.ok) {
            return res.status(weatherRes.status).json({ message: data.message || "Failed to fetch weather data" });
        }
        return res.json(data);
    } catch (error) {
        console.error("Weather API error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});

app.get("/api/forecast", async (req, res) => {
    const { city, lat, lon } = req.query;
    if (!city && (!lat || !lon)) {
        return res.status(400).json({ message: "Please provide a city name or coordinates" });
    }
    try {
        const url = (lat && lon)
            ? `https://api.openweathermap.org/data/2.5/forecast?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&units=metric&appid=${API_KEY}`
            : `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`;

        const forecastRes = await fetch(url);
        const data = await forecastRes.json();

        if (!forecastRes.ok) {
            return res.status(forecastRes.status).json({ message: data.message || "Failed to fetch forecast data" });
        }
        return res.json(data);
    } catch (error) {
        console.error("Forecast API error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
app.listen(PORT, () => {
    console.log(`server is running on http://localhost:${PORT}`)
})