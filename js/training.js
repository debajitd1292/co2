let trainings = [];


function loadTrainingData(trainingText){

    if(!trainingText){
        trainings = [];
        return;
    }

    const trainingRows = parseCSV(trainingText);

    trainings = trainingRows
        .slice(1)
        .map(r => {
            return {
                date: r[0]?.trim(),
                name: r[1]?.trim(),
                type: r[2]?.trim(),
                attendees: r[3]?.trim()
            };
        })
        .filter(r => r.date);
}


function updateTrainingHeader(){

    let header = document.getElementById("trainingHeader");

    if(!header) return;

    let now = new Date();

    let month =
        now.toLocaleString("default", { month: "long" });

    let year =
        now.getFullYear();

    header.innerText =
        `Training Schedule for ${month} ${year}`;
}


function renderTraining(){

    let box =
        document.getElementById("trainingSection");

    if(!box) return;

    box.innerHTML = "";

    let refDate = new Date();

    let month =
        ("0" + (refDate.getMonth() + 1)).slice(-2);


    let filtered = trainings.filter(t => {

        if(!t.date) return false;

        let first =
            t.date.split("to")[0].trim();

        if(!first || !first.includes("-"))
            return false;

        let parts = first.split("-");

        if(parts.length < 2)
            return false;

        return String(parseInt(parts[1])) ===
               String(parseInt(month));

    });


    if(filtered.length === 0){

        box.innerHTML = `
        <div style="color:#777;font-weight:bold;">
            No training scheduled for the month yet
        </div>`;

        return;
    }


    filtered.sort((a,b) => {

        let da =
            a.date.split("to")[0].trim();

        let db =
            b.date.split("to")[0].trim();

        let [d1,m1] = da.split("-");
        let [d2,m2] = db.split("-");

        let year =
            new Date().getFullYear();

        return new Date(year, m1-1, d1) -
               new Date(year, m2-1, d2);

    });


    let today = new Date();

    today.setHours(0,0,0,0);


    filtered.forEach(t => {

        /* --- extract start & end date --- */

        let parts =
            t.date.split("to").map(x => x.trim());

        let [sd, sm] =
            parts[0].split("-");

        let startDate =
            new Date(
                today.getFullYear(),
                sm - 1,
                sd
            );


        let endDate = startDate;


        if(parts.length > 1){

            let [ed, em] =
                parts[1].split("-");

            endDate =
                new Date(
                    today.getFullYear(),
                    em - 1,
                    ed
                );
        }


        /* --- status check --- */

        let isPast =
            endDate < today;

        let isToday =
            startDate <= today &&
            endDate >= today;


        let extraClass = "";


        if(isPast){

            extraClass =
                "past-training";

        }else if(isToday){

            extraClass =
                "today-training";

        }else{

            extraClass =
                "upcoming-training";
        }


        const isSOPTraining =
            t.name.toLowerCase().includes("monthly sop training");

        box.innerHTML += `
        <div class="training-item ${extraClass}"
             ${isSOPTraining ? 'onclick="openSOPTrainingPopup()" style="cursor:pointer;"' : ''}>

            <!-- Line 1 -->

            <div class="training-name" style="font-weight:bold;">

                ${isToday ? "🟢 " :
                  isPast ? "⚪ " : "🟡 "}

                ${t.date.split("to").map(d => {

                    const [day, month] =
                        d.trim().split("-");

                    const monthName =
                        new Date(
                            2000,
                            Number(month) - 1,
                            1
                        ).toLocaleString(
                            "en-US",
                            { month: "short" }
                        );

                    return `${day} ${monthName}`;

                }).join(" to ")}

                — ${t.name}

            </div>


            <!-- Line 2 -->

            <div class="training-type">
                ${t.type}
            </div>

            ${t.attendees ? `
               <div class="training-attendees">
                    Attended by: ${t.attendees}
               </div>
           ` : ""}

        </div>
        `;
    });
}


