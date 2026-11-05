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
            "Unable to load SOP training schedule. Please try again.";

    }
}
