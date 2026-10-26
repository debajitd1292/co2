
/**
 * Propylene Pumpable Stock Calculator
 * Inputs: Sphere A, B and C levels in mm
 * Output: Approx Pumpable Stock in MT
 *
 * CSV file:
 * calculators/propylene_stock_lookup.csv
 */

const DEFAULT_CSV_URL = "./calculators/propylene_stock_lookup.csv";
const MILLION = 1000000;

// Parse CSV data
function parseCsv(text) {
  const records = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"' && field.length === 0) {
      quoted = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field.replace(/\r$/, ""));
      if (row.some(v => v !== "")) records.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }

  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ""));
    if (row.some(v => v !== "")) records.push(row);
  }

  if (!records.length) {
    throw new Error("Propylene Stock CSV is empty.");
  }

  const headers = records.shift().map(h => h.trim());

  return records.map(values => {
    const item = {};
    headers.forEach((header, index) => {
      item[header] = (values[index] ?? "").trim();
    });
    return item;
  });
}

// Validate numeric input
function numeric(value, label) {
  if (
    value === "" ||
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {
    throw new Error(label + " must be a valid number.");
  }

  return Number(value);
}

// Get specific rows from CSV
function getRows(data, recordType, tableName) {
  return data.filter(
    row =>
      row.record_type === recordType &&
      row.table_name === tableName
  );
}

// Excel approximate lookup:
// Finds the largest lookup value <= the entered value.
function approximateLookup(
  rows,
  lookupValue,
  keyField,
  resultField,
  label
) {
  const eligible = rows
    .filter(
      row =>
        row[keyField] !== "" &&
        row[resultField] !== ""
    )
    .map(row => ({
      key: Number(row[keyField]),
      result: Number(row[resultField])
    }))
    .filter(
      row =>
        Number.isFinite(row.key) &&
        Number.isFinite(row.result) &&
        row.key <= lookupValue
    )
    .sort((a, b) => a.key - b.key);

  if (!eligible.length) {
    throw new Error(
      label + ": input is below the lookup-table range."
    );
  }

  return eligible[eligible.length - 1].result;
}

// Get total vessel volume
function getTotalVolume(data, tableName) {
  const row = getRows(
    data,
    "volume_config",
    tableName
  )[0];

  if (!row) {
    throw new Error(
      "Missing total-volume data for " + tableName
    );
  }

  return numeric(
    row.total_volume_litres,
    tableName + " total volume"
  );
}

// Get operating pressure
function getPressure(data, tableName) {
  const row = getRows(
    data,
    "operating_parameter",
    tableName
  )[0];

  if (!row) {
    throw new Error(
      "Missing pressure data for " + tableName
    );
  }

  return numeric(
    row.pressure_kg_cm2,
    tableName + " pressure"
  );
}

// Get liquid or vapour density
function getDensity(
  data,
  pressure,
  densityField,
  startPressure = null
) {
  let rows = getRows(
    data,
    "pressure_density",
    "propylene_density"
  );

  if (startPressure !== null) {
    rows = rows.filter(
      row =>
        Number(row.pressure_kg_cm2) >= startPressure
    );
  }

  return approximateLookup(
    rows,
    pressure,
    "pressure_kg_cm2",
    densityField,
    "Propylene density"
  );
}

// Convert level in mm to cm for the Excel lookup table
function liquidVolume(data, tableName, levelMM) {
  const levelCM = levelMM / 10;

  const table = getRows(
    data,
    "volume_lookup",
    tableName
  );

  return approximateLookup(
    table,
    levelCM,
    "level_cm",
    "volume_litres",
    tableName
  );
}

// Main calculation
async function calculatePropyleneStock(
  { sphereA, sphereB, sphereC },
  csvUrl = DEFAULT_CSV_URL
) {
  const levels = {
    sphere_a: numeric(sphereA, "Sphere A level"),
    sphere_b: numeric(sphereB, "Sphere B level"),
    sphere_c: numeric(sphereC, "Sphere C level")
  };

  for (const [name, level] of Object.entries(levels)) {
    if (level < 0) {
      throw new Error(
        name.replace("_", " ") +
        " level cannot be negative."
      );
    }
  }

  const response = await fetch(csvUrl, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(
      "Could not load Propylene Stock CSV. " +
      "Check its GitHub path."
    );
  }

  const data = parseCsv(await response.text());

  // Round operating pressures as in the workbook
  const pressureA = Math.round(
    getPressure(data, "sphere_a")
  );

  const pressureB = Math.round(
    getPressure(data, "sphere_b")
  );

  const pressureC = Math.round(
    getPressure(data, "sphere_c")
  );

  // Liquid volumes
  const liquidA = liquidVolume(
    data, "sphere_a", levels.sphere_a
  );

  const liquidB = liquidVolume(
    data, "sphere_b", levels.sphere_b
  );

  const liquidC = liquidVolume(
    data, "sphere_c", levels.sphere_c
  );

  // Vapour volumes
  const vapourA =
    getTotalVolume(data, "sphere_a") - liquidA;

  const vapourB =
    getTotalVolume(data, "sphere_b") - liquidB;

  const vapourC =
    getTotalVolume(data, "sphere_c") - liquidC;

  // Densities
  const liquidDensityA = getDensity(
    data, pressureA, "liquid_density_kg_m3"
  );

  const vapourDensityA = getDensity(
    data, pressureA, "vapour_density_kg_m3"
  );

  const liquidDensityB = getDensity(
    data, pressureB, "liquid_density_kg_m3"
  );

  // Matches the pressure reference used in the workbook
  const vapourDensityB = getDensity(
    data, pressureA, "vapour_density_kg_m3"
  );

  const liquidDensityC = getDensity(
    data,
    pressureC,
    "liquid_density_kg_m3",
    11
  );

  const vapourDensityC = getDensity(
    data, pressureB, "vapour_density_kg_m3"
  );

  // Mass in metric tonnes
  const massA =
    (
      liquidA * liquidDensityA +
      vapourA * vapourDensityA
    ) / MILLION;

  const massB =
    (
      liquidB * liquidDensityB +
      vapourB * vapourDensityB
    ) / MILLION;

  const massC =
    (
      liquidC * liquidDensityC +
      vapourC * vapourDensityC
    ) / MILLION;

  const totalMass = massA + massB + massC;

  // Workbook deduction: 10 MT per sphere
  const approxPumpableStockMT = totalMass - 30;

  return {
    approxPumpableStockMT,
    sphereMassMT: {
      sphereA: massA,
      sphereB: massB,
      sphereC: massC
    },
    totalBeforeDeductionMT: totalMass,
    deductionMT: 30
  };
}


/* ===== PPU DASHBOARD CALCULATOR INTEGRATION ===== */

window.calculatePropyleneStock = calculatePropyleneStock;

function initPropyleneStockCalculator() {
  const calculateButton = document.getElementById("calculatePropyleneStockBtn");
  const resultBox = document.getElementById("propyleneStockResult");

  const fields = {
    sphereA: document.getElementById("sphereALevel"),
    sphereB: document.getElementById("sphereBLevel"),
    sphereC: document.getElementById("sphereCLevel")
  };

  if (
    !calculateButton ||
    !resultBox ||
    Object.values(fields).some(field => !field)
  ) {
    return;
  }

  // Each calculator must have its own unique storage key.
  const STORAGE_KEY = "ppuCalculator:propylene-stock:v1";

  function readSavedInputs() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch (error) {
      return {};
    }
  }

  function saveInputs() {
    const values = {};

    Object.entries(fields).forEach(([key, field]) => {
      values[key] = field.value;
    });

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    } catch (error) {
      console.warn("Could not autosave calculator inputs:", error);
    }
  }

  // Restore previously entered levels when the page is reopened.
  const saved = readSavedInputs();

  Object.entries(fields).forEach(([key, field]) => {
    if (saved[key] !== undefined) {
      field.value = saved[key];
    }

    field.addEventListener("input", saveInputs);
    field.addEventListener("change", saveInputs);
  });

  function setResultStyle(stockMT) {
    resultBox.classList.remove(
      "status-low",
      "status-normal",
      "status-high",
      "error"
    );

    if (stockMT < 150) {
      resultBox.classList.add("status-low");
    } else if (stockMT <= 600) {
      resultBox.classList.add("status-normal");
    } else {
      resultBox.classList.add("status-high");
    }
  }

  async function calculate() {
    const sphereA = fields.sphereA.value;
    const sphereB = fields.sphereB.value;
    const sphereC = fields.sphereC.value;

    resultBox.hidden = false;
    resultBox.style.display = "block";

    resultBox.classList.remove(
      "error",
      "status-low",
      "status-normal",
      "status-high"
    );

    if ([sphereA, sphereB, sphereC].some(value => value.trim() === "")) {
      resultBox.textContent =
        "Please enter the levels for Sphere A, Sphere B and Sphere C.";
      resultBox.classList.add("error");
      return;
    }

    calculateButton.disabled = true;
    calculateButton.textContent = "Calculating…";
    resultBox.textContent = "Calculating pumpable stock…";

    try {
      const result = await calculatePropyleneStock({
        sphereA,
        sphereB,
        sphereC
      });

      const stock = result.approxPumpableStockMT;

      if (!Number.isFinite(stock)) {
        throw new Error("The calculated stock value is not valid.");
      }

      const status =
        stock < 150 ? "Low" :
        stock <= 600 ? "Normal" :
        "High";

      resultBox.textContent =
        `Approx Pumpable Stock: ${stock.toFixed(2)} MT — ${status}`;

      setResultStyle(stock);
      saveInputs();

    } catch (error) {
      console.error("Propylene stock calculation failed:", error);

      resultBox.textContent = error && error.message
        ? error.message
        : "Unable to calculate pumpable stock. Check the input levels and lookup CSV.";

      resultBox.classList.add("error");

    } finally {
      calculateButton.disabled = false;
      calculateButton.textContent = "Calculate Stock";
    }
  }

  calculateButton.addEventListener("click", calculate);
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initPropyleneStockCalculator
  );
} else {
  initPropyleneStockCalculator();
}
