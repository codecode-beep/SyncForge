let API_BASE = "http://localhost:8000";
let TOKEN = localStorage.getItem("TOKEN");
let BOARD_ID = localStorage.getItem("BOARD_ID");

const el = (id)=>document.getElementById(id);

function headers(){
return {
"Content-Type":"application/json",
"Authorization":"Bearer "+TOKEN
}
}

async function api(path,opts={}){
const res = await fetch(API_BASE+path,{...opts,headers:headers()});
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
    
    // create columns
    snap.columns.forEach(c=>{
    

    const col=document.createElement("div");
    col.className="col";
    
    col.innerHTML = `
      <h3>${c.name}</h3>
      <div class="taskList" id="col-${c.id}"></div>
    `;
    
    columnsDiv.appendChild(col);

    
    });
    
    // add tasks into columns
    snap.tasks.forEach(t=>{
    
    const task=document.createElement("div");
    task.className="task";
    task.dataset.id = t.id;
    
    task.innerHTML = `<b>${t.title}</b>`;
    
    const column = document.getElementById("col-"+t.column_id);
    
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

const title = el("taskTitle").value;
const column = el("columnSelect").value;

if(!title) return;

await api("/columns/"+column+"/tasks",{
method:"POST",
body:JSON.stringify({
title:title,
description:""
})
});

el("taskTitle").value="";
loadBoard();
}

function back(){
window.location.href="dashboard.html";
}

el("createTask").onclick=createTask;

loadBoard();
