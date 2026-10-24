(function () {
  "use strict";

    const CSV_URL =
      "https://raw.githubusercontent.com/debajitd1292/co2/main/updates/plant_status.csv";

    const REFRESH_INTERVAL = 2 * 60 * 1000;

    let lastGoodRows = [];
    let refreshTimer = null;
    let isRefreshing = false;

    const $ = (id) => document.getElementById(id);


function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;

    text = text.replace(/^\uFEFF/, "");

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];

      if (ch === '"') {
        if (inQuotes && next === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        row.push(field.trim());
        field = "";
      } else if (
        (ch === "\n" || ch === "\r") &&
        !inQuotes
      ) {
        if (ch === "\r" && next === "\n") i++;

        row.push(field.trim());

        if (row.some((v) => v !== "")) {
          rows.push(row);
        }

        row = [];
        field = "";
      } else {
        field += ch;
      }
    }

    if (field !== "" || row.length > 0) {
      row.push(field.trim());
      if (row.some((v) => v !== "")) rows.push(row);
    }

    if (!rows.length) return [];

    const headers = rows[0].map((h) =>
      h.trim().toLowerCase().replace(/^\uFEFF/, "")
    );

    return rows.slice(1).map((values) => {
      const obj = {};

      headers.forEach((header, index) => {
        obj[header] = (values[index] || "").trim();
      });

      return obj;
  });
}


function parseDate(value) {
    if (!value) return null;

    // Expected CSV format: YYYY-MM-DD
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (!match) return null;

    const date = new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3])
    );

    // Reject invalid dates such as 2026-02-31
    if (
      date.getFullYear() !== Number(match[1]) ||
      date.getMonth() !== Number(match[2]) - 1 ||
      date.getDate() !== Number(match[3])
    ) {
      return null;
    }

    date.setHours(0, 0, 0, 0);
    return date;
}


function formatDate(value) {
    const date = parseDate(value);
    if (!date) return "";

    const day = String(date.getDate()).padStart(2, "0");
    const month = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ][date.getMonth()];

    return `${day}-${month}-${date.getFullYear()}`;
}



function parseEventDateTime(dateValue, timeValue) {
    const date = parseDate(dateValue);
    if (!date) return null;

    const time = (timeValue || "").trim();

    if (time) {
        const match = time.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
        if (!match) return null;

        date.setHours(Number(match[1]), Number(match[2]), 0, 0);
    }

    return date;
}


function formatDuration(startDate, timeValue = "") {
    if (!startDate) return "";

    const start = parseEventDateTime(startDate, timeValue);
    if (!start) return "";

    const now = new Date();
    const elapsedMs = Math.max(0, now.getTime() - start.getTime());

    const hasTime = Boolean((timeValue || "").trim());

    const days = Math.floor(elapsedMs / 86400000);

    // When no time is supplied, retain whole-day display.
    if (!hasTime) {
        return `${days} day${days === 1 ? "" : "s"}`;
    }

    const hours = Math.floor(
        (elapsedMs % 86400000) / 3600000
    );

    if (days === 0 && hours === 0) {
        return "Less than 1 hour";
    }

    const parts = [];

    if (days > 0) {
        parts.push(`${days} day${days === 1 ? "" : "s"}`);
    }

    if (hours > 0) {
        parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
    }

    return parts.join(" & ");
}


function shiftText(shift) {
    if (!shift) return "";

    const cleaned = shift.trim().replace(/\s*shift$/i, "");
    return ` (${cleaned} Shift)`;
  }



function eventDateText(date, time, shift) {
    if (!date) return "Date not available";

    const formattedDate = formatDate(date);
    const formattedTime = (time || "").trim();

    const timeText = /^([01]\d|2[0-3]):([0-5]\d)$/.test(formattedTime)
        ? `, ${formattedTime} hours`
        : "";

    return formattedDate + timeText + shiftText(shift);
}


function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[ch]);
}


function getRow(rows, type, name) {
    return rows.find((row) =>
      (row.equipment_type || "").toLowerCase() === type.toLowerCase() &&
      (row.equipment_name || "").toLowerCase() === name.toLowerCase()
    );
  }

  function setNote(message) {
    const el = $("plantDataNote");
    if (el) el.textContent = message || "";
  }

  
