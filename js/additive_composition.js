
/* Additive Composition Calculator
   Data source: calculators/additive.csv
   PPU Operations Dashboard
*/

(function () {
  "use strict";

  const CSV_URL = "./calculators/additive.csv";
  const STORAGE_PREFIX = "ppuCalculator:additive:";

  const CATEGORY_KEYS = {
    "Raffia": "additive-raffia",
    "IM": "additive-im",
    "TQ": "additive-tq"
  };

  const CATEGORY_LABELS = {
    "Raffia": "WH034N Composition",
    "IM": "IH120N Composition",
    "TQ": "FH110N Composition"
  };

  let additiveData = [];

  function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = "";
    let quoted = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const next = text[i + 1];

      if (char === '"' && quoted && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === "," && !quoted) {
        row.push(field.trim());
        field = "";
      } else if (
        (char === "\n" || char === "\r") &&
        !quoted
      ) {
        if (char === "\r" && next === "\n") i++;

        row.push(field.trim());

        if (row.some(value => value !== "")) {
          rows.push(row);
        }

        row = [];
        field = "";
      } else {
        field += char;
      }
    }

    if (field !== "" || row.length) {
      row.push(field.trim());
      if (row.some(value => value !== "")) rows.push(row);
    }

    if (!rows.length) return [];

    const headers = rows.shift().map((header, index) =>
      index === 0
        ? header.replace(/^\uFEFF/, "").trim().toLowerCase()
        : header.trim().toLowerCase()
    );

    return rows.map(values => {
      const record = {};
      headers.forEach((header, index) => {
        record[header] = values[index] || "";
      });
      return record;
    });
  }

  async function loadCSV() {
    const response = await fetch(
      CSV_URL + "?v=" + Date.now(),
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error("Could not load calculators/additive.csv");
    }

    const text = await response.text();
    const records = parseCSV(text);

    additiveData = records
      .map(record => ({
        category: (record.category || "").trim(),
        name: (record.additive_name || "").trim(),
        ppm: Number(record.ppm),
        bagWeight: Number(record.bag_weight_kg),
        defaultBatch: Number(record.default_batch_mt)
      }))
      .filter(item =>
        CATEGORY_KEYS[item.category] &&
        item.name &&
        Number.isFinite(item.ppm) &&
        item.ppm >= 0 &&
        Number.isFinite(item.bagWeight) &&
        item.bagWeight > 0 &&
        Number.isFinite(item.defaultBatch) &&
        item.defaultBatch > 0
      );

    if (!additiveData.length) {
      throw new Error("No valid additive records found in CSV.");
    }
  }

  function readBatch(category, defaultBatch) {
    try {
      const saved = localStorage.getItem(
        STORAGE_PREFIX + category
      );

      return saved !== null ? saved : String(defaultBatch);
    } catch (_) {
      return String(defaultBatch);
    }
  }

  function saveBatch(category, value) {
    try {
      localStorage.setItem(
        STORAGE_PREFIX + category,
        value
      );
    } catch (error) {
      console.warn("Could not save batch quantity:", error);
    }
  }

  function formatBags(value) {
    return value.toFixed(1);
  }

  

  function initCalculator() {
    const selector = document.getElementById("calculatorType");
    const propylenePanel = document.getElementById(
      "propyleneStockCalculator"
    );

    if (!selector || !propylenePanel) {
      console.error(
        "Additive calculator: existing calculator elements not found."
      );
      return;
    }

    let panel = document.getElementById("additiveCalculatorPanel");

    if (!panel) {
      panel = document.createElement("div");
      panel.id = "additiveCalculatorPanel";
      panel.className = "calculator-form";
      panel.hidden = true;

      propylenePanel.insertAdjacentElement("afterend", panel);
    }

    Object.entries(CATEGORY_KEYS).forEach(([category, key]) => {
      const exists = Array.from(selector.options).some(
        option => option.value === key
      );

      if (!exists) {
        const option = document.createElement("option");
        option.value = key;
        option.textContent = CATEGORY_LABELS[category];
        selector.appendChild(option);
      }
    });

    function renderCalculator(category) {
      const items = additiveData.filter(
        item => item.category === category
      );

      if (!items.length) {
        panel.innerHTML =
          `<p>No additive data found for ${category}.</p>`;
        return;
      }

      const defaultBatch = items[0].defaultBatch;
      const batchValue = readBatch(category, defaultBatch);

      panel.innerHTML = `
        <div class="additive-batch-row">
          <label class="additive-batch-label"
                 for="additiveBatchAmount">
            Batch to be prepared for
          </label>

          <input class="additive-batch-input"
                 id="additiveBatchAmount"
                 type="number"
                 inputmode="decimal"
                 min="0"
                 step="any"
                 value="${batchValue}"
                 aria-label="Batch to be prepared for, in MT">

          <span class="additive-batch-unit">MT</span>
        </div>

        <button type="button"
                id="calculateAdditiveBagsBtn"
                class="calculator-action additive-calculate-button">
          Calculate Bags
        </button>

        <div id="additiveResults"
             role="status"
             aria-live="polite"
             hidden></div>
      `;

      const input = panel.querySelector("#additiveBatchAmount");
      const button = panel.querySelector("#calculateAdditiveBagsBtn");
      const results = panel.querySelector("#additiveResults");

      function calculate() {
        const batch = Number(input.value);
        results.hidden = false;

        if (
          input.value.trim() === "" ||
          !Number.isFinite(batch) ||
          batch <= 0
        ) {
          results.innerHTML = `
            <p class="calculator-result error">
              Enter a batch quantity greater than zero.
            </p>
          `;
          return;
        }

        saveBatch(category, input.value);

        
        let totalPPM = 0;
        let totalBags = 0;
        let totalAdditiveKg = 0;

        const rows = items.map(item => {
          const bags =
            (batch * item.ppm) / item.bagWeight / 1000;

          // Round each additive's bag quantity to a whole bag.
          const roundedBags = Math.round(bags);

          totalPPM += item.ppm;
          totalBags += roundedBags;
          totalAdditiveKg += roundedBags * item.bagWeight;

          return `
            <tr>
              <td title="${item.name}">${item.name}</td>
              <td>${item.ppm}</td>
              <td>${item.bagWeight} kg</td>
              <td>${formatBags(bags)}</td>
            </tr>
          `;
        }).join("");

        results.innerHTML = `
          <div class="additive-result-title">
            ${CATEGORY_LABELS[category]}
          </div>

          <table class="additive-table">
            <thead>
              <tr>
                <th>Additive Name</th>
                <th>PPM</th>
                <th>Bag Wt.</th>
                <th>Bags Required</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>

          
          <p class="additive-rounding-note">
            *The required number of bags may be rounded off to the nearest whole number
          </p>

          <div class="additive-summary">
            <div><strong>Total PPM:</strong> ${totalPPM}</div>
            <div><strong>Total Bags:</strong> ${totalBags}</div>
            <div><strong>Total Additive:</strong> ${totalAdditiveKg} kg</div>
          </div>
        `;
      }

      input.addEventListener("input", () => {
        saveBatch(category, input.value);
      });

      button.addEventListener("click", calculate);

      calculate();
    }

    function updateSelectedCalculator() {
      const selected = selector.value;
      const category = Object.keys(CATEGORY_KEYS).find(
        name => CATEGORY_KEYS[name] === selected
      );

      if (category) {
        propylenePanel.style.display = "none";
        panel.hidden = false;
        renderCalculator(category);
      } else {
        panel.hidden = true;
        propylenePanel.style.display = "";
      }
    }

    selector.addEventListener("change", updateSelectedCalculator);

    loadCSV()
      .then(updateSelectedCalculator)
      .catch(error => {
        console.error("Additive calculator error:", error);
        panel.hidden = false;
        propylenePanel.style.display = "none";
        panel.innerHTML = `
          <p class="calculator-result error">
            Unable to load additive data. Please check that
            calculators/additive.csv exists and has been committed.
            Then refresh the dashboard.
          </p>
        `;
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCalculator);
  } else {
    initCalculator();
  }
})();
