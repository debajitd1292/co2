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

    const monthName = now.toLocaleString("en-US", {
        month: "long"
    });

    // Remove any previously opened popup
    document.getElementById("sopTrainingModal")?.remove();

    // Create popup overlay
    const overlay = document.createElement("div");

    overlay.id = "sopTrainingModal";

    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.65);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999;
        padding: 15px;
    `;

    // Popup box
    const popup = document.createElement("div");

    popup.style.cssText = `
        width: 100%;
        max-width: 480px;
        max-height: 80vh;
        overflow-y: auto;
        background: var(--card-bg, #ffffff);
        color: var(--text-color, #222222);
        border-radius: 14px;
        padding: 20px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.3);
    `;

    // Heading
    const heading = document.createElement("div");

    heading.style.cssText = `
        text-align: center;
        margin-bottom: 18px;
    `;

    heading.innerHTML = `
        <div style="font-size:20px;font-weight:700;">
            SOP Training Schedule
        </div>

        <div style="
            font-size:14px;
            color:var(--text-secondary, #777);
            margin-top:4px;
        ">
            ${monthName} ${year}
        </div>
    `;

    popup.appendChild(heading);

    // Loading message
    const list = document.createElement("div");

    list.textContent = "Loading SOP training schedule...";

    popup.appendChild(list);

    // Close button
    const closeButton = document.createElement("button");

    closeButton.textContent = "Close";

    closeButton.style.cssText = `
        display: block;
        margin: 20px auto 0;
        padding: 9px 25px;
        border: none;
        border-radius: 8px;
        background: var(--accent-color, #2878c8);
        color: white;
        font-weight: 600;
        cursor: pointer;
    `;

    closeButton.onclick = () => overlay.remove();

    popup.appendChild(closeButton);

    overlay.appendChild(popup);

    // Close when clicking outside popup
    overlay.addEventListener("click", e => {
        if (e.target === overlay) {
            overlay.remove();
        }
    });

    document.body.appendChild(overlay);

    // Fetch SOP CSV
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

        list.innerHTML = "";

        if (sopList.length === 0) {

            list.textContent =
                "No SOP training details available for this month.";

            return;
        }

        sopList.forEach(sop => {

            const item = document.createElement("div");

            item.style.cssText = `
                display: flex;
                align-items: flex-start;
                gap: 12px;
                padding: 11px 0;
                border-bottom: 1px solid var(--border-color, #ddd);
            `;

            const number = document.createElement("div");

            number.textContent = sop.number;

            number.style.cssText = `
                min-width: 36px;
                height: 36px;
                border-radius: 8px;
                background: var(--accent-color, #2878c8);
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 700;
            `;

            const name = document.createElement("div");

            name.textContent = sop.name;

            name.style.cssText = `
                flex: 1;
                padding-top: 7px;
                line-height: 1.4;
            `;

            item.appendChild(number);
            item.appendChild(name);

            list.appendChild(item);
        });

    } catch (error) {

        console.error("SOP Training Error:", error);

        list.textContent =
            "Unable to load";

    }
}
