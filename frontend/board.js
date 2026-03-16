let API_BASE = "https://syncforge-0ov1.onrender.com";
let TOKEN = sessionStorage.getItem("TOKEN");
let BOARD_ID = sessionStorage.getItem("BOARD_ID");

let WS = null;
let CURRENT_TASK_ID = null;

const el = (id)=>document.getElementById(id);

document.addEventListener("DOMContentLoaded",()=>{

el("createTask").onclick = createTask;
el("updateTaskBtn").onclick = updateTask;

const inviteBtn = el("inviteBtn");
if(inviteBtn){
inviteBtn.onclick = inviteUser;
}

connectWS();
loadBoard();

});

function connectWS(){

const url = `wss://syncforge-0ov1.onrender.com/ws/boards/${BOARD_ID}?token=${TOKEN}`;

WS = new WebSocket(url);

WS.onopen=()=>{
console.log("WebSocket connected");
};

WS.onmessage=(event)=>{
const data = JSON.parse(event.data);
console.log("WS EVENT:",data);
loadBoard();
};

WS.onclose=()=>{
console.log("WebSocket disconnected");
};

}

function headers(){
return{
"Content-Type":"application/json",
"Authorization":"Bearer "+TOKEN
};
}

async function api(path,opts={}){

const res = await fetch(API_BASE+path,{
...opts,
headers:headers()
});

const data = await res.json();

if(!res.ok) throw new Error(data.detail);

return data;

}

async function loadBoard(){

const snap = await api("/boards/"+BOARD_ID);

el("boardTitle").innerText = snap.board.name;

const select = el("columnSelect");
select.innerHTML="";

snap.columns.forEach(c=>{
const opt=document.createElement("option");
opt.value=c.id;
opt.textContent=c.name;
select.appendChild(opt);
});

const columnsDiv = el("columns");
columnsDiv.innerHTML="";

snap.columns.forEach(c=>{

const col=document.createElement("div");
col.className="col";

col.innerHTML=`
<h3>${c.name}</h3>
<div class="taskList" id="col-${c.id}"></div>
`;

columnsDiv.appendChild(col);

});

snap.tasks.forEach(t=>{

const task=document.createElement("div");
task.className="task";
task.dataset.id = t.id;

task.innerHTML=`
<div class="taskHeader">

<b>${t.title}</b>

<div class="taskMenu">
<span onclick="toggleTaskMenu(event)">⋮</span>

<div class="taskDropdown">
<button onclick="deleteTask('${t.id}')">Delete</button>
</div>

</div>

</div>

<div class="taskDesc">${t.description || ""}</div>
<div class="taskAssigned">👤 ${t.assigned_to || "Unassigned"}</div>
`;

task.addEventListener("click",(e)=>{

    // if clicking menu, ignore
    if(e.target.closest(".taskMenu")) return;
    
    openEditTask(t);
    
    });
const column=document.getElementById("col-"+t.column_id);

if(column){
column.appendChild(task);
}

});

initDrag();

}

function initDrag(){

document.querySelectorAll(".taskList").forEach(list=>{

new Sortable(list,{

group:"tasks",
animation:150,

onEnd: async function(evt){

const taskId = evt.item.dataset.id;
const columnId = evt.to.id.replace("col-","");
const position = evt.newIndex;

await api("/tasks/"+taskId+"/move",{
method:"POST",
body:JSON.stringify({
to_column_id: columnId,
to_position: position
})
});

}

});

});

}

async function createTask(){

const modal = el("taskModal");

const title = el("taskTitle").value;
const column = el("columnSelect").value;
const email = el("taskEmail").value;
const description = el("taskDescription").value;

if(!title) return;

await api("/columns/"+column+"/tasks",{
method:"POST",
body:JSON.stringify({
title:title,
description: description,
assigned_to: email
})
});

el("taskTitle").value="";
el("taskEmail").value="";
el("taskDescription").value="";

modal.classList.add("hidden");

}

function back(){
window.location.href="dashboard.html";
}

async function inviteUser(){

const email = el("inviteEmail").value.trim();

if(!email){
alert("Enter user email");
return;
}

try{

await api(`/boards/${BOARD_ID}/invite`,{
method:"POST",
body:JSON.stringify({email})
});

el("inviteEmail").value="";
alert("User invited");

}catch(err){
alert(err.message);
}

}

function toggleTaskMenu(event){

    event.stopPropagation();
    
    const menu = event.target.nextElementSibling;
    
    document.querySelectorAll(".taskDropdown").forEach(m=>{
    if(m!==menu) m.style.display="none";
    });
    
    menu.style.display = menu.style.display==="block" ? "none" : "block";
    
    }

async function deleteTask(taskId){

if(!confirm("Delete this task?")) return;

await api("/tasks/"+taskId,{
method:"DELETE"
});

}

function openEditTask(task){
console.log("Task data:", task);


CURRENT_TASK_ID = task.id;

el("editTaskTitle").value = task.title;

const desc = task.description || "";

el("editTaskEmail").value = task.assigned_to || "";

el("editTaskDesc").value=desc;

el("editTaskModal").classList.remove("hidden");

}

function closeEditTask(){
el("editTaskModal").classList.add("hidden");
}

async function updateTask(){

const title = el("editTaskTitle").value;
const email = el("editTaskEmail").value;
const desc = el("editTaskDesc").value;

await api("/tasks/"+CURRENT_TASK_ID,{
method:"PATCH",
body:JSON.stringify({
title:title,
description: desc,
assigned_to:email
})
});

closeEditTask();

}