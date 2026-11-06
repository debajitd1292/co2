let holidays = [];

function normalizeHolidayDate(dateStr) {
    const parts = dateStr?.trim().split("-");

    if (!parts || parts.length !== 3) return dateStr?.trim();

    const [day, month, year] = parts;

    return `${day.padStart(2, "0")}-${month.padStart(2, "0")}-${year}`;
}


function loadHolidayData(holidayText){

    if(!holidayText){
        holidays = [];
        return;
    }

    const holidayRows = parseCSV(holidayText);

    holidays = holidayRows
        .slice(1)
        .map(r => {
            return {
                date: normalizeHolidayDate(r[0]),
                type: r[1]?.trim(),
                name: r[2]?.trim()
            };
        })
        .filter(r => r.date);
}


function formatHolidayDate(dateStr){

    let [d, m, y] = dateStr.split("-");

    const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    return d + "-" + months[parseInt(m, 10) - 1] + "-" + y;
}


function isSpecialDay(){

    let today = new Date();

    let day = today.getDay(); // 0=Sun, 6=Sat
    let date = today.getDate();

    /* Sunday */

    if(day === 0)
        return true;


    /* 2nd & 4th Saturday */

    if(day === 6){

        let week = Math.ceil(date / 7);

        if(week === 2 || week === 4)
            return true;
    }

    /* GH check */

    let todayStr = formatDate(today);

    let isGH = holidays.some(h =>
        h.date === todayStr &&
        h.type === "GH"
    );


    /* RH check */

    let isRH = holidays.some(h =>
        h.date === todayStr &&
        h.type === "RH"
    );


    if(isGH || isRH)
        return true;


    return false;
}


function updateTodayReason(){
    const reasonElem = document.getElementById("todayReason");
    if(!reasonElem) return;

    const todayStr = formatDate(new Date());

    // Display actual GH/RH holidays only
    const holiday = holidays.find(h =>
        h.date === todayStr &&
        (h.type === "GH" || h.type === "RH")
    );

    reasonElem.textContent = holiday
        ? `${holiday.type} - ${holiday.name}`
        : "";
}


function calcHoliday(){

    let today = new Date();

    today.setHours(0,0,0,0);


    let nextGH = null;
    let nextRH = null;


    holidays.forEach(h => {

        if(!h.date)
            return;


        let [d,m,y] = h.date.split("-");


        let hd = new Date(
            parseInt(y),
            parseInt(m) - 1,
            parseInt(d)
        );


        hd.setHours(0,0,0,0);


        // Ignore today and past dates

        if(hd <= today)
            return;


        // Find nearest GH

        if(h.type === "GH"){

            if(!nextGH || hd < nextGH.dateObj){

                nextGH = {
                    ...h,
                    dateObj: hd
                };

            }
        }


        // Find nearest RH

        if(h.type === "RH"){

            if(!nextRH || hd < nextRH.dateObj){

                nextRH = {
                    ...h,
                    dateObj: hd
                };

            }
        }

    });


    const ghElem =
        document.getElementById("nextGH");

    const rhElem =
        document.getElementById("nextRH");

        // Open the complete GH/RH list on click
    if (ghElem) {
        ghElem.style.cursor = "pointer";
        ghElem.onclick = () => openHolidayList("GH");
    }

    if (rhElem) {
        rhElem.style.cursor = "pointer";
        rhElem.onclick = () => openHolidayList("RH");
    }


    if(ghElem){

    ghElem.innerHTML = nextGH
        ? `<div class="holiday-date-main">${formatHolidayDate(nextGH.date)}</div>
           <div class="holiday-name">${nextGH.name || ""}</div>`
        : "—";
    }

    if(rhElem){

    rhElem.innerHTML = nextRH
    ? `<div class="holiday-date-main">${formatHolidayDate(nextRH.date)}</div>
       <div class="holiday-name">${nextRH.name || ""}</div>`
    : "—";
    }
}


