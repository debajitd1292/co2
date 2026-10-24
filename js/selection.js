function populateNames(){

    let sel = document.getElementById("nameSelector");
    let category = document.getElementById("categorySelector")?.value;

    if(!category) return;

    let names = [];

    if(category === "exec"){

        for(let i = 1; i < data.length; i++){

            let n = data[i][0]?.trim();

            if(n) names.push(n);
        }

        names = sortBySeniority(names);

    }else{

        for(let i = 1; i < nonExecData.length; i++){

            let n = nonExecData[i][0]?.trim();

            // Hide employees whose surname is DMBI
            if(n && !/\bDMBI$/i.test(n)) {
                names.push(n);
            }
        }

        names = names.sort((a,b)=>{

            let ia = nonExecSeniorityOrder.indexOf(a);
            let ib = nonExecSeniorityOrder.indexOf(b);

            if(ia === -1) ia = 999;
            if(ib === -1) ib = 999;

            return ia - ib;
        });
    }

    sel.innerHTML = "";

    sel.add(new Option("Select Name",""));

    names.forEach(n =>
        sel.add(new Option(getFirstName(n), n))
    );
}


function onNameChange(){

    selectedName =
        document.getElementById("nameSelector").value;

    localStorage.setItem(
        "ppu_name",
        selectedName
    );

    refresh();

    if(document.getElementById("datePicker").value){

        renderSelected();

    }

    renderNext7Days();
}


function onCategoryChange(){

    let category =
        document.getElementById("categorySelector").value;

    localStorage.setItem(
        "selectedCategory",
        category
    );

    selectedName = "";

    localStorage.removeItem("ppu_name");

    document.getElementById("nameSelector").innerHTML =
        '<option value="">Select Name</option>';

    document.getElementById("today").innerHTML = "";

    document.getElementById("selected").innerHTML = "";

    populateNames();

    refresh();

    renderNext7Days();
}
