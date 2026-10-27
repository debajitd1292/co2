
/* Reactor Shutdown Calculator
   Data source: calculators/reactor_shutdown.csv
   Calculation logic based on Reactor_Shutdown_Calculator.xlsx
*/

(function () {
  "use strict";

  const CSV_URL = "./calculators/reactor_shutdown.csv";
  const STORAGE_PREFIX = "ppuReactorShutdown:";
  const CALCULATOR_KEY = "reactor-shutdown";

  const DEFAULTS = {
    c3_to_be_consumed: 150,
    stock_latest: 564,
    stock_previous: 570,
    stock_earlier: 583,
    reactor_load: 7
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
      throw new Error("Unable to load reactor_shutdown.csv");
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
    }).replace(/\b(am|pm)\b/g, match => match.toUpperCase());

    const displayTime = ["06:00", "14:00", "22:00"].includes(timeText)
      ? `${timeText} hours`
      : timeText;

    return `${dateText}, ${displayTime}`;
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

  function readInput(key, defaultValue) {
    try {
      const saved = localStorage.getItem(
        STORAGE_PREFIX + key
      );

      return saved !== null ? saved : String(defaultValue);
    } catch (_) {
      return String(defaultValue);
    }
  }

  function saveInput(key, value) {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, value);
    } catch (error) {
      console.warn("Could not save reactor input:", error);
    }
  }

  function numberFrom(input) {
    if (!input || input.value.trim() === "") return null;

    const value = Number(input.value);
    return Number.isFinite(value) ? value : null;
  }

  function formatOneDecimal(value) {
    return Math.abs(value).toFixed(1);
  }

  function formatCountdown(hours) {
    const totalMinutes = Math.max(0, Math.floor(hours * 60));
    const days = Math.floor(totalMinutes / 1440);
    const remainingHours = Math.floor(
      (totalMinutes % 1440) / 60
    );
    const minutes = totalMinutes % 60;

    return `${days} D, ${remainingHours} H, ${minutes} M`;
  }

  function formatDateTime(date) {
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  }

  function init() {
    const selector = document.getElementById("calculatorType");
    const propylenePanel = document.getElementById(
      "propyleneStockCalculator"
    );

    if (!selector || !propylenePanel) {
      console.error(
        "Reactor calculator: existing calculator elements not found."
      );
      return;
    }

    let panel = document.getElementById("reactorShutdownCalculator");

    if (!panel) {
      panel = document.createElement("div");
      panel.id = "reactorShutdownCalculator";
      panel.className = "calculator-form";
      panel.hidden = true;

      propylenePanel.insertAdjacentElement("afterend", panel);
    }

    if (!Array.from(selector.options).some(
      option => option.value === CALCULATOR_KEY
    )) {
      const option = document.createElement("option");
      option.value = CALCULATOR_KEY;
      option.textContent = "Reactor Shutdown Planner";
      selector.appendChild(option);
    }

    addStyles();

    function render() {
      const now = new Date();
      const times = getReadingTimes(now);

      panel.innerHTML = `
        <div class="reactor-input-grid">
          <label class="reactor-field">
            <span>C3 to be consumed till shutdown (MT)</span>
            <input id="reactorC3Consumed" type="number"
              min="0" step="any"
              value="${readInput("c3Consumed", config.c3_to_be_consumed)}">
          </label>

          <label class="reactor-field">
            <span>Reactor Load (MT/hr)</span>
            <input id="reactorLoad" type="number"
              min="0" step="any"
              value="${readInput("reactorLoad", "")}" placeholder="Enter load in MT/hr">
          </label>
        </div>

        <div class="reactor-stock-heading">C3 Stock Readings (MT)</div>

        <div class="reactor-stock-grid">
          <label class="reactor-field">
            <span>Stock at ${formatReadingTime(times.latest)}</span>
            <input id="reactorStockLatest" type="number"
              step="any"
              value="${readStock(times.latest, "")}" placeholder="Enter stock in MT">
          </label>

          <label class="reactor-field">
            <span>Stock at ${formatReadingTime(times.previous)}</span>
            <input id="reactorStockPrevious" type="number"
              step="any"
              value="${readStock(times.previous, "")}" placeholder="Enter stock in MT">
          </label>

          <label class="reactor-field">
            <span>Stock at ${formatReadingTime(times.earlier)}</span>
            <input id="reactorStockEarlier" type="number"
              step="any"
              value="${readStock(times.earlier, "")}" placeholder="Enter stock in MT">
          </label>
        </div>

        <button type="button" id="calculateReactorShutdown"
          class="calculator-action reactor-calculate-button">
          Calculate Shutdown
        </button>

        <div id="reactorShutdownResults" aria-live="polite"></div>

      `;

      const consumedInput = panel.querySelector("#reactorC3Consumed");
      const loadInput = panel.querySelector("#reactorLoad");
      const latestInput = panel.querySelector("#reactorStockLatest");
      const previousInput = panel.querySelector("#reactorStockPrevious");
      const earlierInput = panel.querySelector("#reactorStockEarlier");
      const results = panel.querySelector("#reactorShutdownResults");

      consumedInput.addEventListener("change", () =>
        saveInput("c3Consumed", consumedInput.value)
      );

      loadInput.addEventListener("change", () =>
        saveInput("reactorLoad", loadInput.value)
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
        const c3Consumed = numberFrom(consumedInput);
        const reactorLoad = numberFrom(loadInput);
        const stockLatest = numberFrom(latestInput);
        const stockPrevious = numberFrom(previousInput);
        const stockEarlier = numberFrom(earlierInput);

        saveInput("c3Consumed", consumedInput.value);
        saveInput("reactorLoad", loadInput.value);
        saveStock(times.latest, latestInput.value);
        saveStock(times.previous, previousInput.value);
        saveStock(times.earlier, earlierInput.value);

        const validInputs =
          c3Consumed !== null && c3Consumed >= 0 &&
          reactorLoad !== null && reactorLoad >= 0 &&
          stockLatest !== null && stockLatest >= 0;

        if (!validInputs) {
          results.innerHTML = `
            <p class="reactor-error">
              Please enter Reactor load and atleast 2 latest C3 stock reading
            </p>
          `;
          return;
        }

        // Match the Excel change-rate calculation:
        // Prefer latest and earlier readings over 16 hours.
        // Otherwise use the available pair over 8 hours.
        let changeRate = null;

        if (stockLatest !== null && stockEarlier !== null) {
          changeRate = (stockLatest - stockEarlier) / 16;
        } else if (
          stockLatest !== null && stockPrevious !== null
        ) {
          changeRate = (stockLatest - stockPrevious) / 8;
        } else if (
          stockPrevious !== null && stockEarlier !== null
        ) {
          changeRate = (stockPrevious - stockEarlier) / 8;
        }

        const currentTime = new Date();
        const elapsedHours = Math.max(
          0,
          (currentTime.getTime() - times.latest.getTime()) / 3600000
        );

        let stockStatus = "Stock change rate unavailable";
        let stockClass = "neutral";

        if (changeRate !== null) {
          
        if (changeRate < 0) {
  stockStatus =
    `Depleting at ${formatOneDecimal(changeRate)} MT/hr`;
  stockClass = "depleting";
} else if (changeRate > 0) {
  stockStatus =
    `Increasing at ${formatOneDecimal(changeRate)} MT/hr`;
  stockClass = "increasing";
} else {
  stockStatus = "Unchanged at 0.0 MT/hr";
  stockClass = "neutral";
}

        }

        const reactorRunning = reactorLoad > 0;

        let countdownHTML = `
          <div class="reactor-result-row">
            <span>Shutdown in</span>
            <strong>Unable to estimate</strong>
          </div>
          <div class="reactor-result-row">
            <span>Expected Shutdown On</span>
            <strong>Unavailable</strong>
          </div>
        `;

        
        if (!reactorRunning) {
          countdownHTML = `
            <div class="reactor-result-row">
              <span>Shutdown in</span>
              <strong>Already under shutdown</strong>
            </div>
            <div class="reactor-result-row">
              <span>Expected Shutdown On</span>
              <strong>Not applicable</strong>
            </div>
          `;
        } else if (changeRate !== null && changeRate > 0) {
          countdownHTML = `
            <div class="reactor-result-row">
              <span>Shutdown in</span>
              <strong></strong>
            </div>
            <div class="reactor-result-row">
              <span>Expected Shutdown On</span>
              <strong class="running">
                Plant will continue running — C3 stock is increasing
              </strong>
            </div>
          `;
        } else if (changeRate !== null && changeRate < 0) {
          const remaining =
            stockLatest - c3Consumed - reactorLoad * elapsedHours;

          const hoursToShutdown = Math.abs(remaining / changeRate);

          if (Number.isFinite(hoursToShutdown)) {
            const expectedShutdown = new Date(
              currentTime.getTime() + hoursToShutdown * 3600000
            );

            countdownHTML = `
              <div class="reactor-result-row">
                <span>Shutdown in</span>
                <strong>${formatCountdown(hoursToShutdown)}</strong>
              </div>
              <div class="reactor-result-row">
                <span>Expected Shutdown On</span>
                <strong>${formatDateTime(expectedShutdown)}</strong>
              </div>
            `;
          }
        } else if (changeRate === 0) {
          countdownHTML = `
            <div class="reactor-result-row">
              <span>Shutdown in</span>
              <strong></strong>
            </div>
            <div class="reactor-result-row">
              <span>Expected Shutdown On</span>
              <strong>Unable to estimate — C3 stock is unchanged</strong>
            </div>
          `;
        }


        const statusText = reactorRunning
          ? "Reactor is Running"
          : "Reactor under Shutdown";

        const statusClass = reactorRunning
          ? "running"
          : "shutdown";

        results.innerHTML = `
          <div class="reactor-status-card">
            <div class="reactor-result-row">
              <span>Reactor Status</span>
              <strong class="reactor-badge ${statusClass}">
                ${statusText}
              </strong>
            </div>

            <div class="reactor-result-row">
              <span>C3 Stock Status</span>
              <strong class="reactor-stock-status ${stockClass}">
                ${stockStatus}
              </strong>
            </div>

            ${countdownHTML}
          </div>

          ${
            changeRate === 0
              ? `<p class="reactor-warning">
                   Stock change rate is zero. Shutdown timing cannot
                   be estimated using the workbook formula.
                 </p>`
              : ""
          }

          ${
            changeRate === null
              ? `<p class="reactor-warning">
                   Enter at least two valid stock readings to calculate
                   the change rate.
                 </p>`
              : ""
          }
        `;
      }

      panel.querySelector("#calculateReactorShutdown")
        .addEventListener("click", calculate);

      calculate();
    }

    function updateSelectedCalculator() {
      if (selector.value === CALCULATOR_KEY) {
        propylenePanel.style.display = "none";
        panel.hidden = false;
        render();
      } else {
        // Hide only this panel; other calculator scripts manage
        // their own panels and the propylene panel.
        panel.hidden = true;
      }
    }

    selector.addEventListener("change", updateSelectedCalculator);

    loadDefaults()
      .then(updateSelectedCalculator)
      .catch(error => {
        console.error("Reactor shutdown calculator:", error);

        if (selector.value === CALCULATOR_KEY) {
          propylenePanel.style.display = "none";
          panel.hidden = false;
          panel.innerHTML = `
            <p class="reactor-error">
              Unable to load calculators/reactor_shutdown.csv.
              Check the file path and refresh the dashboard.
            </p>
          `;
        }
      });

    updateSelectedCalculator();
  }

  function addStyles() {
    if (document.getElementById("reactorShutdownStyles")) return;

    const style = document.createElement("style");
    style.id = "reactorShutdownStyles";

    style.textContent = `
      #reactorShutdownCalculator {
        margin-top: 8px;
      }

      #reactorShutdownCalculator .reactor-present-time {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        margin-bottom: 14px;
        font-size: 13px;
      }

      #reactorShutdownCalculator .reactor-present-time strong {
        text-align: right;
      }

      
#reactorShutdownCalculator .reactor-input-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

#reactorShutdownCalculator .reactor-input-grid .reactor-field {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(100px, 45%);
  align-items: center;
  gap: 12px;
}

#reactorShutdownCalculator .reactor-input-grid .reactor-field span {
  line-height: 1.4;
}

#reactorShutdownCalculator .reactor-stock-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  margin-bottom: 12px;
}


      #reactorShutdownCalculator .reactor-stock-grid {
        grid-template-columns: 1fr;
      }

      #reactorShutdownCalculator .reactor-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 0;
        font-size: 12px;
        font-weight: 600;
      }

      #reactorShutdownCalculator .reactor-field input {
        box-sizing: border-box;
        width: 100%;
        min-width: 0;
      }

      #reactorShutdownCalculator .reactor-stock-heading {
        font-weight: 700;
        font-size: 13px;
        margin: 12px 0 8px;
      }

      #reactorShutdownCalculator .reactor-calculate-button {
        width: 100%;
        margin: 4px 0 12px;
      }

      #reactorShutdownCalculator .reactor-status-card {
        border: 1px solid var(--border-color, rgba(128,128,128,.25));
        border-radius: 10px;
        padding: 12px;
        margin-top: 8px;
      }

      #reactorShutdownCalculator .reactor-result-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
        padding: 9px 0;
        font-size: 13px;
      }

      #reactorShutdownCalculator .reactor-result-row + .reactor-result-row {
        border-top: 1px solid var(--border-color, rgba(128,128,128,.18));
      }

      #reactorShutdownCalculator .reactor-result-row > span {
        flex: 1 1 42%;
      }

      #reactorShutdownCalculator .reactor-result-row > strong {
        flex: 1 1 58%;
        text-align: right;
      }

      #reactorShutdownCalculator .reactor-badge {
        display: inline-block;
        padding: 4px 8px;
        border-radius: 7px;
        font-size: 12px;
      }

      #reactorShutdownCalculator .running,
      #reactorShutdownCalculator .increasing {
        color: #16a34a;
      }

      #reactorShutdownCalculator .shutdown {
        color: #dc2626;
      }

      #reactorShutdownCalculator .depleting {
        color: #dc2626;
      }

      #reactorShutdownCalculator .neutral {
        color: var(--text-color, inherit);
        opacity: .8;
      }

      #reactorShutdownCalculator .reactor-note,
      #reactorShutdownCalculator .reactor-warning,
      #reactorShutdownCalculator .reactor-error {
        font-size: 12px;
        line-height: 1.5;
        margin-top: 10px;
      }

      #reactorShutdownCalculator .reactor-warning,
      #reactorShutdownCalculator .reactor-error {
        color: #dc2626;
      }

      @media (min-width: 520px) {
        #reactorShutdownCalculator .reactor-stock-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }
    `;

    document.head.appendChild(style);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
