(function () {
  "use strict";

        const CSV_URL =
          "https://raw.githubusercontent.com/debajitd1292/co2/main/updates/plant_status.csv";

        const MAJOR_CSV_URL =
          "https://raw.githubusercontent.com/debajitd1292/co2/main/updates/major_equipment_shutdown.csv";

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

  
function getMonthlyShutdownData(events) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const elapsedMonthMs = Math.max(0, now.getTime() - monthStart.getTime());

  const ordered = events
    .map((row) => ({
      event: (row.event || "").trim().toLowerCase(),
      dateTime: parseEventDateTime(row.date, row.time)
    }))
    .filter((item) =>
      item.dateTime &&
      item.dateTime <= now &&
      (item.event === "shutdown" || item.event === "startup")
    )
    .sort((a, b) => a.dateTime - b.dateTime);

  let shutdownMs = 0;

  ordered.forEach((item, index) => {
    if (item.event !== "shutdown") return;

    const nextStartup = ordered
      .slice(index + 1)
      .find((next) => next.event === "startup");

    const intervalEnd = nextStartup ? nextStartup.dateTime : now;

    const overlapStart = Math.max(
      item.dateTime.getTime(),
      monthStart.getTime()
    );

    const overlapEnd = Math.min(
      intervalEnd.getTime(),
      now.getTime()
    );

    if (overlapEnd > overlapStart) {
      shutdownMs += overlapEnd - overlapStart;
    }
  });

  const totalHours = Math.floor(shutdownMs / 3600000);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  const shutdownPercentage = elapsedMonthMs > 0
    ? Math.min(100, (shutdownMs / elapsedMonthMs) * 100)
    : 0;

  const runningPercentage = 100 - shutdownPercentage;

  return {
    days,
    hours,
    shutdownPercentage,
    runningPercentage
  };
}


function majorCard(name, allEvents) {
  const events = allEvents
    .filter((row) =>
      (row.equipment_name || "").trim().toLowerCase() === name.toLowerCase()
    )
    .map((row) => ({
      event: (row.event || "").trim(),
      date: (row.date || "").trim(),
      time: (row.time || "").trim(),
      dateTime: parseEventDateTime(row.date, row.time)
    }))
    .filter((row) =>
      row.dateTime &&
      (row.event.toLowerCase() === "shutdown" ||
       row.event.toLowerCase() === "startup")
    )
    .sort((a, b) => a.dateTime - b.dateTime);

  const latest = events.length ? events[events.length - 1] : null;

  let status = "Status Undetermined";
  let statusClass = "plant-unknown";
  let eventLabel = "";
  let eventDate = "";
  let durationLabel = "";
  let durationValue = "";

  if (latest) {
    if (latest.event.toLowerCase() === "startup") {
      status = "Running";
      statusClass = "plant-running";
      eventLabel = "Last Startup:";
      durationLabel = "Continuous Uptime:";
      durationValue = formatDuration(latest.date, latest.time);
    } else {
      status = "Shutdown";
      statusClass = "plant-shutdown";
      eventLabel = "Last Shutdown:";
      durationLabel = "Continuous Downtime:";
      durationValue = formatDuration(latest.date, latest.time);
    }

    eventDate = eventDateText(latest.date, latest.time);
  }

  const monthlyData = getMonthlyShutdownData(
    allEvents.filter((row) =>
      (row.equipment_name || "").trim().toLowerCase() === name.toLowerCase()
    )
  );

  const monthlyDuration =
    `${monthlyData.days} days & ${monthlyData.hours} hours`;

  const runningWidth = monthlyData.runningPercentage.toFixed(2);
  const shutdownWidth = monthlyData.shutdownPercentage.toFixed(2);

  return `
    <article class="plant-major-card ${statusClass}">

      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:10px;
      ">
        <div class="plant-card-title">${escapeHTML(name)}</div>
        <div class="plant-status-text">${escapeHTML(status)}</div>
      </div>

      <div style="margin-top:12px;">

        <div style="
          font-size:0.82em;
          font-weight:500;
          margin-bottom:5px;
          color:var(--text-secondary, #64748b);
        ">
          Monthly Running Time
        </div>

        <div style="
          width:100%;
          height:10px;
          display:flex;
          overflow:hidden;
          border-radius:20px;
          background:#dc5555;
        ">
          <div style="
            width:${runningWidth}%;
            height:100%;
            background:#16a34a;
          "></div>
        </div>

        <div style="
          display:flex;
          justify-content:space-between;
          gap:8px;
          margin-top:5px;
          font-size:0.78em;
        ">
          <span style="color:#16a34a;font-weight:600;">
            Running ${runningWidth}%
          </span>
          <span style="color:#dc5555;font-weight:600;">
            Downtime ${shutdownWidth}%
          </span>
        </div>

      </div>

      ${
        eventDate
          ? `<div class="plant-event-date">
               <span class="plant-date-label">${escapeHTML(eventLabel)}</span>
               ${escapeHTML(eventDate)}
             </div>`
          : ""
      }

      ${
        durationValue
          ? `<div class="plant-duration">
               <span class="plant-date-label">${escapeHTML(durationLabel)}</span>
               ${escapeHTML(durationValue)}
             </div>`
          : ""
      }

      <div class="plant-duration">
        <span class="plant-date-label">Total Monthly Downtime:</span>
        ${escapeHTML(monthlyDuration)}
      </div>

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


function render(rows, majorEvents) {
    const majorContainer = $("plantMajorCards");
    const fpuContainer = $("plantFpuCards");

    if (!majorContainer || !fpuContainer) {
      return;
    }

      majorContainer.innerHTML = [
        majorCard("Reactor", majorEvents),
        majorCard("Extruder", majorEvents)
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


   let lastGoodMajorEvents = [];

  async function refreshPlantStatus() {
    if (isRefreshing) return;

    isRefreshing = true;

    try {
      const cacheKey = "?v=" + Date.now();

      const [plantResponse, majorResponse] = await Promise.all([
        fetch(CSV_URL + cacheKey, { cache: "no-store" }),
        fetch(MAJOR_CSV_URL + cacheKey, { cache: "no-store" })
      ]);

      if (!plantResponse.ok) {
        throw new Error(`Plant status CSV: HTTP ${plantResponse.status}`);
      }

      if (!majorResponse.ok) {
        throw new Error(`Major equipment CSV: HTTP ${majorResponse.status}`);
      }

      const [plantText, majorText] = await Promise.all([
        plantResponse.text(),
        majorResponse.text()
      ]);

      const rows = parseCSV(plantText);
      const majorEvents = parseCSV(majorText);

      if (!rows.length) {
        throw new Error("Plant status CSV is empty or could not be parsed");
      }

      lastGoodRows = rows;
      lastGoodMajorEvents = majorEvents;

      render(lastGoodRows, lastGoodMajorEvents);

    } catch (error) {
      console.warn("Plant status refresh failed:", error);

      if (lastGoodRows.length) {
        render(lastGoodRows, lastGoodMajorEvents);
        setNote("Unable to refresh plant data. Showing last available data.");
      } else {
        setNote("Plant data could not be loaded. Check both CSV files.");
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