function majorCard(row, name) {
  row = row || {};

  const startup = parseEventDateTime(
      row.last_startup_date,
      row.last_startup_time
  );

  const shutdown = parseEventDateTime(
      row.last_shutdown_date,
      row.last_shutdown_time
  );

  let status = "Status Undetermined";
  let statusClass = "plant-unknown";
  let eventLabel = "";
  let eventDate = "";
  let duration = "";

  if (startup && shutdown && startup.getTime() !== shutdown.getTime()) {
    if (startup > shutdown) {
      status = "Running";
      statusClass = "plant-running";
      eventLabel = "Last Startup";
      eventDate = eventDateText(
          row.last_startup_date,
          row.last_startup_time,
          row.last_event_shift
      );

      duration = `Continuous uptime: ${formatDuration(
          row.last_startup_date,
          row.last_startup_time
      )}`;
      } else {
      status = "Shutdown";
      statusClass = "plant-shutdown";
      eventLabel = "Last Shutdown";
      eventDate = eventDateText(
          row.last_shutdown_date,
          row.last_shutdown_time,
          row.last_event_shift
      );

      duration = `Continuous downtime: ${formatDuration(
          row.last_shutdown_date,
          row.last_shutdown_time
      )}`;
    }
  } else if (startup && !shutdown) {
    eventLabel = "Last Startup";
    eventDate = eventDateText(
      row.last_startup_date,
      row.last_event_shift
    );
  } else if (shutdown && !startup) {
    eventLabel = "Last Shutdown";
    eventDate = eventDateText(
      row.last_shutdown_date,
      row.last_event_shift
    );
  }

  return `
    <article class="plant-major-card ${statusClass}">
      <div class="plant-card-title">${escapeHTML(name)}</div>
      <div class="plant-status-text">${escapeHTML(status)}</div>
      ${
        eventDate
           
          ? `<div class="plant-event-date"><span class="plant-date-label">${escapeHTML(eventLabel)}:</span> ${escapeHTML(eventDate)}</div>`

          : ""
      }
      ${
        duration
          ? `<div class="plant-duration">${escapeHTML(duration)}</div>`
          : ""
      }
    </article>
  `;
}


function fpuCard(row, name, pairStatus = null) {
    row = row || {};

    const inlineDate = parseEventDateTime(
        row.last_taken_inline_date,
        row.last_taken_inline_time
    );

    const regenDate = parseEventDateTime(
        row.last_regeneration_date,
        row.last_regeneration_time
    );
    const customStatus = (row.custom_status || "").trim();

    let status = "Undetermined";
    let statusClass = "plant-fpu-unknown";
    let eventLabel = "";
    let eventDate = "";

    // Use pair-wise status when supplied; otherwise retain existing date logic.
    if (pairStatus) {
      status = pairStatus;
    } else if (
      inlineDate &&
      regenDate &&
      inlineDate.getTime() !== regenDate.getTime()
    ) {
      status = inlineDate > regenDate ? "Inline" : "Standby";
    } else if (inlineDate && !regenDate) {
      status = "Inline";
    } else if (regenDate && !inlineDate) {
      status = "Standby";
    }

    if (status === "Inline") {
      statusClass = "plant-fpu-inline";
      if (inlineDate) {
        eventLabel = "Last Taken Inline";
        eventDate = eventDateText(
          row.last_taken_inline_date,
          row.last_taken_inline_time,
          row.last_inline_shift
        );
    }
    } else if (status === "Standby") {
      statusClass = "plant-fpu-standby";

    // Prefer regeneration date for Standby; fall back to inline date.
    if (regenDate) {
      eventLabel = name.startsWith("RG Filter")
      ? "Last Cleaned"
      : "Last Regenerated";
      eventDate = eventDateText(
        row.last_regeneration_date,
        row.last_regeneration_time,
        row.last_regeneration_shift
      );
    } else if (inlineDate) {
      eventLabel = "Last Taken Inline";
      eventDate = eventDateText(
        row.last_taken_inline_date,
        row.last_taken_inline_time,
        row.last_inline_shift
      );
    }
  }

  // If no pair status was determined, still show any available event date.
  if (!eventDate && !pairStatus) {
    if (inlineDate && !regenDate) {
      eventLabel = "Last Taken Inline";
      eventDate = eventDateText(
        row.last_taken_inline_date,
        row.last_taken_inline_time,
        row.last_inline_shift
      );
    } else if (regenDate && !inlineDate) {
      eventLabel = name.startsWith("RG Filter")
      ? "Last Cleaned"
      : "Last Regenerated";
      eventDate = eventDateText(
        row.last_regeneration_date,
        row.last_regeneration_time,
        row.last_regeneration_shift
      );
    }
  }

  const durationInline =
    status === "Inline" && inlineDate
        ? formatDuration(
            row.last_taken_inline_date,
            row.last_taken_inline_time
        )
        : null;

  return `
    <article class="plant-fpu-card ${statusClass}">
      <div class="plant-card-title">${escapeHTML(name)}</div>
      <div class="plant-status-text">
        <span>${escapeHTML(status)}</span>
        ${
          customStatus
            ? `<span class="plant-custom-message"> (${escapeHTML(customStatus)})</span>`
            : ""
        }
      </div>
      ${
        eventDate
           
          ? `<div class="plant-event-date"><span class="plant-date-label">${escapeHTML(eventLabel)}:</span> ${escapeHTML(eventDate)}</div>`

          : ""
      }
      ${
        durationInline !== null
          ? `<div class="plant-duration">Inline: ${durationInline}</div>`
          : ""
      }
    </article>
  `;
}


