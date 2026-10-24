
let imsRows = [];
let imsHeaders = [];

function loadIMSData(csvText) {
    const rows = parseCSV(csvText);

    if (!rows || rows.length < 2) {
        imsRows = [];
        imsHeaders = [];
        renderIMSTargets();
        return;
    }

    imsHeaders = rows[0].map(v => String(v || "").trim());

    imsRows = rows.slice(1)
        .filter(row => row.some(v => String(v || "").trim() !== ""))
        .map(row => row.map(v => String(v ?? "").trim()));

    renderIMSTargets();
}

function renderIMSTargets() {
    const container = document.getElementById("imsSections");
    const title = document.getElementById("imsHeader");

    if (!container || !title) return;

    if (!imsHeaders.length || !imsRows.length) {
        title.textContent = "IMS Targets";
        container.textContent = "IMS data not available.";
        return;
    }

    const objectiveIndex = imsHeaders.findIndex(
        h => h.trim().toLowerCase() === "objective"
    );

    const targetIndex = imsHeaders.findIndex(
        h => h.trim().toLowerCase() === "target"
    );

    const tillDateIndex = imsHeaders.findIndex(
        h => h.trim().toLowerCase() === "till date"
    );

    const monthMap = {
        jan: "January",
        feb: "February",
        mar: "March",
        apr: "April",
        may: "May",
        jun: "June",
        jul: "July",
        aug: "August",
        sep: "September",
        oct: "October",
        nov: "November",
        dec: "December"
    };

    const monthColumns = [];

    imsHeaders.forEach((header, index) => {
        const match = header.match(
            /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{4})$/i
        );

        if (match) {
            monthColumns.push({
                index: index,
                month: match[1].toLowerCase(),
                year: match[2]
            });
        }
    });

    let latestMonth = null;

    monthColumns.forEach(column => {
        const hasData = imsRows.some(row =>
            String(row[column.index] || "").trim() !== ""
        );

        if (hasData) {
            latestMonth = column;
        }
    });

    if (!latestMonth) {
        title.textContent = "IMS Targets";
        container.textContent = "Monthly IMS data not available.";
        return;
    }

    title.textContent =
        "IMS Targets Achieved Till " +
        monthMap[latestMonth.month] + " " +
        latestMonth.year;

    const displayNames = {
        "productiontarget": "Production Target",
        "specificenergyconsumption": "Specific Energy Consumption",
        "specificmonomerconsumption": "Specific Monomer Consumption",
        "primegenenration": "Prime Generation",
        "primegeneration": "Prime Generation",
        "downtime due to process reasons": "Plant Downtime due to Process Reason",
        "plantdowntime due to process reason": "Plant Downtime due to Process Reason",
        "trainingmanhours": "Training Manhours",
        "nearmissreporting": "Near Miss Reporting"
    };

        const normalise = value =>
        String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");

    // Extract the numeric part of a target or actual value.
    const numericValue = value => {
        const match = String(value ?? "")
            .replace(/,/g, "")
            .match(/-?\d+(?:\.\d+)?/);

        return match ? Number(match[0]) : NaN;
    };

