function getShift(date,name){

    let category =
        document.getElementById("categorySelector")?.value;

    if(!category || !date || !name){
        return null;
    }

    let localData =
        (category === "exec") ? data : nonExecData;

    let localHeader =
        (category === "exec") ? header : nonExecHeader;

    if(!localData || !localData.length){
        return null;
    }

    if(!localHeader || !localHeader.length){
        return null;
    }

    let col = localHeader.indexOf(date);

    if(col === -1){
        return null;
    }

    for(let i = 1; i < localData.length; i++){

        let row = localData[i];

        if(!row || !row.length){
            continue;
        }

        let rowName = row[0]?.trim();

        if(rowName === name){
            return row[col]?.trim() || null;
        }
    }

    return null;
}


function getData(date){

    let col = header.indexOf(date);

    if(col === -1) return {};

    let shifts = {};

    for(let i = 1; i < data.length; i++){

        let name = data[i][0]?.trim();
        let shift = data[i][col]?.trim();

        if(!shift) continue;

        if(shift === "OFF"){

            if(!shifts["OFF"])
                shifts["OFF"] = [];

            shifts["OFF"].push({
                name: name,
                multi: false
            });

            continue;
        }

        let isMulti =
            (shift !== "OFF" && shift.length > 1);

        parseShift(shift).forEach(s => {

            if(!shifts[s])
                shifts[s] = [];

            shifts[s].push({
                name: name,
                multi: isMulti
            });

        });
    }

    return shifts;
}


function getNonExecData(date){

    let col = nonExecHeader.indexOf(date);

    if(col === -1) return {};

    let shifts = {};

    for(let i = 1; i < nonExecData.length; i++){

        let name = nonExecData[i][0]?.trim();
        let shift = nonExecData[i][col]?.trim();

        if(!shift) continue;

        if(shift === "OFF"){

            if(!shifts["OFF"])
                shifts["OFF"] = [];

            shifts["OFF"].push({
                name: name,
                multi: false
            });

            continue;
        }

        let isMulti =
            (shift !== "OFF" && shift.length > 1);

        parseShift(shift).forEach(s => {

            if(!shifts[s])
                shifts[s] = [];

            shifts[s].push({
                name: name,
                multi: isMulti
            });

        });
    }

    return shifts;
}
