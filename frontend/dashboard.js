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
  
    const container = document.getElementById("boards");
    
    container.innerHTML="";
  
    boards.forEach(b=>{
  
      const card = document.createElement("div");
      card.className="boardCard";
  
      card.innerHTML = `
        <div class="boardCardContent">

            <div class="boardMenu">
            <span onclick="toggleMenu(event)">&#8942;</span>

            <div class="menuDropdown">
                <button onclick="deleteBoard('${b.id}')">Delete</button>
            </div>
            </div>

            <h3>${b.name}</h3>

        </div>
        `;
  
      // double click → open board
      card.ondblclick = ()=>{
        openBoard(b.id);
      }
  
      container.appendChild(card);
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

async function deleteBoard(id){

    if(!confirm("Delete this board?")) return;
  
    await api("/boards/"+id,{
      method:"DELETE"
    });
  
    loadBoards();
  }

  function toggleMenu(event){
    event.stopPropagation();
  
    const menu = event.target.nextElementSibling;
  
    document.querySelectorAll(".menuDropdown").forEach(m=>{
      if(m !== menu) m.style.display = "none";
    });
  
    menu.style.display = menu.style.display === "block" ? "none" : "block";
  }