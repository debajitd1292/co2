function parseCSV(text){

    if(!text) return [];

    return text
        .split(/\r?\n/)
        .filter(row => row.trim() !== "")
        .map(row => {

            const result = [];
            let current = "";
            let insideQuotes = false;

            for(let i = 0; i < row.length; i++){

                const char = row[i];

                if(char === '"'){
                    insideQuotes = !insideQuotes;
                    continue;
                }

                if((char === "," || char === ";") && !insideQuotes){
                    result.push(current.trim());
                    current = "";
                }else{
                    current += char;
                }
            }

            result.push(current.trim());

            return result;
        });
}


function normalizeShiftMonthHeaders(monthData, monthDate) {
    if (!monthData || !monthData.length || !monthData[0]) {
        return monthData;
    }

    if (!monthDate) {
        return monthData;
    }

    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const normalizedHeader = monthData[0].map((value, index) => {
        const header = String(value ?? "").trim();

        // Preserve the employee-name column.
        if (index === 0) return value;

        // Preserve existing full-date headers.
        if (/^\d{2}-\d{2}-\d{4}$/.test(header)) return header;

        // Convert day-only headers such as 1, 2, 03, or 31.
        if (/^\d{1,2}$/.test(header)) {
            const day = Number(header);

            if (day >= 1 && day <= daysInMonth) {
                const date = new Date(year, month, day);

                return (
                    String(date.getDate()).padStart(2, "0") + "-" +
                    String(date.getMonth() + 1).padStart(2, "0") + "-" +
                    date.getFullYear()
                );
            }
        }

        return header;
    });

    return [normalizedHeader, ...monthData.slice(1)];
}


function mergeShiftData(previous, current, next, monthDates = []) {
    const inputs = [
        { data: previous, date: monthDates[0] },
        { data: current,  date: monthDates[1] },
        { data: next,     date: monthDates[2] }
    ];

    const months = inputs
        .filter(item => item.data && item.data.length)
        .map(item => normalizeShiftMonthHeaders(item.data, item.date));

    if (!months.length) return [];

    const base = months[0];
    const merged = [];

    const header = [base[0][0]];

    for (const month of months) {
        header.push(...month[0].slice(1));
    }

    merged.push(header);

    const employeeNames = new Set();

    for (const month of months) {
        for (let i = 1; i < month.length; i++) {
            const name = month[i]?.[0]?.trim();
            if (name) employeeNames.add(name);
        }
    }

    for (const name of employeeNames) {
        const row = [name];

        for (const month of months) {
            const monthRow = month.find(
                r => r?.[0]?.trim() === name
            );

            if (monthRow) {
                row.push(...monthRow.slice(1));
            } else {
                row.push(...new Array(month[0].length - 1).fill(""));
            }
        }

        merged.push(row);
    }

    return merged;
}


function fetchCSV(url, optional = false){

    return fetch(url, { cache: "no-store" })
        .then(response => {

            if(!response.ok){
                throw new Error("CSV not found: " + url);
            }

            return response.text();
        })
        .catch(err => {

            console.warn("CSV load failed:", url, err);

            if(optional){
                return "";
            }

            throw err;
        });
}