function render(rows) {
    const majorContainer = $("plantMajorCards");
    const fpuContainer = $("plantFpuCards");

    if (!majorContainer || !fpuContainer) {
      return;
    }

      majorContainer.innerHTML = [
        majorCard(getRow(rows, "major", "Reactor"), "Reactor"),
        majorCard(getRow(rows, "major", "Extruder"), "Extruder")
      ].join("");

    // Hide Current Production Grade when Reactor is Shutdown.
    const reactorStatus = majorContainer
      .querySelector(".plant-major-card .plant-status-text");

    const productionGradeCard =
      document.querySelector(".production-grade-card");

    if (productionGradeCard && reactorStatus) {
      productionGradeCard.style.display =
        reactorStatus.textContent.trim() === "Shutdown"
          ? "none"
          : "";
    }

    const fpuPairs = [
      ["Dryer-A", "Dryer-B"],
      ["Treater-A", "Treater-B"],
      ["RG Filter-A", "RG Filter-B"]
    ];

    const fpuCards = [];

    fpuPairs.forEach(([nameA, nameB]) => {
      const rowA = getRow(rows, "fpu", nameA) || {};
      const rowB = getRow(rows, "fpu", nameB) || {};

      const dateA = parseEventDateTime(
          rowA.last_taken_inline_date,
          rowA.last_taken_inline_time
      );

      const dateB = parseEventDateTime(
          rowB.last_taken_inline_date,
          rowB.last_taken_inline_time
      );

      let statusA = null;
      let statusB = null;

      if (dateA && dateB && dateA.getTime() !== dateB.getTime()) {
        statusA = dateA > dateB ? "Inline" : "Standby";
        statusB = dateB > dateA ? "Inline" : "Standby";
      }

      fpuCards.push(fpuCard(rowA, nameA, statusA));
      fpuCards.push(fpuCard(rowB, nameB, statusB));
    });

    fpuContainer.innerHTML = fpuCards.join("");

    setNote("");
  }


  async function refreshPlantStatus() {
    if (isRefreshing) return;

    isRefreshing = true;

    try {
      const url =
        CSV_URL + "?v=" + Date.now();

      const response = await fetch(url, {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const text = await response.text();
      const rows = parseCSV(text);

      if (!rows.length) {
        throw new Error("CSV is empty or could not be parsed");
      }

      // Save only valid, successfully retrieved data.
      lastGoodRows = rows;
      render(lastGoodRows);

    } catch (error) {
      console.warn("Plant status refresh failed:", error);

      if (lastGoodRows.length) {
        render(lastGoodRows);
        setNote("Unable to refresh plant status. Showing last available data.");
      } else {
        setNote("Plant status data could not be loaded. Check the CSV file.");
      }
    } finally {
      isRefreshing = false;
    }
  }

function startPlantStatus() {
    refreshPlantStatus();

    if (refreshTimer) {
      clearInterval(refreshTimer);
    }

    refreshTimer = setInterval(
      refreshPlantStatus,
      REFRESH_INTERVAL
    );
  }

  // Refresh when the user returns to the app.
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      refreshPlantStatus();
    }
  });

  // Start after the page elements have loaded.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startPlantStatus);
  } else {
    startPlantStatus();
  }

})();
