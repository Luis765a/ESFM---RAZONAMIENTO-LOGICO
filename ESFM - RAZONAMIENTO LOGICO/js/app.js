/* =========================
   CONFIG
========================= */
const DATA_URL = "data/razonamiento.json";
const EXAM_TIME_MIN = 25;     // 25 min
const QUESTIONS_PER_ATTEMPT = 20;

const THEME_LABELS = {
  patrones: "Identificación de Patrones",
  logico_matematico: "Razonamiento Lógico Matemático",
  problemas: "Resolución de Problemas Matemáticos"
};

function $(id){ return document.getElementById(id); }

function shuffle(arr){
  const a = [...arr];
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatTime(seconds){
  const m = String(Math.floor(seconds/60)).padStart(2,'0');
  const s = String(seconds%60).padStart(2,'0');
  return `${m}:${s}`;
}

async function loadBank(){
  const res = await fetch(DATA_URL, { cache: "no-store" });
  if(!res.ok) throw new Error("No se pudo cargar el JSON");
  return await res.json();
}

/* =========================
   INDEX PAGE
========================= */
(function initIndex(){
  const cards = document.querySelectorAll(".tema-card");
  const btnStart = $("btnStart");
  if(!cards.length || !btnStart) return; // no estamos en index

  let selected = null;

  cards.forEach(btn=>{
    btn.addEventListener("click", ()=>{
      cards.forEach(x=>x.classList.remove("active"));
      btn.classList.add("active");
      selected = btn.dataset.tema;
      btnStart.disabled = !selected;
      localStorage.setItem("rl_tema", selected);
    });
  });

  // preselección si ya había guardado
  const saved = localStorage.getItem("rl_tema");
  if(saved){
    const found = [...cards].find(b=>b.dataset.tema === saved);
    if(found){
      found.click();
    }
  }

  btnStart.addEventListener("click", ()=>{
    if(!selected) return;
    window.location.href = "exam.html";
  });
})();

/* =========================
   EXAM PAGE
========================= */
(function initExam(){
  const loadingBox = $("loadingBox");
  const examBox = $("examBox");
  const resultBox = $("resultBox");

  if(!loadingBox || !examBox || !resultBox) return; // no estamos en exam

  const tema = localStorage.getItem("rl_tema") || "patrones";
  const temaLabel = THEME_LABELS[tema] || "Tema";

  $("temaBadge").innerHTML = `<i class="bi bi-book me-1"></i>${temaLabel}`;
  $("timer").textContent = formatTime(EXAM_TIME_MIN*60);

  let bank = null;
  let questions = [];
  let idx = 0;
  let answers = []; // guarda índice opción elegida (0..3) o null
  let secondsLeft = EXAM_TIME_MIN * 60;
  let timerId = null;

  function setView(state){
    // state: loading | exam | result
    loadingBox.classList.toggle("d-none", state !== "loading");
    examBox.classList.toggle("d-none", state !== "exam");
    resultBox.classList.toggle("d-none", state !== "result");
  }

  function startTimer(){
    clearInterval(timerId);
    timerId = setInterval(()=>{
      secondsLeft--;
      $("timer").textContent = formatTime(Math.max(secondsLeft,0));
      if(secondsLeft <= 0){
        clearInterval(timerId);
        finishExam(true);
      }
    }, 1000);
  }

  function stopTimer(){
    clearInterval(timerId);
  }

  function updateProgress(){
    const total = questions.length;
    const answered = answers.filter(x => x !== null && x !== undefined).length;
    const pct = Math.round((answered/total)*100);
    $("progressBar").style.width = `${pct}%`;
    $("progressText").textContent = `${pct}% completado`;
  }

  function renderGrid(){
    const grid = $("gridNav");
    grid.innerHTML = "";
    questions.forEach((_, i)=>{
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = (i+1);
      b.className = "";
      if(i === idx) b.classList.add("active");
      if(answers[i] !== null && answers[i] !== undefined) b.classList.add("answered");
      b.addEventListener("click", ()=>{
        idx = i;
        renderQuestion();
      });
      grid.appendChild(b);
    });
  }

  function renderQuestion(){
    const q = questions[idx];
    if(!q) return;

    $("qIndex").textContent = String(idx+1);
    $("qTotal").textContent = String(questions.length);
    $("qCount").textContent = `${questions.length} Q`;

    $("qStem").textContent = q.enunciado;

    const box = $("optionsBox");
    box.innerHTML = "";

    const letters = ["A","B","C","D"];
    q.opciones.forEach((opt, i)=>{
      const label = document.createElement("label");
      label.className = "opt";
      label.setAttribute("data-i", String(i));

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "opt";
      radio.value = String(i);
      radio.checked = (answers[idx] === i);

      const pill = document.createElement("div");
      pill.className = "opt-letter";
      pill.textContent = letters[i];

      const txt = document.createElement("div");
      txt.className = "flex-grow-1";
      txt.textContent = opt;

      label.appendChild(radio);
      label.appendChild(pill);
      label.appendChild(txt);

      if(answers[idx] === i) label.classList.add("active");

      label.addEventListener("click", (e)=>{
        // evitar doble click raro
        e.preventDefault();
        answers[idx] = i;
        // marcar UI
        [...box.querySelectorAll(".opt")].forEach(x=>x.classList.remove("active"));
        label.classList.add("active");
        // marcar radio
        [...box.querySelectorAll("input")].forEach(r=>r.checked=false);
        radio.checked = true;

        updateProgress();
        renderGrid();
      });

      box.appendChild(label);
    });

    $("btnPrev").disabled = (idx === 0);
    $("btnNext").disabled = (idx === questions.length - 1);

    updateProgress();
    renderGrid();
  }

  function finishExam(byTimeout=false){
    stopTimer();

    const total = questions.length;
    let hits = 0;

    const review = questions.map((q, i)=>{
      const chosen = answers[i];
      const ok = (chosen === q.correcta);
      if(ok) hits++;
      return { q, chosen, ok };
    });

    const misses = total - hits;
    const pct = Math.round((hits/total)*100);

    $("scoreTitle").textContent = `${hits}/${total}`;
    $("hitCount").textContent = String(hits);
    $("missCount").textContent = String(misses);
    $("pctScore").textContent = `${pct}%`;

    const reviewBox = $("reviewBox");
    reviewBox.innerHTML = "";

    review.forEach((r, i)=>{
      const div = document.createElement("div");
      div.className = "review-item";

      const tag = document.createElement("span");
      tag.className = "tag " + (r.ok ? "ok" : "bad");
      tag.textContent = r.ok ? "Correcta" : "Incorrecta";

      const chosenText = (r.chosen === null || r.chosen === undefined)
        ? "Sin responder"
        : r.q.opciones[r.chosen];

      const correctText = r.q.opciones[r.q.correcta];

      div.innerHTML = `
        <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div class="fw-bold">#${i+1}. ${escapeHTML(r.q.enunciado)}</div>
          <div></div>
        </div>
      `;
      div.querySelector("div:last-child")?.remove?.(); // por si acaso

      const head = div.querySelector("div");
      if(head){
        const right = document.createElement("div");
        right.appendChild(tag);
        head.parentElement.appendChild(right);
      }

      const p1 = document.createElement("div");
      p1.className = "mt-2 small-muted";
      p1.innerHTML = `<b>Tu respuesta:</b> ${escapeHTML(chosenText)}`;

      const p2 = document.createElement("div");
      p2.className = "mt-1 small-muted";
      p2.innerHTML = `<b>Correcta:</b> ${escapeHTML(correctText)}`;

      const p3 = document.createElement("div");
      p3.className = "mt-2";
      p3.innerHTML = `<b>Explicación:</b> ${escapeHTML(r.q.explicacion || "—")}`;

      div.appendChild(p1);
      div.appendChild(p2);
      div.appendChild(p3);

      reviewBox.appendChild(div);
    });

    setView("result");

    if(byTimeout){
      // mensaje suave
      const note = document.createElement("div");
      note.className = "mt-3 text-white-50 small";
      note.innerHTML = `<i class="bi bi-exclamation-triangle me-1"></i>El tiempo terminó, se finalizó automáticamente.`;
      $("resultBox").querySelector(".glass-card").appendChild(note);
    }
  }

  function escapeHTML(str){
    return String(str)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function clearCurrent(){
    answers[idx] = null;
    renderQuestion();
  }

  async function boot(){
    try{
      setView("loading");
      bank = await loadBank();

      const temaObj = bank.temas.find(t => t.id === tema);
      if(!temaObj) throw new Error("Tema no encontrado en JSON");

      const pool = shuffle(temaObj.preguntas);
      questions = pool.slice(0, Math.min(QUESTIONS_PER_ATTEMPT, pool.length));

      // si el banco tiene menos de 20, igual se usa lo que hay
      answers = new Array(questions.length).fill(null);

      $("qCount").textContent = `${questions.length} Q`;

      setView("exam");
      idx = 0;
      secondsLeft = EXAM_TIME_MIN * 60;
      $("timer").textContent = formatTime(secondsLeft);

      startTimer();
      renderGrid();
      renderQuestion();

      // handlers
      $("btnPrev").addEventListener("click", ()=>{
        if(idx > 0){ idx--; renderQuestion(); }
      });
      $("btnNext").addEventListener("click", ()=>{
        if(idx < questions.length-1){ idx++; renderQuestion(); }
      });
      $("btnFinish").addEventListener("click", ()=>{
        // confirm simple
        const answered = answers.filter(x => x !== null && x !== undefined).length;
        const ok = confirm(`Vas a finalizar.\nRespondidas: ${answered}/${questions.length}\n\n¿Finalizar ahora?`);
        if(ok) finishExam(false);
      });
      $("btnClear").addEventListener("click", clearCurrent);

      $("btnRetry").addEventListener("click", ()=>{
        window.location.reload();
      });

    }catch(err){
      console.error(err);
      setView("loading");
      loadingBox.innerHTML = `
        <div class="text-danger fw-bold">Error cargando el examen</div>
        <div class="mt-2 text-white-50 small">${escapeHTML(err.message || err)}</div>
        <div class="mt-3">
          <a class="btn btn-ghost" href="index.html"><i class="bi bi-arrow-left me-1"></i>Volver</a>
        </div>
      `;
    }
  }

  boot();
})();
