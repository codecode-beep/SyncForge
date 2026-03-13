let API_BASE = localStorage.getItem("API_BASE") || "http://localhost:8000";
let TOKEN = localStorage.getItem("TOKEN") || "";
let currentBoardId = null;
let ws = null;

const el = (id) => document.getElementById(id);

function authHeaders() {
  return TOKEN
    ? { "Content-Type": "application/json", "Authorization": `Bearer ${TOKEN}` }
    : { "Content-Type": "application/json" };
}

async function api(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers: opts.headers || authHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
  return data;
}

function connectWS(boardId) {
  if (ws) ws.close();
  const wsUrl = API_BASE.replace("http://", "ws://").replace("https://", "wss://") + `/ws/boards/${boardId}`;
  ws = new WebSocket(wsUrl);

  ws.onmessage = () => loadBoard(boardId).catch(console.error);
  setInterval(() => { try { if (ws?.readyState === 1) ws.send("ping"); } catch {} }, 15000);
}

async function register() {
  const email = el("email").value.trim();
  const password = el("password").value;
  const me = await api("/auth/register", { method: "POST", body: JSON.stringify({ email, password }), headers: { "Content-Type": "application/json" } });
  el("me").textContent = JSON.stringify(me, null, 2);
}

async function login() {
  const email = el("email").value.trim();
  const password = el("password").value;
  const tok = await api("/auth/login", { method: "POST", body: JSON.stringify({ email, password }), headers: { "Content-Type": "application/json" } });
  TOKEN = tok.access_token;
  localStorage.setItem("TOKEN", TOKEN);
  await refreshBoards();
}

async function refreshBoards() {
  const boards = await api("/boards");
  const ul = el("boardsList");
  ul.innerHTML = "";
  boards.forEach(b => {
    const li = document.createElement("li");
    li.innerHTML = `<button>Open</button> <b>${b.name}</b>`;
    li.querySelector("button").onclick = () => loadBoard(b.id);
    ul.appendChild(li);
  });
}

async function createBoard() {
  const name = el("boardName").value.trim();
  if (!name) return;
  await api("/boards", { method: "POST", body: JSON.stringify({ name }) });
  el("boardName").value = "";
  await refreshBoards();
}

function groupTasks(tasks) {
  const m = {};
  for (const t of tasks) (m[t.column_id] ||= []).push(t);
  for (const k in m) m[k].sort((a,b)=>a.position-b.position);
  return m;
}

async function loadBoard(boardId) {
  currentBoardId = boardId;
  const snap = await api(`/boards/${boardId}`);
  el("boardView").classList.remove("hidden");
  el("boardTitle").textContent = `Board: ${snap.board.name}`;
  connectWS(boardId);

  const sel = el("columnSelect");
  sel.innerHTML = "";
  snap.columns.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    sel.appendChild(opt);
  });

  const tasksByCol = groupTasks(snap.tasks);
  const colsDiv = el("columns");
  colsDiv.innerHTML = "";

  snap.columns.forEach(c => {
    const colDiv = document.createElement("div");
    colDiv.className = "col";
    colDiv.innerHTML = `<h3>${c.name}</h3>`;
    const tasks = tasksByCol[c.id] || [];
    tasks.forEach(t => {
      const tDiv = document.createElement("div");
      tDiv.className = "task";
      tDiv.innerHTML = `
        <div><b>${t.title}</b></div>
        <div class="row">
          <select class="moveTo"></select>
          <input class="movePos" type="number" value="${t.position}" style="width:100px" />
          <button class="moveBtn">Move</button>
          <button class="delBtn">Delete</button>
        </div>
      `;
      const moveSel = tDiv.querySelector(".moveTo");
      snap.columns.forEach(cc => {
        const opt = document.createElement("option");
        opt.value = cc.id;
        opt.textContent = cc.name;
        if (cc.id === t.column_id) opt.selected = true;
        moveSel.appendChild(opt);
      });

      tDiv.querySelector(".moveBtn").onclick = async () => {
        await api(`/tasks/${t.id}/move`, { method: "POST", body: JSON.stringify({ to_column_id: moveSel.value, to_position: parseInt(tDiv.querySelector(".movePos").value||"0",10) }) });
        await loadBoard(boardId);
      };
      tDiv.querySelector(".delBtn").onclick = async () => {
        await api(`/tasks/${t.id}`, { method: "DELETE" });
        await loadBoard(boardId);
      };

      colDiv.appendChild(tDiv);
    });

    colsDiv.appendChild(colDiv);
  });
}

async function createTask() {
  const title = el("taskTitle").value.trim();
  const columnId = el("columnSelect").value;
  if (!title) return;
  await api(`/columns/${columnId}/tasks`, { method: "POST", body: JSON.stringify({ title, description: "", position: 0 }) });
  el("taskTitle").value = "";
  await loadBoard(currentBoardId);
}

el("apiBase").value = API_BASE;
el("saveBase").onclick = () => { API_BASE = el("apiBase").value.trim(); localStorage.setItem("API_BASE", API_BASE); alert("Saved"); };

el("registerBtn").onclick = () => register().catch(e => alert(e.message));
el("loginBtn").onclick = () => login().catch(e => alert(e.message));
el("logoutBtn").onclick = () => { TOKEN=""; localStorage.removeItem("TOKEN"); location.reload(); };

el("refreshBoardsBtn").onclick = () => refreshBoards().catch(e => alert(e.message));
el("createBoardBtn").onclick = () => createBoard().catch(e => alert(e.message));
el("createTaskBtn").onclick = () => createTask().catch(e => alert(e.message));

if (TOKEN) refreshBoards().catch(()=>{});