function getAchievementPercentage(row, sourceName) {
        const objective = normalise(sourceName);
        const target = numericValue(
            targetIndex >= 0 ? row[targetIndex] : ""
        );
        const actual = numericValue(
            tillDateIndex >= 0 ? row[tillDateIndex] : ""
        );

        if (!Number.isFinite(target) || !Number.isFinite(actual)) {
            return null;
        }

        // Financial year: April to March.
        const fiscalMonths = {
            apr: 1, may: 2, jun: 3, jul: 4,
            aug: 5, sep: 6, oct: 7, nov: 8,
            dec: 9, jan: 10, feb: 11, mar: 12
        };

        const monthsElapsed = fiscalMonths[latestMonth.month];

        const isCumulative =
            objective === normalise("Production Target") ||
            objective === normalise("Near Miss Reporting");

        // Zero-downtime target: compliance score.
        const isDowntime =
            objective === normalise("Downtime due to Process Reasons") ||
            objective === normalise("Plant Downtime due to Process Reason");

        if (isDowntime) {
            return actual <= 0 ? 100 : 0;
        }

        // Compare cumulative actual against the target up to the latest
        // month containing data.
        if (isCumulative) {
            return target > 0
                ? (actual / target) * 100
                : null;
        }

        // Lower consumption is better.
        const isLowerBetter =
            objective === normalise("Specific Energy Consumption") ||
            objective === normalise("Specific Monomer Consumption");

        if (isLowerBetter) {
            return actual > 0
                ? (target / actual) * 100
                : (target >= 0 ? 100 : null);
        }

        // Higher values are better for the remaining objectives.
        return target > 0 ? (actual / target) * 100 : null;
    }

    const headingAliases = {
        [normalise("Production Target")]: "Production Target",
        [normalise("Specific Energy Consumption")]: "Specific Energy Consumption",
        [normalise("Specific Monomer Consumption")]: "Specific Monomer Consumption",
        [normalise("Prime Genenration")]: "Prime Generation",
        [normalise("Prime Generation")]: "Prime Generation",
        [normalise("Downtime due to Process Reasons")]: "Plant Downtime due to Process Reason",
        [normalise("Plant Downtime due to Process Reason")]: "Plant Downtime due to Process Reason",
        [normalise("Training Manhours")]: "Training Manhours",
        [normalise("Near Miss Reporting")]: "Near Miss Reporting"
    };

    container.innerHTML = "";

    imsRows.forEach(row => {
        const sourceName = row[objectiveIndex >= 0 ? objectiveIndex : 0];
        const headingText =
            headingAliases[normalise(sourceName)] ||
            displayNames[normalise(sourceName)] ||
            sourceName;

        const section = document.createElement("div");
        section.className = "ims-section";

                const heading = document.createElement("h4");
        heading.className = "ims-section-title";
        heading.style.display = "flex";
        heading.style.alignItems = "center";
        heading.style.justifyContent = "space-between";
        heading.style.gap = "10px";

        const headingLabel = document.createElement("span");
        headingLabel.textContent = headingText;

        const achievement = getAchievementPercentage(row, sourceName);

        const percentageLabel = document.createElement("span");
        percentageLabel.className = "ims-achievement-percentage";
        percentageLabel.textContent = achievement === null
            ? "—"
            : achievement.toFixed(2) + "%";

                let colourAchievement = achievement;

        const objective = normalise(sourceName);
        const isCumulativeObjective =
            objective === normalise("Production Target") ||
            objective === normalise("Near Miss Reporting");

        if (isCumulativeObjective && achievement !== null) {
            const target = numericValue(
                targetIndex >= 0 ? row[targetIndex] : ""
            );
            const actual = numericValue(
                tillDateIndex >= 0 ? row[tillDateIndex] : ""
            );

            const fiscalMonths = {
                apr: 1, may: 2, jun: 3, jul: 4,
                aug: 5, sep: 6, oct: 7, nov: 8,
                dec: 9, jan: 10, feb: 11, mar: 12
            };

            const cumulativeTarget =
                target * (fiscalMonths[latestMonth.month] / 12);

            colourAchievement = cumulativeTarget > 0
                ? (actual / cumulativeTarget) * 100
                : null;
        }

        percentageLabel.style.color =
            colourAchievement !== null && colourAchievement >= 100
                ? "green"
                : "orange";

        percentageLabel.style.whiteSpace = "nowrap";
        percentageLabel.style.fontSize = "0.85em";

        heading.append(headingLabel, percentageLabel);

        const values = document.createElement("div");
        values.className = "ims-values";

function addValue(label, value) {
        const item = document.createElement("div");
        item.className = "ims-value";

        const labelElement = document.createElement("span");
        labelElement.className = "ims-value-label";
        labelElement.textContent = label;

        const valueElement = document.createElement("span");
        valueElement.className = "ims-value-number";
        valueElement.textContent =
            value !== undefined && value !== "" ? value : "—";

        item.append(labelElement, valueElement);
        values.appendChild(item);
        }

        addValue("Target", targetIndex >= 0 ? row[targetIndex] : "");
        addValue(
            "Last month",
            latestMonth ? row[latestMonth.index] : ""
        );
        addValue(
            "Till date",
            tillDateIndex >= 0 ? row[tillDateIndex] : ""
        );

        section.append(heading, values);
        container.appendChild(section);
    });
}
