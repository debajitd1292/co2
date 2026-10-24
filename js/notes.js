let notes = [];

function loadNotesData(notesText){

    if(!notesText){
        notes = [];
        return;
    }

    const noteRows = parseCSV(notesText);

    notes = noteRows
        .slice(1)
        .map(r => {
            return {
                date: r[0]?.trim(),
                type: r[1]?.trim(),
                name: r[2]?.trim(),
                message: r[3]?.trim()
            };
        })
        .filter(r => r.date);
}


function getTodayNote(){

    let today = new Date();

    let key =
        ("0" + today.getDate()).slice(-2) +
        "-" +
        ("0" + (today.getMonth() + 1)).slice(-2);


    let todaysNotes =
        notes.filter(n => n.date === key);


    if(todaysNotes.length === 0)
        return "";


    return todaysNotes.map(n => {

        if(n.type === "BIRTHDAY"){
            return `Happy Birthday ${n.name} 🎂`;
        }


        if (n.type === "REPUBLIC DAY" || n.type === "INDEPENDENCE DAY") {
            const flag = `<svg xmlns="http://www.w3.org/2000/svg"
                width="24" height="16" viewBox="0 0 24 16"
                style="vertical-align:middle;margin-left:5px"
                aria-label="Indian flag" role="img">
                <rect width="24" height="5.33" fill="#FF9933"/>
                <rect y="5.33" width="24" height="5.34" fill="#FFFFFF"/>
                <rect y="10.67" width="24" height="5.33" fill="#138808"/>
                <circle cx="12" cy="8" r="2.1"
                    fill="none" stroke="#000080" stroke-width="0.55"/>
                <circle cx="12" cy="8" r="0.35" fill="#000080"/>
            </svg>`;

            return `${(n.message || "").replace(/\*\*/g, "")} ${flag}`;
        }


        if(n.type === "FOUNDATION DAY"){
            return `${n.message} 🎉`;
        }


        if(n.type === "NEW YEAR"){
            return `${n.message} 🎉`;
        }


        return n.message;

    }).join("<br>");
}
