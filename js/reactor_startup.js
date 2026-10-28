(function () {
  "use strict";

  const CSV_URL = "./calculators/reactor_startup.csv";
  const STORAGE_PREFIX = "ppuReactorStartup:";
  const CALCULATOR_KEY = "reactor-startup";

  const DEFAULTS = {
    target_c3_stock: 600,
    stock_latest: 300,
    stock_previous: 280,
    stock_earlier: 250
  };

  let config = { ...DEFAULTS };

  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = lines.shift()
      .replace(/^\uFEFF/, "")
      .split(",")
      .map(h => h.trim().toLowerCase());

    return lines.map(line => {
      const values = line.split(",");
      const record = {};

      headers.forEach((header, index) => {
        record[header] = (values[index] || "").trim();
      });

      return record;
    });
  }

  async function loadDefaults() {
    const response = await fetch(
      CSV_URL + "?v=" + Date.now(),
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error("Unable to load");
    }

    const records = parseCSV(await response.text());

    records.forEach(record => {
      const key = record.setting;
      const value = Number(record.default_value);

      if (
        Object.prototype.hasOwnProperty.call(DEFAULTS, key) &&
        Number.isFinite(value)
      ) {
        config[key] = value;
      }
    });
  }

  function localDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function slotKey(date) {
    return `${localDateKey(date)}_${String(date.getHours()).padStart(2, "0")}`;
  }

  function getLatestReadingTime(now) {
    const latest = new Date(now);
    latest.setMinutes(0, 0, 0);

    const hour = now.getHours();

    if (hour >= 22) {
      latest.setHours(22);
    } else if (hour >= 14) {
      latest.setHours(14);
    } else if (hour >= 6) {
      latest.setHours(6);
    } else {
      latest.setDate(latest.getDate() - 1);
      latest.setHours(22);
    }

    return latest;
  }

  function getReadingTimes(now) {
    const latest = getLatestReadingTime(now);

    const previous = new Date(latest);
    previous.setHours(previous.getHours() - 8);

    const earlier = new Date(latest);
    earlier.setHours(earlier.getHours() - 16);

    return { latest, previous, earlier };
  }

  function formatReadingTime(date) {
    const dateText = date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short"
    });

    const timeText = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    }).replace(/am/i, "AM").replace(/pm/i, "PM");

    const displayTime = ["06:00", "14:00", "22:00"].includes(timeText)
      ? `${timeText} hours`
      : timeText;

    return `${dateText}, ${displayTime}`;
  }

  function formatDateTime(date) {
      return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      }).replace(/\b(am|pm)\b/gi, match => match.toUpperCase());
  }

  function formatCountdown(hours) {
    const totalMinutes = Math.max(0, Math.floor(hours * 60));
    const days = Math.floor(totalMinutes / 1440);
    const remainingHours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;

    return `${days} D, ${remainingHours} H, ${minutes} M`;
  }

  function formatOneDecimal(value) {
    return Math.abs(value).toFixed(1);
  }

  function readValue(key, defaultValue) {
    try {
      const saved = localStorage.getItem(STORAGE_PREFIX + key);
      return saved !== null ? saved : String(defaultValue);
    } catch (_) {
      return String(defaultValue);
    }
  }

  function saveValue(key, value) {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, value);
    } catch (error) {
      console.warn("Could not save startup planner value:", error);
    }
  }

  function readStock(date, defaultValue) {
    try {
      const saved = localStorage.getItem(
        STORAGE_PREFIX + "stock:" + slotKey(date)
      );
      return saved !== null ? saved : String(defaultValue);
    } catch (_) {
      return String(defaultValue);
    }
  }

  function saveStock(date, value) {
    try {
      localStorage.setItem(
        STORAGE_PREFIX + "stock:" + slotKey(date),
        value
      );
    } catch (error) {
      console.warn("Could not save stock reading:", error);
    }
  }

  function numberFrom(input) {
    if (!input || input.value.trim() === "") return null;

    const value = Number(input.value);
    return Number.isFinite(value) ? value : null;
  }

  

  function init() {
    const selector = document.getElementById("calculatorType");
    const propylenePanel = document.getElementById(
      "propyleneStockCalculator"
    );

    if (!selector || !propylenePanel) {
      console.error("Startup planner: calculator elements not found.");
      return;
    }

    let panel = document.getElementById("reactorStartupCalculator");

    if (!panel) {
      panel = document.createElement("div");
      panel.id = "reactorStartupCalculator";
      panel.className = "calculator-form";
      panel.hidden = true;

      propylenePanel.insertAdjacentElement("afterend", panel);
    }

    if (!Array.from(selector.options).some(
  option => option.value === CALCULATOR_KEY
)) {
  const option = document.createElement("option");
  option.value = CALCULATOR_KEY;
  option.textContent = "Reactor Start Up Planner";
  selector.appendChild(option);
}

// Standardise calculator names and order
const calculatorOrder = [
  ["propylene-stock", "Pumpable C3 Stock"],
  ["reactor-shutdown", "Shutdown Planner"],
  ["reactor-startup", "Startup Planner"],
  ["additive-raffia", "WHO34N Composition"],
  ["additive-im", "IH120N Composition"],
  ["additive-tq", "FH110N Composition"]
];

calculatorOrder.forEach(([value, label]) => {
  const option = Array.from(selector.options).find(
    item => item.value === value
  );

  if (option) {
    option.textContent = label;
    selector.appendChild(option);
  }
});

    function render() {
      const now = new Date();
      const times = getReadingTimes(now);

      panel.innerHTML = `
        <div class="startup-input-grid">
          <label class="startup-field">
            <span>Target C3 Stock (MT)</span>
            <input id="startupTargetStock" type="number"
              min="0" step="any"
              value="${readValue("targetStock", config.target_c3_stock)}">
          </label>
        </div>

        <div class="startup-stock-heading">C3 Stock Readings (MT)</div>

        <div class="startup-stock-grid">
          <label class="startup-field">
            <span class="stock-reading-label">Stock as of ${formatReadingTime(times.latest)}</span>
            <input id="startupStockLatest" type="number"
              min="0" step="any"
              value="${readStock(times.latest, "")}" placeholder="Enter stock in MT">
          </label>

          <label class="startup-field">
            <span class="stock-reading-label">Stock as of ${formatReadingTime(times.previous)}</span>
            <input id="startupStockPrevious" type="number"
              min="0" step="any"
              value="${readStock(times.previous, "")}" placeholder="Enter stock in MT">
          </label>

          <label class="startup-field">
            <span class="stock-reading-label">Stock as of ${formatReadingTime(times.earlier)}</span>
            <input id="startupStockEarlier" type="number"
              min="0" step="any"
              value="${readStock(times.earlier, "")}" placeholder="Enter stock in MT">
          </label>
        </div>

        <button type="button" id="calculateStartup"
          class="calculator-action startup-calculate-button">
          Calculate Startup
        </button>

        <div id="startupResults" aria-live="polite"></div>
      `;

      const targetInput = panel.querySelector("#startupTargetStock");
      const latestInput = panel.querySelector("#startupStockLatest");
      const previousInput = panel.querySelector("#startupStockPrevious");
      const earlierInput = panel.querySelector("#startupStockEarlier");
      const results = panel.querySelector("#startupResults");

      targetInput.addEventListener("change", () =>
        saveValue("targetStock", targetInput.value)
      );

      latestInput.addEventListener("change", () =>
        saveStock(times.latest, latestInput.value)
      );

      previousInput.addEventListener("change", () =>
        saveStock(times.previous, previousInput.value)
      );

      earlierInput.addEventListener("change", () =>
        saveStock(times.earlier, earlierInput.value)
      );

      function calculate() {
        const target = numberFrom(targetInput);
        const latest = numberFrom(latestInput);
        const previous = numberFrom(previousInput);
        const earlier = numberFrom(earlierInput);

        saveValue("targetStock", targetInput.value);
        saveStock(times.latest, latestInput.value);
        saveStock(times.previous, previousInput.value);
        saveStock(times.earlier, earlierInput.value);

        if (
          target === null || target < 0 ||
          latest === null || latest < 0
        ) {
          results.innerHTML = `
            <p class="startup-error">
              Please enter the latest three C3 stock readings
            </p>
          `;
          return;
        }

        let changeRate = null;

        if (latest !== null && earlier !== null) {
          changeRate = (latest - earlier) / 16;
        } else if (latest !== null && previous !== null) {
          changeRate = (latest - previous) / 8;
        } else if (previous !== null && earlier !== null) {
          changeRate = (previous - earlier) / 8;
        }

        let stockStatus = "Change rate unavailable";
        let stockClass = "";

        if (changeRate < 0) {
          stockStatus =
            `Depleting at ${formatOneDecimal(changeRate)} MT/hr`;
          stockClass = "depleting";
        } else if (changeRate > 0) {
          stockStatus =
            `Increasing at ${formatOneDecimal(changeRate)} MT/hr`;
          stockClass = "increasing";
        } else if (changeRate === 0) {
          stockStatus = "Unchanged at 0.0 MT/hr";
        }

        const now = new Date();
        const elapsedHours = Math.max(
          0,
          (now.getTime() - times.latest.getTime()) / 3600000
        );

        // Excel logic:
        // Production since latest reading = elapsed hours × change rate.
        // Remaining stock to target = target − latest stock − production.
        const productionSinceReading =
          changeRate === null ? null : elapsedHours * changeRate;

        const remainingToTarget =
          changeRate === null
            ? null
            : target - latest - productionSinceReading;

        let timeHTML = `
          <div class="startup-result-row">
            <span>Expected Start Up In</span>
            <strong>Unable to estimate</strong>
          </div>
          <div class="startup-result-row">
            <span>Expected Start Up On</span>
            <strong>Unavailable</strong>
          </div>
        `;

        let warning = "";

        if (target <= latest) {
          warning =
            "The latest C3 stock is already at or above the target stock";
          timeHTML = `
            <div class="startup-result-row">
              <span>Expected Start Up In</span>
              <strong>Target already reached</strong>
            </div>
            <div class="startup-result-row">
              <span>Expected Start Up On</span>
              <strong>Not applicable</strong>
            </div>
          `;
        
        } else if (changeRate === null) {
          warning = "Please enter the latest three C3 stock readings";
        } else if (changeRate < 0) {
          timeHTML = `
            <div class="startup-result-row">
              <span>Expected Start Up In</span>
              <strong></strong>
            </div>
            <div class="startup-result-row">
              <span>Expected Start Up On</span>
              <strong class="startup-warning">
                Not sufficient C3 stock build up rate for plant startup
              </strong>
            </div>
          `;
        } else if (changeRate === 0) {
          warning = "C3 stock is unchanged";
        } else if (remainingToTarget <= 0) {
          warning =
            "The target stock is estimated to have already been reached.";
        } else {
          const hoursToStartup = remainingToTarget / changeRate;

          if (Number.isFinite(hoursToStartup) && hoursToStartup >= 0) {
            const expectedStartup = new Date(
              now.getTime() + hoursToStartup * 3600000
            );

            timeHTML = `
              <div class="startup-result-row">
                <span>Expected Start Up In</span>
                <strong>${formatCountdown(hoursToStartup)}</strong>
              </div>
              <div class="startup-result-row">
                <span>Expected Start Up On</span>
                <strong>${formatDateTime(expectedStartup)}</strong>
              </div>
            `;
          } else {
            warning = "Unable to calculate";
          }
        }


        results.innerHTML = `
          <div class="startup-status-card">
            <div class="startup-result-row">
              <span>C3 Stock Status</span>
              <strong class="${stockClass}">${stockStatus}</strong>
            </div>
            ${timeHTML}
          </div>

          ${warning
            ? `<p class="startup-warning">${warning}</p>`
            : ""}
        `;
      }

      panel.querySelector("#calculateStartup")
        .addEventListener("click", calculate);

      calculate();
    }

    function updateSelectedCalculator() {
  const isStartupSelected = selector.value === CALCULATOR_KEY;

  panel.hidden = !isStartupSelected;

  if (isStartupSelected) {
    propylenePanel.style.display = "none";
    render();
  }
}

    selector.addEventListener("change", updateSelectedCalculator);

    loadDefaults()
      .then(updateSelectedCalculator)
      .catch(error => {
        console.error("Startup planner:", error);

        if (selector.value === CALCULATOR_KEY) {
          propylenePanel.style.display = "none";
          panel.hidden = false;
          panel.innerHTML = `
            <p class="startup-error">
              Check the file path and refresh the dashboard
            </p>
          `;
        }
      });

    updateSelectedCalculator();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
