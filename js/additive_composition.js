
/* Additive Composition Calculators
   PPU Operations Dashboard
   Formula: Bags = Batch (MT) × PPM / Bag Weight (kg) / 1000
*/

(function () {
  "use strict";

  const ADDITIVE_CONFIG = {
    "additive-raffia": {
      title: "Additive Composition - Raffia",
      defaultBatch: 135,
      additives: [
        { name: "AO 1010", ppm: 450, bagWeight: 20 },
        { name: "IRGAPHOS 168", ppm: 900, bagWeight: 25 },
        { name: "DHT 4A", ppm: 300, bagWeight: 20 }
      ]
    },

    "additive-im": {
      title: "Additive Composition - IM",
      defaultBatch: 220,
      additives: [
        { name: "AO 1010", ppm: 450, bagWeight: 20 },
        { name: "IRGAPHOS 168", ppm: 450, bagWeight: 25 },
        { name: "CAST", ppm: 800, bagWeight: 20 }
      ]
    },

    "additive-tq": {
      title: "Additive Composition - TQ",
      defaultBatch: 100,
      additives: [
        { name: "AO 1010", ppm: 450, bagWeight: 20 },
        { name: "IRGAPHOS 168", ppm: 900, bagWeight: 25 },
        { name: "CAST", ppm: 250, bagWeight: 20 },
        { name: "DHT 4A", ppm: 250, bagWeight: 20 },
        { name: "Erucamide", ppm: 1300, bagWeight: 25 },
        { name: "Oleamide", ppm: 1000, bagWeight: 25 },
        { name: "Silobloc", ppm: 2500, bagWeight: 25 }
      ]
    }
  };

  function initAdditiveCalculators() {
    const selector = document.getElementById("calculatorType");
    const propylenePanel = document.getElementById(
      "propyleneStockCalculator"
    );

    if (
      !selector ||
      !propylenePanel ||
      document.getElementById("additiveCalculatorPanel")
    ) {
      return;
    }

    // Add the three options to the existing dropdown.
    Object.entries(ADDITIVE_CONFIG).forEach(([value, config]) => {
      const exists = Array.from(selector.options).some(
        option => option.value === value
      );

      if (!exists) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = config.title;
        selector.appendChild(option);
      }
    });

    // Create the additive calculator panel.
    const panel = document.createElement("div");
    panel.id = "additiveCalculatorPanel";
    panel.className = "calculator-form";
    panel.hidden = true;

    propylenePanel.insertAdjacentElement("afterend", panel);

    // Compact styling to fit all four table columns on one line.
    const style = document.createElement("style");
    style.id = "additiveCalculatorStyles";

    style.textContent = `
      #additiveCalculatorPanel {
        margin-top: 8px;
      }

      #additiveCalculatorPanel .additive-batch-row {
        display: flex;
        align-items: center;
        gap: 7px;
        flex-wrap: nowrap;
        margin: 10px 0 12px;
        width: 100%;
      }

      #additiveCalculatorPanel .additive-batch-label {
        flex: 0 0 auto;
        font-size: 13px;
        font-weight: 600;
        white-space: nowrap;
      }

      #additiveCalculatorPanel .additive-batch-input {
        flex: 1 1 70px;
        width: 70px;
        min-width: 45px;
        max-width: 130px;
        box-sizing: border-box;
      }

      #additiveCalculatorPanel .additive-batch-unit {
        flex: 0 0 auto;
        font-size: 13px;
        white-space: nowrap;
      }

      #additiveCalculatorPanel .additive-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        margin-top: 10px;
        font-size: clamp(9px, 2.65vw, 12px);
      }

      #additiveCalculatorPanel .additive-table th,
      #additiveCalculatorPanel .additive-table td {
        padding: 8px 3px;
        text-align: left;
        border-bottom: 1px solid
          var(--border-color, rgba(128,128,128,.25));
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-variant-numeric: tabular-nums;
      }

      #additiveCalculatorPanel .additive-table th {
        font-weight: 700;
        opacity: .82;
      }

      #additiveCalculatorPanel .additive-table th:nth-child(1),
      #additiveCalculatorPanel .additive-table td:nth-child(1) {
        width: 37%;
      }

      #additiveCalculatorPanel .additive-table th:nth-child(2),
      #additiveCalculatorPanel .additive-table td:nth-child(2) {
        width: 16%;
        text-align: right;
      }

      #additiveCalculatorPanel .additive-table th:nth-child(3),
      #additiveCalculatorPanel .additive-table td:nth-child(3) {
        width: 19%;
        text-align: right;
      }

      #additiveCalculatorPanel .additive-table th:nth-child(4),
      #additiveCalculatorPanel .additive-table td:nth-child(4) {
        width: 28%;
        text-align: right;
      }

      #additiveCalculatorPanel .additive-calculate-button {
        width: 100%;
        margin-top: 4px;
      }

      #additiveCalculatorPanel .additive-result-title {
        margin: 12px 0 4px;
        font-weight: 700;
        font-size: 13px;
      }

      @media (min-width: 520px) {
        #additiveCalculatorPanel .additive-table {
          font-size: 12px;
        }

        #additiveCalculatorPanel .additive-table th,
        #additiveCalculatorPanel .additive-table td {
          padding: 9px 6px;
        }
      }

      @media (max-width: 360px) {
        #additiveCalculatorPanel .additive-table {
          font-size: 9px;
        }

        #additiveCalculatorPanel .additive-table th,
        #additiveCalculatorPanel .additive-table td {
          padding-left: 2px;
          padding-right: 2px;
        }
      }
    `;

    document.head.appendChild(style);

    // Save each calculator's batch quantity separately.
    function readBatch(key, defaultBatch) {
      try {
        const saved = JSON.parse(
          localStorage.getItem("ppuCalculator:" + key + ":v1") || "{}"
        );

        return saved.batch !== undefined
          ? saved.batch
          : String(defaultBatch);
      } catch (_) {
        return String(defaultBatch);
      }
    }

    function saveBatch(key, batch) {
      try {
        localStorage.setItem(
          "ppuCalculator:" + key + ":v1",
          JSON.stringify({ batch })
        );
      } catch (error) {
        console.warn(
          "Could not autosave additive batch amount:",
          error
        );
      }
    }

    function formatBags(value) {
      return value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
    }

    function renderCalculator(key) {
      const config = ADDITIVE_CONFIG[key];
      if (!config) return;

      const batchValue = readBatch(key, config.defaultBatch);

      panel.innerHTML = `
        <p class="calculator-description">
          Enter the batch quantity to calculate the required additive bags.
        </p>

        <div class="additive-batch-row">
          <label
            class="additive-batch-label"
            for="additiveBatchAmount"
          >Batch to be prepared for</label>

          <input
            class="additive-batch-input"
            id="additiveBatchAmount"
            type="number"
            inputmode="decimal"
            min="0"
            step="any"
            value="${batchValue}"
            aria-label="Batch to be prepared for, in metric tonnes"
          >

          <span class="additive-batch-unit">MT</span>
        </div>

        <button
          type="button"
          id="calculateAdditiveBagsBtn"
          class="calculator-action additive-calculate-button"
        >Calculate Bags</button>

        <div
          id="additiveResults"
          role="status"
          aria-live="polite"
          hidden
        ></div>
      `;

      const batchInput = panel.querySelector("#additiveBatchAmount");
      const calculateButton = panel.querySelector(
        "#calculateAdditiveBagsBtn"
      );
      const results = panel.querySelector("#additiveResults");

      batchInput.addEventListener("input", () => {
        saveBatch(key, batchInput.value);
      });

      batchInput.addEventListener("change", () => {
        saveBatch(key, batchInput.value);
      });

      function calculate() {
        const batch = Number(batchInput.value);
        results.hidden = false;

        if (
          batchInput.value.trim() === "" ||
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

        saveBatch(key, batchInput.value);

        const rows = config.additives.map(item => {
          const bags =
            (batch * item.ppm) / item.bagWeight / 1000;

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
          <div class="additive-result-title">${config.title}</div>

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
        `;
      }

      calculateButton.addEventListener("click", calculate);

      // Display results immediately for the default or saved batch.
      calculate();
    }

    function showSelectedCalculator() {
      const selected = selector.value;

      const isPropylene =
        selected === "propylene-stock" || selected === "";

      propylenePanel.style.display = isPropylene ? "" : "none";
      panel.hidden = isPropylene;

      if (!isPropylene && ADDITIVE_CONFIG[selected]) {
        renderCalculator(selected);
      }
    }

    selector.addEventListener("change", showSelectedCalculator);

    showSelectedCalculator();
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initAdditiveCalculators
    );
  } else {
    initAdditiveCalculators();
  }
})();
