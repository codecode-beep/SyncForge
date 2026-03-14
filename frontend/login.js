let API_BASE = "http://localhost:8000";

async function api(path, opts={}) {
  const res = await fetch(API_BASE + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail);
  return data;
}

async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const tok = await api("/auth/login", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({email,password})
    });

    localStorage.setItem("TOKEN", tok.access_token);

    // redirect to dashboard
    window.location.href = "dashboard.html";
  }
  catch(e){
    document.getElementById("error").innerText = e.message;
  }
}

async function register() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  await api("/auth/register",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({email,password})
  });

  alert("Registered! Now login.");
}

document.getElementById("loginBtn").onclick = login;
document.getElementById("registerBtn").onclick = register;