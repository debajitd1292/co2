async function renderSelected(){

    let val = document.getElementById("datePicker").value;

    if(!val) return;

    let d = new Date(val);

    let formatted = d.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric"
    });

    let renderDate = formatDate(d);

    document.getElementById("selectedTitle").innerText =
        "Selected Date Shift (" + formatted + ")";


    /* =========================================
       CHECK WHETHER SELECTED DATE IS ALREADY
       LOADED
       ========================================= */

    if(header.indexOf(renderDate) === -1){

        const month =
            String(d.getMonth() + 1).padStart(2, "0");

        const year =
            String(d.getFullYear()).slice(-2);

        const monthKey =
            month + year;


        /* =========================================
           LOAD SELECTED MONTH
           ========================================= */

        const selectedExecUrl =
            baseUrl +
            "exec/shift_exec_" +
            monthKey +
            ".csv?v=" +
            Date.now();

        const selectedNonExecUrl =
            baseUrl +
            "nonexec/shift_nonexec_" +
            monthKey +
            ".csv?v=" +
            Date.now();


        try{

            const [
                selectedExecText,
                selectedNonExecText
            ] = await Promise.all([

                fetchCSV(
                    selectedExecUrl,
                    false
                ),

                fetchCSV(
                    selectedNonExecUrl,
                    true
                )

            ]);


            /* =====================================
               MERGE SELECTED MONTH WITH
               ALREADY LOADED DATA
               ===================================== */

            const selectedExecData =
                parseCSV(selectedExecText);

            if(
                selectedExecData &&
                selectedExecData.length
            ){

                data = mergeShiftData(
                    selectedExecData,
                    data,
                    null,
                    [
                        new Date(d.getFullYear(), d.getMonth(), 1),
                        null
                    ]
                );

                header =
                    data[0]?.map(x => x.trim()) || [];
            }


            const selectedNonExecData =
                parseCSV(selectedNonExecText);

            if(
                selectedNonExecData &&
                selectedNonExecData.length
            ){

                nonExecData = mergeShiftData(
                    selectedNonExecData,
                    nonExecData,
                    null,
                    [
                        new Date(d.getFullYear(), d.getMonth(), 1),
                        null
                    ]
                );

                nonExecHeader =
                    nonExecData[0]?.map(x => x.trim()) || [];
            }

        }catch(err){

            console.warn(
                "Selected month schedule not available:",
                monthKey,
                err
            );

        }

    }


    /* =========================================
       RENDER SELECTED DATE
       ========================================= */

    render("selected", renderDate);
}



/* =========================================================
   ECO & LEAVE COUNTER — CALENDAR YEAR TO CURRENT DATE
   ========================================================= */

let ecoLeaveRenderToken = 0;


function renderEcoLeaveCounterMarkup() {
    return `
        <div class="combined-counter-section">
            <h3 class="combined-counter-heading">Double Shift &amp; ECO Counter</h3>
            <div class="eco-leave-grid">
                <div class="eco-leave-item double-shift-item">
                    <span class="eco-leave-label">Double Shift</span>
                    <span class="eco-leave-value double-shift-value" id="doubleShiftCount">—</span>
                </div>

                <div class="eco-leave-item eco-card">
                    <span class="eco-leave-label">Total ECO</span>
                    <span class="eco-leave-value" id="totalEcoValue">— / 26</span>
                </div>
            </div>
        </div>

        <div class="combined-counter-section">
            <h3 class="combined-counter-heading">Training / Tour &amp; Leave Counter</h3>
            <div class="eco-leave-grid">
                <div class="eco-leave-item training-tour-item">
                    <span class="eco-leave-label">Training / Tour</span>
                    <span class="eco-leave-value training-tour-value" id="trainingTourCount">—</span>
                </div>

                <div class="eco-leave-item leave-card">
                    <span class="eco-leave-label">Total Leaves</span>
                    <span class="eco-leave-value" id="totalLeaveValue">—</span>
                </div>
            </div>
        </div>
    `;
}