async function openSOPTrainingPopup() {

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const monthName = now.toLocaleString("en-IN", {
        month: "long"
    });

    document.getElementById("sopTrainingOverlay")?.remove();

    // Popup styles
    if (!document.getElementById("sopTrainingPopupStyles")) {

        const style = document.createElement("style");

        style.id = "sopTrainingPopupStyles";

        style.textContent = `
            #sopTrainingOverlay {
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

            #sopTrainingOverlay.is-open {
                opacity: 1;
                visibility: visible;
            }

            #sopTrainingSheet {
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

            #sopTrainingOverlay.is-open #sopTrainingSheet {
                transform: translateY(0);
            }

            .sop-training-grabber {
                width: 38px;
                height: 4px;
                margin: 10px auto 2px;
                border-radius: 99px;
                background: #9ca3af;
            }

            .sop-training-header {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 12px;
                padding: 12px 18px 14px;
                border-bottom: 1px solid var(--border-color, #e5e7eb);
            }

            .sop-training-title {
                margin: 0;
                font-size: 1.08rem;
                font-weight: 700;
            }

            .sop-training-subtitle {
                margin-top: 4px;
                color: var(--text-secondary, #64748b);
                font-size: .84rem;
            }

            .sop-training-close {
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

            .sop-training-list {
                overflow-y: auto;
                padding: 8px 18px 20px;
            }

            .sop-training-row {
                display: flex;
                align-items: flex-start;
                gap: 10px;
                padding: 9px 0;
                border-bottom: 1px solid var(--border-color, #e5e7eb);
            }

            .sop-training-number {
                min-width: 34px;
                height: 34px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: var(--surface-secondary, #f1f5f9);
                color: var(--text-primary, #111827);
                font-size: 12px;
                font-weight: 700;
            }

            .sop-training-name {
                flex: 1;
                padding-top: 7px;
                font-size: 13px;
                line-height: 1.4;
            }

            .sop-training-empty {
                padding: 28px 8px;
                color: var(--text-secondary, #64748b);
                text-align: center;
                font-size: .85rem;
            }

            @media (min-width: 600px) {
                #sopTrainingOverlay {
                    align-items: center;
                }
            }
        `;

        document.head.appendChild(style);
    }

    // Create popup
    const overlay = document.createElement("div");

    overlay.id = "sopTrainingOverlay";

    overlay.innerHTML = `
        <section id="sopTrainingSheet"
                 role="dialog"
                 aria-modal="true">

            <div class="sop-training-grabber"></div>

            <header class="sop-training-header">

                <div>
                    <h2 class="sop-training-title">
                        SOP Training Schedule
                    </h2>

                    <div class="sop-training-subtitle">
                        ${monthName} ${year}
                    </div>
                </div>

                <button type="button"
                        class="sop-training-close"
                        aria-label="Close">×</button>

            </header>

            <div class="sop-training-list"
                 id="sopTrainingList">
                <div class="sop-training-empty">
                    Loading SOP training schedule...
                </div>
            </div>

        </section>
    `;

    document.body.appendChild(overlay);

    function closePopup() {
        overlay.classList.remove("is-open");
        document.body.style.overflow = "";
    }

    overlay.addEventListener("click", event => {

        if (
            event.target === overlay ||
            event.target.closest(".sop-training-close")
        ) {
            closePopup();
        }
    });

    document.body.style.overflow = "hidden";

    requestAnimationFrame(() => {
        overlay.classList.add("is-open");
    });

    // Load SOP CSV
    try {

        const response = await fetch(
            "./updates/sop_training.csv?v=" + Date.now()
        );

        if (!response.ok) {
            throw new Error("Unable to load SOP CSV");
        }

        const csvText = await response.text();
        const rows = parseCSV(csvText);

        const sopList = rows.slice(1)
            .map(r => ({
                month: Number(r[0]),
                year: Number(r[1]),
                number: r[2]?.trim(),
                name: r[3]?.trim()
            }))
            .filter(r =>
                r.month === month &&
                r.year === year &&
                r.number &&
                r.name
            )
            .sort((a, b) =>
                Number(a.number) - Number(b.number)
            );

        const list = document.getElementById("sopTrainingList");

        if (!list) return;

        if (!sopList.length) {

            list.innerHTML = `
                <div class="sop-training-empty">
                    No SOP training details available for
                    ${monthName} ${year}.
                </div>
            `;

            return;
        }

        list.innerHTML = sopList.map(sop => `
            <div class="sop-training-row">

                <div class="sop-training-number">
                    ${sop.number}
                </div>

                <div class="sop-training-name">
                    ${escapeHTML(sop.name)}
                </div>

            </div>
        `).join("");

    } catch (error) {

        console.error("SOP Training Error:", error);

        const list = document.getElementById("sopTrainingList");

        if (list) {
            list.innerHTML = `
                <div class="sop-training-empty">
                    Unable to load
                </div>
            `;
        }
    }
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}
