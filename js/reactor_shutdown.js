(function () {
  "use strict";

  const CSV_URL = "./calculators/reactor_shutdown.csv";
  const STORAGE_PREFIX = "ppuReactorShutdown:";
  const CALCULATOR_KEY = "reactor-shutdown";

  const DEFAULTS = {
    c3_to_be_consumed: 150,
    stock_latest: 600,
    stock_previous: 630,
    stock_earlier: 660,
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
    }).replace(/am/i, "AM").replace(/pm/i, "PM");

    return `${dateText}, ${timeText}`;
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
    }).replace(/\b(am|pm)\b/gi, match => match.toUpperCase());
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


    function render() {
      const now = new Date();
      const times = getReadingTimes(now);

      panel.innerHTML = `
        <div class="reactor-input-grid">
          <label class="reactor-field">
            <span>C3 to be consumed till (MT)</span>
            <input id="reactorC3Consumed" type="number"
              min="0" step="any"
              value="${readInput("c3Consumed", config.c3_to_be_consumed)}">
          </label>

          <label class="reactor-field">
            <span>Reactor Load (MT/hr)</span>
            <input id="reactorLoad" type="number"
              min="0" step="any"
              value="${readInput("reactorLoad", "")}"
              placeholder="Enter load in MT/hr">
          </label>

          <label class="reactor-field">
            <span>What-if Reactor Load (MT/hr) — Optional</span>
            <input id="reactorWhatIfLoad" type="number"
              min="0" step="any"
              value="${readInput("reactorWhatIfLoad", "")}"
              placeholder="Enter proposed load">
          </label>
        </div>

        <div class="reactor-stock-heading">C3 Stock Readings (MT)</div>

        <div class="reactor-stock-grid">
          <label class="reactor-field">
            <span class="stock-reading-label">
              Stock at ${formatReadingTime(times.latest)}
            </span>
            <input id="reactorStockLatest" type="number"
              min="0" step="any"
              value="${readStock(times.latest, "")}"
              placeholder="Enter stock in MT">
          </label>

          <label class="reactor-field">
            <span class="stock-reading-label">
              Stock at ${formatReadingTime(times.previous)}
            </span>
            <input id="reactorStockPrevious" type="number"
              min="0" step="any"
              value="${readStock(times.previous, "")}"
              placeholder="Enter stock in MT">
          </label>

          <label class="reactor-field">
            <span class="stock-reading-label">
              Stock at ${formatReadingTime(times.earlier)}
            </span>
            <input id="reactorStockEarlier" type="number"
              min="0" step="any"
              value="${readStock(times.earlier, "")}"
              placeholder="Enter stock in MT">
          </label>

          <label class="reactor-field">
            <span class="stock-reading-label">
              Current Stock (Optional)
            </span>
            <input id="reactorStockCurrent" type="number"
              min="0" step="any"
              value="${readInput("reactorStockCurrent", "")}"
              placeholder="Enter current stock in MT">
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
      const currentStockInput = panel.querySelector("#reactorStockCurrent");
      const whatIfLoadInput = panel.querySelector("#reactorWhatIfLoad");
      const results = panel.querySelector("#reactorShutdownResults");

      let currentStockTimestamp = readInput(
        "reactorStockCurrentTimestamp",
        ""
      );

      consumedInput.addEventListener("change", () =>
        saveInput("c3Consumed", consumedInput.value)
      );

      loadInput.addEventListener("change", () =>
        saveInput("reactorLoad", loadInput.value)
      );

      whatIfLoadInput.addEventListener("change", () =>
        saveInput("reactorWhatIfLoad", whatIfLoadInput.value)
      );

      currentStockInput.addEventListener("change", () => {
        saveInput("reactorStockCurrent", currentStockInput.value);

        if (currentStockInput.value.trim() !== "") {
          currentStockTimestamp = new Date().toISOString();
          saveInput(
            "reactorStockCurrentTimestamp",
            currentStockTimestamp
          );
        } else {
          currentStockTimestamp = "";
          saveInput("reactorStockCurrentTimestamp", "");
        }
      });

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
        const stockCurrent = numberFrom(currentStockInput);
        const whatIfLoad = numberFrom(whatIfLoadInput);

        saveInput("c3Consumed", consumedInput.value);
        saveInput("reactorLoad", loadInput.value);
        saveInput("reactorWhatIfLoad", whatIfLoadInput.value);
        saveInput("reactorStockCurrent", currentStockInput.value);

        saveStock(times.latest, latestInput.value);
        saveStock(times.previous, previousInput.value);
        saveStock(times.earlier, earlierInput.value);

const scheduledReadingsAvailable = [
  stockLatest,
  stockPrevious,
  stockEarlier
].filter(value => value !== null && value >= 0).length;

const currentStockAvailable =
  stockCurrent !== null && stockCurrent >= 0;

const validInputs =
  c3Consumed !== null && c3Consumed >= 0 &&
  reactorLoad !== null && reactorLoad >= 0 &&
  (
    (currentStockAvailable && scheduledReadingsAvailable >= 1) ||
    (!currentStockAvailable && scheduledReadingsAvailable >= 2)
  );

if (!validInputs) {
  results.innerHTML = `
    <p class="reactor-error">
      Please enter Reactor load and latest three C3 stock readings
    </p>
  `;
  return;
}

        const currentTime = new Date();

        const enteredStockTime = currentStockTimestamp
          ? new Date(currentStockTimestamp)
          : null;

        const liveReadingValid =
          stockCurrent !== null &&
          stockCurrent >= 0 &&
          enteredStockTime &&
          Number.isFinite(enteredStockTime.getTime()) &&
          enteredStockTime.getTime() >= times.latest.getTime() &&
          enteredStockTime.getTime() <= currentTime.getTime();

        let changeRate = null;

        if (liveReadingValid) {
          // Priority 1: Current Stock vs Earlier Stock
          if (stockEarlier !== null && stockEarlier >= 0) {
            const hours =
              (enteredStockTime.getTime() -
                times.earlier.getTime()) / 3600000;

            if (hours > 0) {
              changeRate = (stockCurrent - stockEarlier) / hours;
            }
          }

          // Priority 2: Current Stock vs Previous Stock
          if (
            changeRate === null &&
            stockPrevious !== null &&
            stockPrevious >= 0
          ) {
            const hours =
              (enteredStockTime.getTime() -
                times.previous.getTime()) / 3600000;

            if (hours > 0) {
              changeRate = (stockCurrent - stockPrevious) / hours;
            }
          }

          // Priority 3: Current Stock vs Latest Stock
          if (
            changeRate === null &&
            stockLatest !== null &&
            stockLatest >= 0
          ) {
            const hours =
              (enteredStockTime.getTime() -
                times.latest.getTime()) / 3600000;

            if (hours > 0) {
              changeRate = (stockCurrent - stockLatest) / hours;
            }
          }
        } else {
          // No valid Current Stock: retain scheduled-reading logic.
          if (
            stockLatest !== null &&
            stockLatest >= 0 &&
            stockEarlier !== null &&
            stockEarlier >= 0
          ) {
            changeRate = (stockLatest - stockEarlier) / 16;
          } else if (
            stockLatest !== null &&
            stockLatest >= 0 &&
            stockPrevious !== null &&
            stockPrevious >= 0
          ) {
            changeRate = (stockLatest - stockPrevious) / 8;
          } else if (
            stockPrevious !== null &&
            stockPrevious >= 0 &&
            stockEarlier !== null &&
            stockEarlier >= 0
          ) {
            changeRate = (stockPrevious - stockEarlier) / 8;
          }
        }

        const elapsedHours = liveReadingValid
          ? 0
          : Math.max(
              0,
              (currentTime.getTime() -
                times.latest.getTime()) / 3600000
            );

        const stockForProjection = liveReadingValid
          ? stockCurrent
          : stockLatest;

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
              <strong>Unable to estimate</strong>
            </div>
            <div class="reactor-result-row">
              <span>Expected Shutdown On</span>
              <strong class="running">
                Plant to keep running as C3 stock is building up
              </strong>
            </div>
          `;
        } else if (changeRate !== null && changeRate < 0) {
          const remaining =
            stockForProjection -
            c3Consumed -
            reactorLoad * elapsedHours;

          const hoursToShutdown = Math.max(
            0,
            remaining / Math.abs(changeRate)
          );

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
              <strong>Unable to estimate</strong>
            </div>
            <div class="reactor-result-row">
              <span>Expected Shutdown On</span>
              <strong>
                Unable to estimate — C3 stock is unchanged
              </strong>
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
            whatIfLoad !== null &&
            whatIfLoad >= 0 &&
            changeRate !== null &&
            changeRate < 0 &&
            reactorRunning
              ? (() => {
                  // Provisional model:
                  // assume production stays steady and net depletion
                  // changes one-for-one with reactor load.
                  const observedDepletion = Math.abs(changeRate);

                  const projectedDepletion =
                    observedDepletion + (whatIfLoad - reactorLoad);

                  const remainingForWhatIf =
                    stockForProjection - c3Consumed;

                  if (projectedDepletion <= 0) {
                    return `
                      <div class="reactor-status-card">
                        <div class="reactor-result-row">
                          <span>What-if Shutdown</span>
                          <strong>
                            Not expected at this load if production
                            remains steady
                          </strong>
                        </div>
                      </div>
                    `;
                  }

                  const whatIfHours = Math.max(
                    0,
                    remainingForWhatIf / projectedDepletion
                  );

                  const whatIfDate = new Date(
                    currentTime.getTime() +
                    whatIfHours * 3600000
                  );

                  const baselineHours = Math.max(
                    0,
                    remainingForWhatIf / observedDepletion
                  );

                  const difference = baselineHours - whatIfHours;

                  const differenceText =
                    Math.abs(difference) < 0.01
                      ? "No material change"
                      : `${formatCountdown(Math.abs(difference))} ${
                          difference > 0 ? "earlier" : "later"
                        }`;

                  return `
                    <div class="reactor-status-card">
                      <div class="reactor-result-row">
                        <span>What-if Shutdown In</span>
                        <strong>${formatCountdown(whatIfHours)}</strong>
                      </div>

                      <div class="reactor-result-row">
                        <span>What-if Shutdown On</span>
                        <strong>${formatDateTime(whatIfDate)}</strong>
                      </div>

                      <div class="reactor-result-row">
                        <span>Compared with current load</span>
                        <strong>${differenceText}</strong>
                      </div>

                      <p class="reactor-note">
                        This estimate assumes production remains steady
                      </p>
                    </div>
                  `;
                })()
              : ""
          }

          ${
            changeRate === 0
              ? `<p class="reactor-warning">
                   Stock change rate is Zero
                 </p>`
              : ""
          }

          ${
            changeRate === null
              ? `<p class="reactor-warning">
                   Enter at least two valid stock readings
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
              Unable to load Calculators
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