function openHolidayList(type) {

    const year = new Date().getFullYear();

    const isGH = type === "GH";

    const heading = isGH
        ? `General Holidays, ${year}`
        : `Restricted Holidays, ${year}`;

    // Only current-year GH or RH entries.
    // Original CSV sequence is retained.
    const holidayList = holidays.filter(h => {

        if (h.type !== type || !h.date) return false;

        const parts = h.date.split("-");

        return Number(parts[2]) === year;
    });

    // Remove any previously opened popup
    document.getElementById("holidayListOverlay")?.remove();

    // Popup styles
    if (!document.getElementById("holidayListPopupStyles")) {

        const style = document.createElement("style");

        style.id = "holidayListPopupStyles";

        style.textContent = `
            #holidayListOverlay {
                position: fixed;
                inset: 0;
                z-index: 99999;
                display: flex;
                align-items: flex-end;
                justify-content: center;
                padding: 16px;
                background: rgba(15,23,42,.48);
                opacity: 0;
                visibility: hidden;
                transition: opacity .22s ease, visibility .22s ease;
            }

            #holidayListOverlay.is-open {
                opacity: 1;
                visibility: visible;
            }

            #holidayListSheet {
                width: min(100%, 520px);
                max-height: min(78vh, 720px);
                overflow: hidden;
                display: flex;
                flex-direction: column;
                color: var(--text-primary, #111827);
                background: var(--card-bg, #fff);
                border-radius: 24px;
                box-shadow: 0 18px 60px rgba(0,0,0,.24);
                transform: translateY(24px);
                transition: transform .22s ease;
            }

            #holidayListOverlay.is-open #holidayListSheet {
                transform: translateY(0);
            }

            .holiday-list-grabber {
                width: 38px;
                height: 4px;
                margin: 10px auto 2px;
                border-radius: 99px;
                background: #9ca3af;
            }

            .holiday-list-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                padding: 12px 18px 14px;
                border-bottom: 1px solid var(--border-color, #e5e7eb);
            }

            .holiday-list-title {
                margin: 0;
                font-size: 1.08rem;
                font-weight: 700;
                white-space: nowrap;
            }

            .holiday-list-close {
                width: 34px;
                height: 34px;
                flex-shrink: 0;
                border: 0;
                border-radius: 50%;
                color: var(--text-primary, #111827);
                background: var(--surface-secondary, #f1f5f9);
                font-size: 21px;
                cursor: pointer;
            }

            .holiday-list-content {
                overflow-y: auto;
                padding: 8px 18px 20px;
            }

            .holiday-list-row {
                display: flex;
                align-items: flex-start;
                gap: 10px;
                padding: 9px 0;
                border-bottom: 1px solid var(--border-color, #e5e7eb);
            }

            .holiday-list-date {
                min-width: 96px;
                height: 34px;
                padding: 0 5px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: var(--surface-secondary, #f1f5f9);
                color: var(--text-primary, #111827);
                font-size: 12px;
                font-weight: 700;
                white-space: nowrap;
            }

            .holiday-list-name {
                flex: 1;
                padding-top: 7px;
                font-size: 13px;
                line-height: 1.4;
            }

            .holiday-list-empty {
                padding: 28px 8px;
                color: var(--text-secondary, #64748b);
                text-align: center;
                font-size: .85rem;
            }

            @media (min-width: 600px) {
                #holidayListOverlay {
                    align-items: center;
                }
            }

            @media (max-width: 360px) {
                .holiday-list-title {
                    font-size: .98rem;
                }
            }
        `;

        document.head.appendChild(style);
    }

    // Create popup
    const overlay = document.createElement("div");

    overlay.id = "holidayListOverlay";

    overlay.innerHTML = `
        <section id="holidayListSheet" role="dialog" aria-modal="true">

            <div class="holiday-list-grabber"></div>

            <header class="holiday-list-header">

                <h2 class="holiday-list-title">
                    ${heading}
                </h2>

                <button type="button"
                        class="holiday-list-close"
                        aria-label="Close">×</button>

            </header>

            <div class="holiday-list-content">

                ${
                    holidayList.length
                    ? holidayList.map(h => `
                        <div class="holiday-list-row">

                            <div class="holiday-list-date">
                                ${formatHolidayDate(h.date)}
                            </div>

                            <div class="holiday-list-name">
                                ${holidayEscapeHTML(h.name || "")}
                            </div>

                        </div>
                    `).join("")
                    : `
                        <div class="holiday-list-empty">
                            No ${isGH ? "General" : "Restricted"} Holidays available for ${year}.
                        </div>
                    `
                }

            </div>

        </section>
    `;

    document.body.appendChild(overlay);

    function closeHolidayPopup() {
        overlay.classList.remove("is-open");
        document.body.style.overflow = "";
    }

    overlay.addEventListener("click", event => {

        if (
            event.target === overlay ||
            event.target.closest(".holiday-list-close")
        ) {
            closeHolidayPopup();
        }
    });

    document.body.style.overflow = "hidden";

    requestAnimationFrame(() => {
        overlay.classList.add("is-open");
    });
}


// Escape holiday names before displaying them
function holidayEscapeHTML(value) {

    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}
