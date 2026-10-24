
/* =========================================================
   WEATHER CARD
   Source: Open-Meteo API
   Location: Dibrugarh, Assam
   Coordinates: 27.383347, 94.873614
   Refresh: Every 5 minutes + when app becomes visible
   Icons: Custom SVG with day/night variations
   ========================================================= */

(function () {
    "use strict";

    // =====================================================
    // 1. CONFIGURATION
    // =====================================================

    const WEATHER_URL =
        "https://api.open-meteo.com/v1/forecast" +
        "?latitude=27.383347&longitude=94.873614" +
        "&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code" +
        "&daily=temperature_2m_max,temperature_2m_min" +
        "&forecast_days=1" +
        "&timezone=Asia%2FKolkata";

    const REFRESH_INTERVAL = 5 * 60 * 1000;
    const WEATHER_CACHE_KEY = "ppuWeatherCache";

    let refreshTimer = null;
    let isLoading = false;
    let hasSuccessfulData = false;

    const byId = (id) => document.getElementById(id);

    // =====================================================
    // 2. CUSTOM SVG WEATHER ICONS
    // =====================================================

    function weatherSvg(type) {
        const start =
            '<svg xmlns="http://www.w3.org/2000/svg" ' +
            'viewBox="0 0 48 48" width="44" height="44" ' +
            'role="img" aria-hidden="true">';

        const sun =
            '<circle cx="18" cy="17" r="8" fill="#FFC857" stroke="#F2A93B" stroke-width="1.5"/>' +
            '<g stroke="#F2A93B" stroke-width="2" stroke-linecap="round">' +
            '<path d="M18 4v3M18 27v3M5 17h3M28 17h3M9 8l2 2M25 24l2 2M9 26l2-2M25 10l2-2"/>' +
            '</g>';

        const moon =
            '<path d="M27 5a14 14 0 1 0 15 21A15 15 0 0 1 27 5Z" fill="#C6D7FF" stroke="#91A9E8" stroke-width="1.5"/>' +
            '<g fill="#91A9E8">' +
            '<circle cx="12" cy="9" r="1.2"/>' +
            '<circle cx="38" cy="10" r="1"/>' +
            '<path d="M8 18l1.3 2.5L12 22l-2.7 1.2L8 26l-1.2-2.8L4 22l2.8-1.5Z"/>' +
            '</g>';

        const cloud =
            '<path d="M13 32h22a8 8 0 0 0 .3-16 12 12 0 0 0-22.9 3.4A6.4 6.4 0 0 0 13 32Z" fill="#DCEAF7" stroke="#7FA7CF" stroke-width="1.5" stroke-linejoin="round"/>';

        const rain =
            '<g stroke="#4098E8" stroke-width="2.5" stroke-linecap="round">' +
            '<path d="m16 35-2 5M25 35l-2 5M34 35l-2 5"/>' +
            '</g>';

        const drizzle =
            '<g stroke="#69B6EA" stroke-width="2.2" stroke-linecap="round">' +
            '<path d="m18 36-1 3M27 36l-1 3M35 36l-1 3"/>' +
            '</g>';

        const snow =
            '<g stroke="#63B8E8" stroke-width="1.8" stroke-linecap="round">' +
            '<path d="M16 36v7m-3.2-5.2 6.4 3.4m0-3.4-6.4 3.4"/>' +
            '<path d="M27 36v7m-3.2-5.2 6.4 3.4m0-3.4-6.4 3.4"/>' +
            '</g>';

        const fog =
            '<g stroke="#A8B9C9" stroke-width="2.5" stroke-linecap="round">' +
            '<path d="M9 36h30M13 41h22"/>' +
            '</g>';

        const lightning =
            '<path d="m25 32-5 9h6l-2 6 10-12h-7l3-3Z" fill="#FFD15C" stroke="#E6A82E" stroke-width="1" stroke-linejoin="round"/>';

        let art = "";

        switch (type) {
            case "clear-day":
                art = sun;
                break;

            case "clear-night":
                art = moon;
                break;

            case "partly-cloudy-day":
                art = sun + cloud;
                break;

            case "partly-cloudy-night":
                art = moon + cloud;
                break;

            case "cloudy":
                art = cloud;
                break;

            case "fog":
                art = cloud + fog;
                break;

            case "drizzle-day":
                art = sun + cloud + drizzle;
                break;

            case "drizzle-night":
                art = moon + cloud + drizzle;
                break;

            case "rain-day":
                art = sun + cloud + rain;
                break;

            case "rain-night":
                art = moon + cloud + rain;
                break;

            case "snow":
                art = cloud + snow;
                break;

            case "thunderstorm":
                art = cloud + rain + lightning;
                break;

            default:
                art = cloud;
        }

        return start + art + "</svg>";
    }

    function renderWeatherIcon(type, conditionText) {
        const element = byId("weatherIcon");
        if (!element) return;

        element.innerHTML = weatherSvg(type);

        element.setAttribute(
            "aria-label",
            conditionText || "Current weather"
        );

        element.setAttribute(
            "title",
            conditionText || "Current weather"
        );
    }

    // =====================================================
    // 3. RESTORE CACHED WEATHER
    // =====================================================

    function restoreCachedWeather() {
        try {
            const cached = localStorage.getItem(
                WEATHER_CACHE_KEY
            );

            if (!cached) return;

            const saved = JSON.parse(cached);

            if (
                !saved ||
                saved.temperature == null ||
                !saved.condition
            ) {
                return;
            }

            byId("weatherTemperature").textContent =
                saved.temperature;

            byId("weatherFeelsLike").textContent =
                saved.feelsLike || "--°C";

            byId("weatherHumidity").textContent =
                saved.humidity || "--%";

            byId("weatherMaxMin").textContent =
                saved.maxMin || "-- / --";

            byId("weatherCondition").textContent =
                saved.condition;

            renderWeatherIcon(
                saved.icon || "cloudy",
                saved.condition
            );

            hasSuccessfulData = true;

        } catch (error) {
            console.warn(
                "Could not restore cached weather:",
                error
            );
        }
    }

    // =====================================================
    // 4. MAP WEATHER CONDITIONS TO ICONS
    // =====================================================

    function conditionFor(code, isDay) {
        if (code === 0) {
            return {
                text: isDay ? "Clear sky" : "Clear night",
                icon: isDay ? "clear-day" : "clear-night"
            };
        }

        if (code === 1) {
            return {
                text: isDay ? "Mainly clear" : "Mostly clear night",
                icon: isDay ? "clear-day" : "clear-night"
            };
        }

        if (code === 2) {
            return {
                text: "Partly cloudy",
                icon: isDay
                    ? "partly-cloudy-day"
                    : "partly-cloudy-night"
            };
        }

        if (code === 3) {
            return {
                text: "Overcast",
                icon: "cloudy"
            };
        }

        if ([45, 48].includes(code)) {
            return {
                text: "Foggy",
                icon: "fog"
            };
        }

        if ([51, 53, 55, 56, 57].includes(code)) {
            return {
                text: "Drizzle",
                icon: isDay ? "drizzle-day" : "drizzle-night"
            };
        }

        if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
            return {
                text: "Rain",
                icon: isDay ? "rain-day" : "rain-night"
            };
        }

        if ([71, 73, 75, 77, 85, 86].includes(code)) {
            return {
                text: "Snow",
                icon: "snow"
            };
        }

        if ([95, 96, 99].includes(code)) {
            return {
                text: "Thunderstorm",
                icon: "thunderstorm"
            };
        }

        return {
            text: "Current conditions",
            icon: isDay ? "clear-day" : "clear-night"
        };
    }

    // =====================================================
    // 5. FETCH AND DISPLAY WEATHER
    // =====================================================

    async function refreshWeather() {
        if (
            isLoading ||
            document.visibilityState === "hidden"
        ) {
            return;
        }

        if (!navigator.onLine) {
            return;
        }

        isLoading = true;

        try {
            const response = await fetch(WEATHER_URL, {
                cache: "no-store"
            });

            if (!response.ok) {
                throw new Error(
                    "Weather request failed: " + response.status
                );
            }

            const data = await response.json();
            const current = data && data.current;

            if (
                !current ||
                !Number.isFinite(Number(current.temperature_2m)) ||
                !Number.isFinite(Number(current.apparent_temperature)) ||
                !Number.isFinite(Number(current.relative_humidity_2m))
            ) {
                throw new Error(
                    "Weather response did not contain all required values"
                );
            }

            const isDay = Number(current.is_day) === 1;

            const condition = conditionFor(
                Number(current.weather_code),
                isDay
            );

            const temperatureText =
                Math.round(Number(current.temperature_2m)) + "°C";

            const feelsLikeText =
                Math.round(Number(current.apparent_temperature)) + "°C";

            const humidityText =
                Math.round(Number(current.relative_humidity_2m)) + "%";

            byId("weatherTemperature").textContent =
                temperatureText;

            byId("weatherFeelsLike").textContent =
                feelsLikeText;

            byId("weatherHumidity").textContent =
                humidityText;

            const daily = data.daily;

            if (
                daily &&
                daily.temperature_2m_max &&
                daily.temperature_2m_min &&
                daily.temperature_2m_max[0] != null &&
                daily.temperature_2m_min[0] != null
            ) {
                byId("weatherMaxMin").textContent =
                    Math.round(Number(daily.temperature_2m_max[0])) +
                    "°C / " +
                    Math.round(Number(daily.temperature_2m_min[0])) +
                    "°C";
            }

            byId("weatherCondition").textContent =
                condition.text;

            renderWeatherIcon(
                condition.icon,
                condition.text
            );

            // Save the latest successful readings.
            try {
                localStorage.setItem(
                    WEATHER_CACHE_KEY,
                    JSON.stringify({
                        temperature: temperatureText,
                        feelsLike: feelsLikeText,
                        humidity: humidityText,
                        maxMin: byId("weatherMaxMin").textContent,
                        condition: condition.text,
                        icon: condition.icon
                    })
                );
            } catch (error) {
                console.warn(
                    "Could not save weather cache:",
                    error
                );
            }

            hasSuccessfulData = true;

        } catch (error) {
            console.warn(
                "Weather refresh failed:",
                error
            );

            if (!hasSuccessfulData) {
                byId("weatherCondition").textContent =
                    "Weather unavailable";

                renderWeatherIcon(
                    "cloudy",
                    "Weather unavailable"
                );
            }

        } finally {
            isLoading = false;
        }
    }

    // =====================================================
    // 6. INITIALISE AND AUTO-REFRESH
    // =====================================================

    function init() {
        if (!byId("weatherCard")) return;

        restoreCachedWeather();

        // Fetch immediately on app startup.
        refreshWeather();

        // Refresh every 5 minutes while the app is active.
        if (refreshTimer) {
            window.clearInterval(refreshTimer);
        }

        refreshTimer = window.setInterval(
            refreshWeather,
            REFRESH_INTERVAL
        );

        // Refresh when the user returns to the app.
        document.addEventListener(
            "visibilitychange",
            function () {
                if (
                    document.visibilityState === "visible"
                ) {
                    refreshWeather();
                }
            }
        );

        // Refresh when internet connectivity returns.
        window.addEventListener(
            "online",
            refreshWeather
        );
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            init,
            { once: true }
        );
    } else {
        init();
    }
})();