async function renderEcoLeaveCounter() {
    const box = document.getElementById("ecoLeaveCounter");
    if (!box) return;

    const employee = String(countersSelectedName || "").trim();
    const category = countersSelectedCategory || "";
    const token = ++ecoLeaveRenderToken;

    if (!employee || !category) {
        box.style.display = "none";
        box.innerHTML = "";
        return;
    }

    box.style.display = "";
    box.innerHTML = renderEcoLeaveCounterMarkup();

    const now = new Date();
    const year = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const today = now.getDate();

    const monthlyData = await Promise.all(
        Array.from({ length: currentMonth }, (_, index) =>
            getOffDayMonthSchedule(category, year, index + 1)
        )
    );

    if (token !== ecoLeaveRenderToken) return;
    if (
        String(countersSelectedName || "").trim() !== employee ||
        countersSelectedCategory !== category
    ) return;

    let ecoTotal = 0;
    let leaveTotal = 0;
    let complete = true;

    const specialDates = new Set([
        `${year}-01-26`,
        `${year}-08-15`,
        `${year}-10-02`
    ]);

    for (let monthIndex = 0; monthIndex < currentMonth; monthIndex++) {
        const monthData = monthlyData[monthIndex];

        if (!monthData || !monthData.rows || monthData.rows.length < 2) {
            continue;
        }

        const employeeRow = monthData.rows.slice(1).find(row =>
            String(row?.[0] || "").trim() === employee
        );

        if (!employeeRow) {
            continue;
        }

        const month = monthIndex + 1;
        const daysToCount = month === currentMonth
            ? today
            : new Date(year, month, 0).getDate();

        for (let day = 1; day <= daysToCount; day++) {
            const column = monthData.dayColumns[day - 1];

            if (column == null || column < 0) {
                 continue;
            }

            const rawShift = String(employeeRow[column] || "")
                .trim()
                .toUpperCase();

            const hasExtraEco = rawShift.includes("*");
            const isHalfLeave = rawShift.includes("#");
            const shift = rawShift.replace(/[*#]/g, "").trim();

            const dateKey =
                `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

            if (shift === "L") {
                leaveTotal += isHalfLeave ? 0.5 : 1;
            }

            if (!shift || shift === "-" || shift === "L" || shift === "T") {
                continue;
            }

            const isOff = shift === "OFF" || shift === "O";

            const dateStr =
                `${String(day).padStart(2, "0")}-${String(month).padStart(2, "0")}-${year}`;

            const holiday = typeof holidays !== "undefined"
                ? holidays.find(h => h.date === dateStr)
                : null;

            const isGH = Boolean(holiday && holiday.type === "GH");
            const isRH = Boolean(holiday && holiday.type === "RH");
            const isSpecialDate = specialDates.has(dateKey);

            const abcCount = new Set(
                shift.match(/[ABC]/g) || []
            ).size;

            if (isSpecialDate) {
                if (!isOff) {
                    ecoTotal += abcCount * 2;
                }
            } else if (isGH) {
                if (isOff) {
                    ecoTotal += 1;
                } else if (shift === "G") {
                    ecoTotal += 1;
                } else {
                    ecoTotal += abcCount;
                }
            } else if (!isOff) {
            // Normal days and RH
                ecoTotal += Math.max(0, abcCount - 1);
            }

            // Asterisk adds one extra ECO, regardless of day type.
            if (hasExtraEco) {
                ecoTotal += 1;
            }
        }
    }

    if (token !== ecoLeaveRenderToken) return;

    const ecoElement = document.getElementById("totalEcoValue");
    const leaveElement = document.getElementById("totalLeaveValue");

    
    if (ecoElement) {
        ecoElement.textContent = `${ecoTotal} / 26`;
        ecoElement.classList.toggle("eco-over-limit", ecoTotal > 26);

        animateDataOnFirstLoad(
            ecoElement,
            `eco-${employee}-${category}-${year}`
        );
    }

    if (leaveElement) {
        leaveElement.textContent = String(leaveTotal);

    animateDataOnFirstLoad(
        leaveElement,
        `leave-${employee}-${category}-${year}`
        );
    }

}


function renderNext7Days(){

    const box = document.getElementById("next7Days");

    if(!box) return;

    const offCounter = document.getElementById("offDayCounter");
    const ecoCounter = document.getElementById("ecoLeaveCounter");

    if (!selectedName) {
        if (offCounter) {
            offCounter.style.display = "none";
            offCounter.innerHTML = "";
        }

        if (ecoCounter) {
            ecoCounter.style.display = "none";
            ecoCounter.innerHTML = "";
        }

        box.innerHTML =
            "<div style='color:#777;'>Select name to view shifts</div>";

        return;
    }

    if (offCounter) offCounter.style.display = "";
    if (ecoCounter) ecoCounter.style.display = "";

    renderOffDayCounter();
    renderEcoLeaveCounter();
    renderDoubleShiftAndTrainingCounter();

    if (!header || header.length === 0 || !data || data.length === 0) {
        box.innerHTML =
            "<div style='color:#777;font-weight:bold;'>Shift schedule is not available</div>";

        return;
    }

    const today = new Date();

    const heading = document.getElementById("shiftCalendarHeading");

    if (heading) {
        heading.textContent = "My Shift Schedule for " +
            today.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric"
            });
    }

    const year = today.getFullYear();
    const month = today.getMonth();
    const todayDate = today.getDate();

    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Monday-first calendar
    const startOffset = firstDay.getDay();

    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

        let html = `
        <div class="calendar-grid">
    `;

    // Weekday headings
    weekdays.forEach(day => {
        html += `<div class="calendar-weekday">${day}</div>`;
    });

    // Empty cells before the first day
    for(let i = 0; i < startOffset; i++){
        html += `<div class="calendar-empty"></div>`;
    }

    // All dates in the current month
    for(let day = 1; day <= daysInMonth; day++){

        const d = new Date(year, month, day);

        const dd = String(day).padStart(2, "0");
        const mm = String(month + 1).padStart(2, "0");
        const dateStr = `${dd}-${mm}-${year}`;

        const rawShift = getShift(dateStr, selectedName) || "-";
        const displayShift = rawShift.replace(/[*#]/g, "");

        let shiftClass;

        if(rawShift === "-"){
            shiftClass = "NA";
        }else if(rawShift === "OFF"){
            shiftClass = "OFF";
        }else{
            shiftClass = displayShift.match(/[A-Z]/)?.[0] || "";
        }

        const isToday = day === todayDate;

        html += `
            <div class="calendar-day ${isToday ? "calendar-today" : ""}">
                <div class="calendar-date">${day}</div>
                <div class="calendar-shift">
                    <span class="day-shift ${shiftClass}">${displayShift}</span>
                </div>
            </div>
        `;
    }

    html += `
        </div>
    `;

    box.innerHTML = html;
}

/* =========================================================
   OFF DAY COUNTER — MONTHLY + CALENDAR-PERIOD TOTALS
   ========================================================= */

const offDayMonthCache = new Map();
let offDayCounterRenderToken = 0;

function offDayMonthCacheKey(category, year, month) {
    return `${category}-${year}-${String(month).padStart(2, "0")}`;
}

function getOffDayMonthSchedule(category, year, month) {
    const key = offDayMonthCacheKey(category, year, month);

    if (offDayMonthCache.has(key)) {
        return offDayMonthCache.get(key);
    }

    const monthKey =
        String(month).padStart(2, "0") +
        String(year).slice(-2);

    const folder = category === "nonexec" ? "nonexec" : "exec";
    const prefix = category === "nonexec" ? "shift_nonexec_" : "shift_exec_";
    const version = (typeof DATA_VERSION !== "undefined") ? DATA_VERSION : Date.now();
    const url = `${baseUrl}${folder}/${prefix}${monthKey}.csv?v=${version}`;

    // Cache raw month data, not employee-specific counts.
    const request = fetchCSV(url, true).then(text => {
        const rows = parseCSV(text);
        const daysInMonth = new Date(year, month, 0).getDate();

        if (!rows.length || !rows[0]) {
            return { complete: false, header: [], rows: [], expectedDates: [] };
        }

        const monthHeader = rows[0].map(value => String(value || "").trim());
        const expectedDates = [];
        const dayColumns = [];

        for (let day = 1; day <= daysInMonth; day++) {
            const fullDate = `${String(day).padStart(2, "0")}-${String(month).padStart(2, "0")}-${year}`;
            const shortDate = `${day}-${month}-${year}`;
            const dayHeader = String(day);
            const paddedDayHeader = String(day).padStart(2, "0");

            expectedDates.push(fullDate);

            let column = monthHeader.indexOf(fullDate);
            if (column === -1) column = monthHeader.indexOf(shortDate);
            if (column === -1) column = monthHeader.indexOf(dayHeader);
            if (column === -1) column = monthHeader.indexOf(paddedDayHeader);

            dayColumns.push(column);
        }

        const hasAllDayColumns = dayColumns.every(column => column !== -1);

        return {
            complete: hasAllDayColumns,
            header: monthHeader,
            rows,
            expectedDates,
            dayColumns
        };
    }).catch(error => {
        console.warn("OFF-day counter: monthly schedule unavailable", key, error);
        return { complete: false, header: [], rows: [], expectedDates: [] };
    });

    offDayMonthCache.set(key, request);
    return request;
}

function getOffDayEmployeeMonthData(monthData, employeeName) {
    if (!monthData || !monthData.complete) {
        return { complete: false, offCount: 0, shifts: [] };
    }

    const employeeRow = monthData.rows.slice(1).find(row =>
        String(row?.[0] || "").trim() === employeeName
    );

    if (!employeeRow) {
        return { complete: false, offCount: 0, shifts: [] };
    }

    const shifts = monthData.dayColumns.map(column =>
        String(employeeRow[column] || "").trim().toUpperCase()
    );

    return {
        complete: true,
        offCount: shifts.filter(shift => shift === "OFF" || shift === "O").length,
        shifts
    };
}

function isOffDayCounterWorkingShift(rawShift) {
    const value = String(rawShift || "").trim().toUpperCase();

    if (!value || value === "OFF" || value === "O" || value === "L" || value === "T") {
        return false;
    }

    // A/B/C, General (G), Day (D), and Night (N) are duty codes.
    return /[ABCGDN]/.test(value);
}

function hasMoreThanTenWorkingDaysBetweenOffDays(shifts) {
    let hasSeenOff = false;
    let workingDaysSinceOff = 0;

    for (const rawShift of shifts) {
        const value = String(rawShift || "").trim().toUpperCase();
        const isOff = value === "OFF" || value === "O";

        if (isOff) {
            if (hasSeenOff && workingDaysSinceOff > 10) {
                return true;
            }

            hasSeenOff = true;
            workingDaysSinceOff = 0;
            continue;
        }

        if (hasSeenOff && isOffDayCounterWorkingShift(value)) {
            workingDaysSinceOff++;
        }
    }

    return false;
}

function renderOffDayCounterMarkup() {
    const periods = [
        { id: "current", label: "Current Month", limit: 8, full: true },
        { id: "mar", label: "Jan to Mar", limit: 23 },
        { id: "jun", label: "Jan to Jun", limit: 46 },
        { id: "sep", label: "Jan to Sep", limit: 69 },
        { id: "dec", label: "Jan to Dec", limit: 92 }
    ];

    const itemMarkup = periods.map(period => `
        <div class="off-day-count-item ${period.full ? "off-day-count-current" : ""}">
            <span class="off-day-count-label">${period.label}</span>
            <span class="off-day-count-value is-unavailable" id="offDayCount-${period.id}">— / ${period.limit}</span>
        </div>
    `).join("");

    return `
        <div class="off-day-counter-grid">${itemMarkup}</div>
        <div class="off-day-warning" id="offDayGapWarning" hidden>
            ⚠️ More than 10 working days between OFF days in the current month
        </div>
        <div class="off-day-warning" id="offDayLimitWarning" hidden>
            ⚠️ Your Rest / OFF count exceeds the prescribed limit, please contact AIC for necessary guidance
        </div>
    `;
}

function setOffDayCounterValue(id, count, limit, complete) {
    const element = document.getElementById(`offDayCount-${id}`);
    if (!element) return;

    element.classList.remove("is-within-limit", "is-over-limit", "is-unavailable");

    if (!complete || count === null || count === undefined) {
        element.textContent = `— / ${limit}`;
        element.classList.add("is-unavailable");
        return;
    }

    
    element.textContent = `${count} / ${limit}`;
    element.classList.add(
        count > limit ? "is-over-limit" : "is-within-limit"
    );

    animateDataOnFirstLoad(
        element,
        `off-${countersSelectedName}-${countersSelectedCategory}-${new Date().getFullYear()}-${id}`
    );

}

async function renderOffDayCounter() {
    const box = document.getElementById("offDayCounter");
    if (!box) return;

    box.innerHTML = renderOffDayCounterMarkup();

    const selectedEmployee = String(countersSelectedName || "").trim();
    const category = countersSelectedCategory || "";
    const now = new Date();
    const year = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const renderToken = ++offDayCounterRenderToken;

    if (!selectedEmployee || !category) return;

    // Complete calendar-year schedule totals, including future scheduled OFF days.
    const monthlyData = await Promise.all(
        Array.from({ length: 12 }, (_, index) =>
            getOffDayMonthSchedule(category, year, index + 1)
        )
    );

    if (renderToken !== offDayCounterRenderToken) return;

    const employeeMonths = monthlyData.map(monthData =>
        getOffDayEmployeeMonthData(monthData, selectedEmployee)
    );
    const currentSchedule = employeeMonths[currentMonth - 1];

    const throughMonth = endMonth =>
        Array.from({ length: Math.min(endMonth, currentMonth) }, (_, index) => index + 1);

    const periods = [
        { id: "current", limit: 8, months: [currentMonth] },
        { id: "mar", limit: 23, months: throughMonth(3) },
        { id: "jun", limit: 46, months: throughMonth(6) },
        { id: "sep", limit: 69, months: throughMonth(9) },
        { id: "dec", limit: 92, months: throughMonth(12) }
    ];

    let anyOverLimit = false;

    for (const period of periods) {
        const availableMonths = period.months
            .map(month => employeeMonths[month - 1]);

        // Stop at the first unavailable month.
        const consecutiveMonths = [];

        for (const monthData of availableMonths) {
            if (!monthData || !monthData.complete) break;
            consecutiveMonths.push(monthData);
        }

        // Current Month must have its own month's data.
        // Cumulative periods show totals through the latest consecutive available month.
        const complete = period.id === "current"
            ? consecutiveMonths.length === 1
            : consecutiveMonths.length > 0;

        const count = complete
            ? consecutiveMonths.reduce((total, item) => total + item.offCount, 0)
            : null;

        setOffDayCounterValue(period.id, count, period.limit, complete);

        if (complete && count > period.limit) {
            anyOverLimit = true;
        }
    }

    const gapWarning = document.getElementById("offDayGapWarning");
    if (gapWarning) {
        gapWarning.hidden = !(
            currentSchedule &&
            currentSchedule.complete &&
            hasMoreThanTenWorkingDaysBetweenOffDays(currentSchedule.shifts)
        );
    }

    const limitWarning = document.getElementById("offDayLimitWarning");
    if (limitWarning) {
        limitWarning.hidden = !anyOverLimit;
    }
}



/* =========================================================
   DOUBLE SHIFT & TRAINING / TOUR COUNTERS
   AB, BC, AC = double shift; T = training/tour
   ========================================================= */
let extraCountersRenderToken = 0;

async function renderDoubleShiftAndTrainingCounter() {
    const doubleElement = document.getElementById("doubleShiftCount");
    const trainingElement = document.getElementById("trainingTourCount");

    if (!doubleElement || !trainingElement) return;

    const employee = String(countersSelectedName || "").trim();
    const category = countersSelectedCategory || "";
    const token = ++extraCountersRenderToken;

    doubleElement.textContent = "—";
    trainingElement.textContent = "—";

    if (!employee || !category) return;

    const now = new Date();
    const year = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const today = now.getDate();

    const monthlyData = await Promise.all(
        Array.from({ length: currentMonth }, (_, index) =>
            getOffDayMonthSchedule(category, year, index + 1)
        )
    );

    if (token !== extraCountersRenderToken) return;
    if (
        String(countersSelectedName || "").trim() !== employee ||
        countersSelectedCategory !== category
    ) return;

    let doubleTotal = 0;
    let trainingTotal = 0;
    let complete = true;

    for (let monthIndex = 0; monthIndex < currentMonth; monthIndex++) {
        const monthData = monthlyData[monthIndex];

        if (
            !monthData ||
            !monthData.complete ||
            !monthData.rows ||
            !monthData.dayColumns
        ) {
            complete = false;
            continue;
        }

        const employeeRow = monthData.rows.slice(1).find(row =>
            String(row?.[0] || "").trim() === employee
        );

        if (!employeeRow) {
            complete = false;
            continue;
        }

        const month = monthIndex + 1;
        const daysToCount = month === currentMonth
            ? today
            : new Date(year, month, 0).getDate();

        for (let day = 1; day <= daysToCount; day++) {
            const column = monthData.dayColumns[day - 1];

            if (column == null || column < 0) continue;

            const shift = String(employeeRow[column] || "")
                .trim()
                .toUpperCase()
                .replace(/[*#]/g, "")
                .trim();

            if (["AB", "BC", "AC"].includes(shift)) doubleTotal++;
            if (shift === "T") trainingTotal++;
        }
    }

    if (token !== extraCountersRenderToken) return;

    doubleElement.textContent = String(doubleTotal);
    trainingElement.textContent = String(trainingTotal);

    animateDataOnFirstLoad(
        doubleElement,
        `double-shift-${employee}-${category}-${year}`
    );

    animateDataOnFirstLoad(
        trainingElement,
        `training-tour-${employee}-${category}-${year}`
    );

}



/* =========================================================
   AUTO-REFRESH — SHIFT CALENDAR & COUNTERS
   Refresh every 5 minutes
   ========================================================= */

setInterval(() => {
    if (typeof renderNext7Days !== "function") return;

    // Clear cached monthly schedules so updated CSV data is fetched.
    if (typeof offDayMonthCache !== "undefined") {
        offDayMonthCache.clear();
    }

    // Re-render the calendar and both counters.
    renderNext7Days();
}, 5 * 60 * 1000);
