function formatDate(d){

    return ("0" + d.getDate()).slice(-2) +
           "-" +
           ("0" + (d.getMonth() + 1)).slice(-2) +
           "-" +
           d.getFullYear();
}


function getFirstName(fullName){

    if(!fullName) return "";

    return fullName.trim().split(/\s+/)[0];
}


function parseShift(shift){

    if(!shift) return [];

    shift = shift.trim();


    // Keep OFF as single unit

    if(shift === "OFF")
        return ["OFF"];


    // Split A, B, C, etc.

    return shift.match(/[A-Z]/g) || [];
}
