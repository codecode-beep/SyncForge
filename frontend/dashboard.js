let API_BASE = "http://localhost:8000";
let TOKEN = localStorage.getItem("TOKEN");

function headers(){
  return {
    "Content-Type":"application/json",
    "Authorization":"Bearer " + TOKEN
  }
}

async function api(path, opts={}){
  const res = await fetch(API_BASE+path,{...opts,headers:headers()});
  return res.json();
}

async function loadBoards(){
  const boards = await api("/boards");

  const ul = document.getElementById("boards");
  ul.innerHTML="";

  boards.forEach(b=>{
    const li = document.createElement("li");
    li.innerHTML = `
      ${b.name}
      <button onclick="openBoard('${b.id}')">Open</button>
    `;
    ul.appendChild(li);
  });
}

function openBoard(id){
  localStorage.setItem("BOARD_ID", id);
  window.location.href="board.html";
}

async function createBoard(){
  const name=document.getElementById("boardName").value;

  await api("/boards",{
    method:"POST",
    body:JSON.stringify({name})
  });

  loadBoards();
}

function logout(){
  localStorage.removeItem("TOKEN");
  window.location.href="login.html";
}

document.getElementById("createBoard").onclick=createBoard;

loadBoards();