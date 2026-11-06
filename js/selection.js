function populateNames(){

    let sel = document.getElementById("nameSelector");
    let category = document.getElementById("categorySelector")?.value;

    if(!category) return;

    let names = [];

    if(category === "exec"){

        names = [...seniorityOrder];

    }else{

        names = nonExecSeniorityOrder
            .filter(n => n && !/\bDMBI$/i.test(n));
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
