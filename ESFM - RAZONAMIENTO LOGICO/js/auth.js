const USERS_URL = "data/users.json";

function $(id){ return document.getElementById(id); }

async function loadUsers(){
  const res = await fetch(USERS_URL, { cache: "no-store" });
  if(!res.ok) throw new Error("No se pudo cargar users.json");
  return await res.json();
}

function setTempSession(username){
  // Se borra al cerrar pestaña/navegador
  sessionStorage.setItem("rl_user", username);
  sessionStorage.setItem("rl_login_at", String(Date.now()));
}

(async function(){
  const btn = $("btnLogin");
  const msg = $("msg");

  async function doLogin(){
    msg.className = "mt-3 small";
    msg.textContent = "";

    const username = $("user").value.trim();
    const password = $("pass").value.trim();

    if(!username || !password){
      msg.classList.add("text-warning");
      msg.textContent = "Completa usuario y contraseña.";
      return;
    }

    const data = await loadUsers();
    const users = data.users || [];

    const ok = users.some(u => u.username === username && u.password === password);
    if(!ok){
      msg.classList.add("text-danger");
      msg.textContent = "Usuario o contraseña incorrectos.";
      return;
    }

    setTempSession(username);
    msg.classList.add("text-success");
    msg.textContent = "Acceso concedido. Entrando...";
    setTimeout(()=> location.href = "index.html", 400);
  }

  btn.addEventListener("click", doLogin);
  document.addEventListener("keydown", (e)=>{
    if(e.key === "Enter") doLogin();
  });
})();
