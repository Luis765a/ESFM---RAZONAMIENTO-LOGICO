(function () {
  // sesión temporal (se borra al cerrar pestaña)
  const user = sessionStorage.getItem("rl_user");

  if (!user) {
    // evita bucle infinito si ya estás en login
    if (!location.pathname.endsWith("login.html")) {
      location.replace("login.html");
    }
  }
})();
