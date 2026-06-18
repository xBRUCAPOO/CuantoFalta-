/* ===================================================================
   ¿CUÁNTO FALTA? — Lógica
   Toda la configuración de horarios vive en CONFIG_HORARIOS.
   No requiere build ni dependencias externas.
=================================================================== */

(() => {
  "use strict";

  /* -----------------------------------------------------------------
     1) CONFIGURACIÓN DE HORARIOS
     Editar únicamente esta sección para adaptar la app a otra escuela.
     Claves: 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes.
     "inicio" = hora de entrada (referencia para el anillo de progreso).
     "salida" = hora de fin de jornada.
     "recreos" = lista ordenada de recreos del día.
  ----------------------------------------------------------------- */
  const CONFIG_HORARIOS = {
    1: { // Lunes
      inicio: "13:20",
      salida: "20:55",
      recreos: [
        { nombre: "Recreo 1", inicio: "14:50", fin: "14:55" },
        { nombre: "Recreo 2", inicio: "16:15", fin: "16:25" },
        { nombre: "Recreo 3", inicio: "17:45", fin: "17:55" },
        { nombre: "Recreo 4", inicio: "19:05", fin: "19:10" },
      ],
    },
    2: { // Martes
      inicio: "13:20",
      salida: "20:55",
      recreos: [
        { nombre: "Recreo 1", inicio: "14:50", fin: "14:55" },
        { nombre: "Recreo 2", inicio: "16:15", fin: "16:25" },
        { nombre: "Recreo 3", inicio: "17:45", fin: "17:55" },
        { nombre: "Recreo 4", inicio: "19:05", fin: "19:10" },
      ],
    },
    3: { // Miércoles (jornada reducida)
      inicio: "13:20",
      salida: "19:05",
      recreos: [
        { nombre: "Recreo 1", inicio: "14:50", fin: "14:55" },
        { nombre: "Recreo 2", inicio: "16:15", fin: "16:25" },
        { nombre: "Recreo 3", inicio: "17:45", fin: "17:55" },
      ],
    },
    4: { // Jueves
      inicio: "13:20",
      salida: "20:55",
      recreos: [
        { nombre: "Recreo 1", inicio: "14:50", fin: "14:55" },
        { nombre: "Recreo 2", inicio: "16:15", fin: "16:25" },
        { nombre: "Recreo 3", inicio: "17:45", fin: "17:55" },
        { nombre: "Recreo 4", inicio: "19:05", fin: "19:10" },
      ],
    },
    5: { // Viernes (jornada reducida)
      inicio: "13:20",
      salida: "17:05",
      recreos: [
        { nombre: "Recreo 1", inicio: "14:50", fin: "14:55" },
        { nombre: "Recreo 2", inicio: "16:15", fin: "16:25" },
      ],
    },
  };

  const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio",
                 "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const RING_RADIUS = 140;
  const RING_CIRC = 2 * Math.PI * RING_RADIUS;

  /* -----------------------------------------------------------------
     2) REFERENCIAS AL DOM
  ----------------------------------------------------------------- */
  const el = {
    date: document.getElementById("date"),
    clockH: document.getElementById("clock-h"),
    clockM: document.getElementById("clock-m"),
    clockS: document.getElementById("clock-s"),

    stage: document.getElementById("stage"),
    ringWrap: document.getElementById("ring-wrap"),
    ringProgress: document.getElementById("ring-progress"),
    ringTicks: document.getElementById("ring-ticks"),
    exitH: document.getElementById("exit-h"),
    exitM: document.getElementById("exit-m"),
    exitS: document.getElementById("exit-s"),
    exitStatus: document.getElementById("exit-status"),

    recessPanel: document.getElementById("recess-panel"),
    recessDot: document.getElementById("recess-dot"),
    recessLabel: document.getElementById("recess-label"),
    recessFill: document.getElementById("recess-fill"),
    recessH: document.getElementById("recess-h"),
    recessM: document.getElementById("recess-m"),
    recessS: document.getElementById("recess-s"),

    specialMessage: document.getElementById("special-message"),
    specialText: document.getElementById("special-text"),
    specialIcon: document.getElementById("special-icon"),

    soundToggle: document.getElementById("sound-toggle"),
  };

  /* -----------------------------------------------------------------
     3) UTILIDADES DE TIEMPO
  ----------------------------------------------------------------- */

  // Convierte "HH:MM" en un objeto Date con la fecha de referencia dada.
  function horaStringADate(horaStr, fechaReferencia) {
    const [h, m] = horaStr.split(":").map(Number);
    const d = new Date(fechaReferencia);
    d.setHours(h, m, 0, 0);
    return d;
  }

  function pad2(n) {
    return String(Math.max(0, n)).padStart(2, "0");
  }

  // Descompone una cantidad de milisegundos en horas, minutos y segundos.
  function calcularTiempoRestante(ms) {
    const totalSeg = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSeg / 3600);
    const m = Math.floor((totalSeg % 3600) / 60);
    const s = totalSeg % 60;
    return { h, m, s, totalSeg };
  }

  /* -----------------------------------------------------------------
     4) OBTENCIÓN DE FECHA / HORA Y CARGA DE HORARIO DEL DÍA
  ----------------------------------------------------------------- */

  function obtenerFechaActual() {
    return new Date();
  }

  function formatearFecha(d) {
    const diaSemana = DIAS[d.getDay()];
    const mes = MESES[d.getMonth()];
    return `${diaSemana} ${d.getDate()} de ${mes} de ${d.getFullYear()}`;
  }

  function cargarHorarioDelDia(d) {
    return CONFIG_HORARIOS[d.getDay()] || null;
  }

  /* -----------------------------------------------------------------
     5) BÚSQUEDA DEL RECREO ACTUAL / PRÓXIMO
  ----------------------------------------------------------------- */

  function buscarProximoRecreo(horario, ahora) {
    const recreos = horario.recreos.map((r) => ({
      ...r,
      inicioDate: horaStringADate(r.inicio, ahora),
      finDate: horaStringADate(r.fin, ahora),
    }));

    const enCurso = recreos.find((r) => ahora >= r.inicioDate && ahora < r.finDate);
    if (enCurso) return { tipo: "en_curso", recreo: enCurso, anterior: null };

    const proximo = recreos.find((r) => r.inicioDate > ahora);
    if (proximo) {
      const idx = recreos.indexOf(proximo);
      const anterior = idx > 0 ? recreos[idx - 1].finDate : horaStringADate(horario.inicio, ahora);
      return { tipo: "proximo", recreo: proximo, anterior };
    }

    return { tipo: "ninguno", recreo: null, anterior: null };
  }

  /* -----------------------------------------------------------------
     6) ANIMACIÓN DE DÍGITOS AL CAMBIAR
  ----------------------------------------------------------------- */

  const ultimoValor = new WeakMap();

  function escribirNumero(elemento, valor) {
    const texto = pad2(valor);
    if (ultimoValor.get(elemento) !== texto) {
      ultimoValor.set(elemento, texto);
      elemento.textContent = texto;
      elemento.classList.remove("pulse");
      // forzar reflow para reiniciar la animación
      void elemento.offsetWidth;
      elemento.classList.add("pulse");
    }
  }

  /* -----------------------------------------------------------------
     7) SONIDO OPCIONAL (Web Audio API, sin archivos externos)
  ----------------------------------------------------------------- */

  let sonidoActivo = false;
  let audioCtx = null;

  function asegurarAudioCtx() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    return audioCtx;
  }

  function reproducirTono(frecuencia, duracionMs, tipo = "sine") {
    if (!sonidoActivo) return;
    const ctx = asegurarAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = tipo;
    osc.frequency.value = frecuencia;
    gain.gain.value = 0.0001;
    osc.connect(gain).connect(ctx.destination);
    const now = ctx.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.06, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duracionMs / 1000);
    osc.start(now);
    osc.stop(now + duracionMs / 1000 + 0.05);
  }

  function sonarInicioRecreo() {
    reproducirTono(660, 220);
    setTimeout(() => reproducirTono(880, 260), 180);
  }

  function sonarFinJornada() {
    reproducirTono(523, 200);
    setTimeout(() => reproducirTono(392, 320), 220);
  }

  el.soundToggle.addEventListener("click", () => {
    sonidoActivo = !sonidoActivo;
    el.soundToggle.setAttribute("aria-pressed", String(sonidoActivo));
    if (sonidoActivo) {
      const ctx = asegurarAudioCtx();
      if (ctx && ctx.state === "suspended") ctx.resume();
      reproducirTono(740, 120);
    }
  });

  /* -----------------------------------------------------------------
     8) ACTUALIZACIÓN DEL RELOJ Y LA FECHA
  ----------------------------------------------------------------- */

  function actualizarReloj(ahora) {
    el.clockH.textContent = pad2(ahora.getHours());
    el.clockM.textContent = pad2(ahora.getMinutes());
    el.clockS.textContent = pad2(ahora.getSeconds());
  }

  let fechaMostrada = "";
  function actualizarFecha(ahora) {
    const texto = formatearFecha(ahora);
    if (texto !== fechaMostrada) {
      fechaMostrada = texto;
      el.date.textContent = texto;
    }
  }

  /* -----------------------------------------------------------------
     9) ANILLO DE PROGRESO (contador principal)
  ----------------------------------------------------------------- */

  function inicializarAnillo() {
    el.ringProgress.style.strokeDasharray = `${RING_CIRC}`;
    el.ringProgress.style.strokeDashoffset = `${RING_CIRC}`;

    // Genera 60 marcas alrededor del anillo
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 60; i++) {
      const angulo = (i / 60) * 360;
      const esLarga = i % 5 === 0;
      const r1 = esLarga ? 152 : 148;
      const r2 = 158;
      const rad = (angulo * Math.PI) / 180;
      const x1 = 160 + r1 * Math.sin(rad);
      const y1 = 160 - r1 * Math.cos(rad);
      const x2 = 160 + r2 * Math.sin(rad);
      const y2 = 160 - r2 * Math.cos(rad);
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", x1.toFixed(2));
      line.setAttribute("y1", y1.toFixed(2));
      line.setAttribute("x2", x2.toFixed(2));
      line.setAttribute("y2", y2.toFixed(2));
      line.setAttribute("stroke-width", esLarga ? "1.6" : "0.8");
      frag.appendChild(line);
    }
    el.ringTicks.appendChild(frag);
  }

  function actualizarAnilloPrincipal(fraccionTranscurrida) {
    const f = Math.min(1, Math.max(0, fraccionTranscurrida));
    const offset = RING_CIRC * (1 - f);
    el.ringProgress.style.strokeDashoffset = `${offset}`;
  }

  /* -----------------------------------------------------------------
     10) CONTADOR PRINCIPAL: tiempo para la salida
  ----------------------------------------------------------------- */

  function actualizarContadorPrincipal(msRestantes, fraccionTranscurrida, estado) {
    const { h, m, s } = calcularTiempoRestante(msRestantes);
    escribirNumero(el.exitH, h);
    escribirNumero(el.exitM, m);
    escribirNumero(el.exitS, s);
    actualizarAnilloPrincipal(fraccionTranscurrida);

    if (estado === "ultimos_minutos") {
      el.exitStatus.textContent = "¡Ya casi! Últimos minutos de la jornada.";
    } else {
      el.exitStatus.textContent = "";
    }
  }

  /* -----------------------------------------------------------------
     11) CONTADOR SECUNDARIO: próximo recreo / recreo en curso
  ----------------------------------------------------------------- */

  let estadoRecreoAnterior = null; // para detectar transiciones y disparar sonido

  function actualizarContadorSecundario(infoRecreo, ahora) {
    if (infoRecreo.tipo === "en_curso") {
      if (estadoRecreoAnterior !== "en_curso") sonarInicioRecreo();
      estadoRecreoAnterior = "en_curso";

      el.recessPanel.classList.add("is-active");
      el.recessLabel.textContent = "Actualmente estás en recreo";

      const total = infoRecreo.recreo.finDate - infoRecreo.recreo.inicioDate;
      const restante = infoRecreo.recreo.finDate - ahora;
      const transcurrido = 1 - restante / total;

      const { h, m, s } = calcularTiempoRestante(restante);
      escribirNumero(el.recessH, h);
      escribirNumero(el.recessM, m);
      escribirNumero(el.recessS, s);
      el.recessFill.style.width = `${Math.min(100, Math.max(0, transcurrido * 100))}%`;
      return;
    }

    el.recessPanel.classList.remove("is-active");

    if (infoRecreo.tipo === "proximo") {
      estadoRecreoAnterior = "proximo";
      el.recessLabel.textContent = "Próximo recreo";

      const total = infoRecreo.recreo.inicioDate - infoRecreo.anterior;
      const restante = infoRecreo.recreo.inicioDate - ahora;
      const transcurrido = total > 0 ? 1 - restante / total : 0;

      const { h, m, s } = calcularTiempoRestante(restante);
      escribirNumero(el.recessH, h);
      escribirNumero(el.recessM, m);
      escribirNumero(el.recessS, s);
      el.recessFill.style.width = `${Math.min(100, Math.max(0, transcurrido * 100))}%`;
      return;
    }

    // tipo === "ninguno": no quedan más recreos hoy
    estadoRecreoAnterior = "ninguno";
    el.recessLabel.textContent = "No quedan más recreos hoy";
    escribirNumero(el.recessH, 0);
    escribirNumero(el.recessM, 0);
    escribirNumero(el.recessS, 0);
    el.recessFill.style.width = "100%";
  }

  /* -----------------------------------------------------------------
     12) MENSAJES ESPECIALES (fin de semana / jornada finalizada)
  ----------------------------------------------------------------- */

  let yaSonoFinJornada = false;

  function mostrarMensajesEspeciales(texto, icono) {
    el.stage.querySelectorAll(".ring-wrap, .recess-panel").forEach((n) => (n.hidden = true));
    el.specialMessage.hidden = false;
    el.specialText.textContent = texto;
    el.specialIcon.textContent = icono;
  }

  function ocultarMensajesEspeciales() {
    el.specialMessage.hidden = true;
    el.stage.querySelectorAll(".ring-wrap, .recess-panel").forEach((n) => (n.hidden = false));
  }

  /* -----------------------------------------------------------------
     13) CICLO PRINCIPAL
  ----------------------------------------------------------------- */

  function tick() {
    const ahora = obtenerFechaActual();
    actualizarFecha(ahora);
    actualizarReloj(ahora);

    const diaSemana = ahora.getDay();
    const esFinDeSemana = diaSemana === 0 || diaSemana === 6;

    if (esFinDeSemana) {
      document.body.classList.remove("state-ended");
      yaSonoFinJornada = false;
      mostrarMensajesEspeciales("Hoy no hay clases.", "✦");
      return;
    }

    const horario = cargarHorarioDelDia(ahora);
    if (!horario) {
      mostrarMensajesEspeciales("No hay horario configurado para hoy.", "!");
      return;
    }

    const horaInicio = horaStringADate(horario.inicio, ahora);
    const horaSalida = horaStringADate(horario.salida, ahora);

    if (ahora >= horaSalida) {
      document.body.classList.add("state-ended");
      if (!yaSonoFinJornada) {
        sonarFinJornada();
        yaSonoFinJornada = true;
      }
      mostrarMensajesEspeciales("La jornada escolar ha finalizado.", "◆");
      return;
    }

    document.body.classList.remove("state-ended");
    yaSonoFinJornada = false;
    ocultarMensajesEspeciales();

    // --- Contador principal (salida) ---
    const msHastaSalida = horaSalida - ahora;
    const totalJornada = horaSalida - horaInicio;
    const transcurridoJornada = totalJornada > 0 ? (ahora - horaInicio) / totalJornada : 0;
    const estadoPrincipal = msHastaSalida < 5 * 60 * 1000 ? "ultimos_minutos" : "normal";
    actualizarContadorPrincipal(msHastaSalida, transcurridoJornada, estadoPrincipal);

    // --- Contador secundario (recreos) ---
    const infoRecreo = buscarProximoRecreo(horario, ahora);
    actualizarContadorSecundario(infoRecreo, ahora);
  }

  /* -----------------------------------------------------------------
     14) FONDO ANIMADO: partículas tipo constelación
  ----------------------------------------------------------------- */

  function iniciarFondoParticulas() {
    const canvas = document.getElementById("bg-canvas");
    const ctx = canvas.getContext("2d");
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let ancho, alto, particulas;
    const DENSIDAD = prefersReduced ? 0 : 0.00009;
    const VELOCIDAD = prefersReduced ? 0 : 0.18;

    function dimensionar() {
      ancho = canvas.width = window.innerWidth;
      alto = canvas.height = window.innerHeight;
      const cantidad = Math.round(ancho * alto * DENSIDAD);
      particulas = Array.from({ length: cantidad }, () => ({
        x: Math.random() * ancho,
        y: Math.random() * alto,
        vx: (Math.random() - 0.5) * VELOCIDAD,
        vy: (Math.random() - 0.5) * VELOCIDAD,
        r: 0.6 + Math.random() * 1.4,
      }));
    }

    function paso() {
      ctx.clearRect(0, 0, ancho, alto);
      const DIST_MAX = 130;

      for (const p of particulas) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > ancho) p.vx *= -1;
        if (p.y < 0 || p.y > alto) p.vy *= -1;
      }

      ctx.lineWidth = 1;
      for (let i = 0; i < particulas.length; i++) {
        for (let j = i + 1; j < particulas.length; j++) {
          const a = particulas[i], b = particulas[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < DIST_MAX) {
            const op = (1 - dist / DIST_MAX) * 0.12;
            ctx.strokeStyle = `rgba(91, 231, 255, ${op})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (const p of particulas) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(159, 246, 255, 0.55)";
        ctx.fill();
      }

      requestAnimationFrame(paso);
    }

    dimensionar();
    window.addEventListener("resize", dimensionar);
    requestAnimationFrame(paso);
  }

  /* -----------------------------------------------------------------
     15) INICIO DE LA APLICACIÓN
  ----------------------------------------------------------------- */

  function iniciar() {
    inicializarAnillo();
    iniciarFondoParticulas();
    tick();
    setInterval(tick, 1000);
  }

  document.addEventListener("DOMContentLoaded", iniciar);
})();
