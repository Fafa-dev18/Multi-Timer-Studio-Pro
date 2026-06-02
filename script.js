// Elementos Globais da Interface
const mainTitle = document.querySelector("#main-title");
const tempoDisplay = document.querySelector("#tempo-display");
const btnIniciar = document.querySelector("#btn-iniciar");
const btnParar = document.querySelector("#btn-parar");
const btnReiniciar = document.querySelector("#btn-reiniciar");
const btnVolta = document.querySelector("#btn-volta");
const alarmeAudio = document.querySelector("#alarme-audio");
const seletorSom = document.querySelector("#seletor-som");

// Notificações (Toast)
const toastNotificacao = document.querySelector("#toast-notificacao");
const toastMensagem = document.querySelector("#toast-mensagem");
let toastTimeout;

// Abas e Painéis
const tabs = {
    cronometro: document.querySelector("#tab-cronometro"),
    temporizador: document.querySelector("#tab-temporizador"),
    alarme: document.querySelector("#tab-alarme")
};
const paineis = {
    temporizador: document.querySelector("#painel-temporizador"),
    alarme: document.querySelector("#painel-alarme"),
    laps: document.querySelector("#container-laps")
};

// Tabelas e Listas
const listaLaps = document.querySelector("#lista-laps");

// Inputs específicos
const inputsTemp = {
    horas: document.querySelector("#temp-horas"),
    minutos: document.querySelector("#temp-minutos"),
    segundos: document.querySelector("#temp-segundos")
};
const inputAlarme = {
    hora: document.querySelector("#alarme-hora"),
    minuto: document.querySelector("#alarme-minuto"),
    status: document.querySelector("#status-alarme")
};

// URLs de Áudios Premium Open-Source
const sonsAlarme = {
    digital: "https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg",
    classico: "https://actions.google.com/sounds/v1/alarms/mechanical_clock_ring.ogg",
    suave: "https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_manual.ogg"
};

// ==========================================
// ESTADO INTERNO DO ENGINE (PRECONIZADO)
// ==========================================
let modoAtual = localStorage.getItem("modo_atual") || "cronometro";

let estadoCronometro = {
    tempoAcumulado: 0,
    timestampInicio: null,
    animationFrameId: null,
    ativo: false,
    voltas: []
};

let estadoTemporizador = {
    tempoRestanteMs: 0,
    timestampAlvo: null,
    intervalId: null,
    ativo: false,
    configurado: false
};

let estadoAlarme = JSON.parse(localStorage.getItem("estado_alarme")) || {
    horaAlvo: null,
    minutoAlvo: null,
    definido: false
};

// Carrega som preferido salvo
let somSelecionado = localStorage.getItem("som_selecionado") || "digital";
seletorSom.value = somSelecionado;
alarmeAudio.src = sonsAlarme[somSelecionado];

// Sincronização em Background do Relógio/Alarme
setInterval(verificarAlarmeDoSistema, 1000);

// ==========================================
// FORMATADORES DE TEMPO AVANÇADOS
// ==========================================
function formatarTempoCompleto(ms, incluirMilissegundos = true) {
    if (ms < 0) ms = 0;
    const horas = Math.floor(ms / 3600000).toString().padStart(2, "0");
    const minutos = Math.floor((ms % 3600000) / 60000).toString().padStart(2, "0");
    const segundos = Math.floor((ms % 60000) / 1000).toString().padStart(2, "0");
    
    if (incluirMilissegundos) {
        const milissegundos = Math.floor((ms % 1000) / 10).toString().padStart(2, "0");
        return `${horas}:${minutos}:${segundos}.${milissegundos}`;
    }
    return `${horas}:${minutos}:${segundos}`;
}

function mostrarNotificacao(mensagem) {
    clearTimeout(toastTimeout);
    toastMensagem.innerText = mensagem;
    toastNotificacao.classList.remove("hidden");
    toastTimeout = setTimeout(() => toastNotificacao.classList.add("hidden"), 4000);
}

// ==========================================
// ENGINE: CRONÔMETRO DE ALTA PRECISÃO
// ==========================================
function atualizarCronometro() {
    if (!estadoCronometro.ativo) return;
    const tempoAtualCorrente = Date.now() - estadoCronometro.timestampInicio + estadoCronometro.tempoAcumulado;
    tempoDisplay.innerText = formatarTempoCompleto(tempoAtualCorrente);
    estadoCronometro.animationFrameId = requestAnimationFrame(atualizarCronometro);
}

function iniciarCronometro() {
    if (estadoCronometro.ativo) return;
    estadoCronometro.ativo = true;
    estadoCronometro.timestampInicio = Date.now();
    estadoCronometro.animationFrameId = requestAnimationFrame(atualizarCronometro);
}

function pararCronometro() {
    if (!estadoCronometro.ativo) return;
    estadoCronometro.ativo = false;
    cancelAnimationFrame(estadoCronometro.animationFrameId);
    estadoCronometro.tempoAcumulado += Date.now() - estadoCronometro.timestampInicio;
}

function resetarCronometro() {
    estadoCronometro.ativo = false;
    cancelAnimationFrame(estadoCronometro.animationFrameId);
    estadoCronometro.tempoAcumulado = 0;
    estadoCronometro.voltas = [];
    listaLaps.innerHTML = "";
    paineis.laps.classList.add("hidden");
    renderizarInterface();
}

function registrarVolta() {
    if (!estadoCronometro.ativo) return;
    const tempoTotal = Date.now() - estadoCronometro.timestampInicio + estadoCronometro.tempoAcumulado;
    
    let tempoVolta = tempoTotal;
    if (estadoCronometro.voltas.length > 0) {
        const totalAnterior = estadoCronometro.voltas[estadoCronometro.voltas.length - 1].total;
        tempoVolta = tempoTotal - totalAnterior;
    }

    const voltaObjeto = {
        numero: estadoCronometro.voltas.length + 1,
        volta: tempoVolta,
        total: tempoTotal
    };

    estadoCronometro.voltas.push(voltaObjeto);
    paineis.laps.classList.remove("hidden");

    const li = document.createElement("li");
    li.innerHTML = `
        <span>Volta ${voltaObjeto.numero}</span>
        <span>${formatarTempoCompleto(voltaObjeto.volta)}</span>
        <span>${formatarTempoCompleto(voltaObjeto.total)}</span>
    `;
    listaLaps.insertBefore(li, listaLaps.firstChild); // Adiciona no topo da lista
}

// ==========================================
// ENGINE: TEMPORIZADOR BASEADO EM TIMESTAMPS
// ==========================================
function iniciarTemporizador() {
    if (estadoTemporizador.ativo) return;

    if (!estadoTemporizador.configurado) {
        const h = parseInt(inputsTemp.horas.value) || 0;
        const m = parseInt(inputsTemp.minutos.value) || 0;
        const s = parseInt(inputsTemp.segundos.value) || 0;
        
        const totalMs = ((h * 3600) + (m * 60) + s) * 1000;
        if (totalMs <= 0) {
            mostrarNotificacao("Por favor, estipule um tempo maior do que zero!");
            return;
        }
        estadoTemporizador.tempoRestanteMs = totalMs;
        estadoTemporizador.configurado = true;
    }

    estadoTemporizador.ativo = true;
    estadoTemporizador.timestampAlvo = Date.now() + estadoTemporizador.tempoRestanteMs;
    renderizarInterface();

    estadoTemporizador.intervalId = setInterval(() => {
        estadoTemporizador.tempoRestanteMs = estadoTemporizador.timestampAlvo - Date.now();
        
        if (modoAtual === "temporizador") {
            tempoDisplay.innerText = formatarTempoCompleto(estadoTemporizador.tempoRestanteMs, false);
        }

        if (estadoTemporizador.tempoRestanteMs <= 0) {
            clearInterval(estadoTemporizador.intervalId);
            estadoTemporizador.ativo = false;
            estadoTemporizador.configurado = false;
            alarmeAudio.play();
            if (modoAtual === "temporizador") {
                tempoDisplay.innerText = "FIM DA CONTAGEM!";
            }
        }
    }, 100);
}

function pararTemporizador() {
    if (!estadoTemporizador.ativo) {
        alarmeAudio.pause();
        return;
    }
    clearInterval(estadoTemporizador.intervalId);
    estadoTemporizador.ativo = false;
    estadoTemporizador.tempoRestanteMs = estadoTemporizador.timestampAlvo - Date.now();
}

function resetarTemporizador() {
    pararTemporizador();
    estadoTemporizador.tempoRestanteMs = 0;
    estadoTemporizador.configurado = false;
    inputsTemp.horas.value = "";
    inputsTemp.minutos.value = "";
    inputsTemp.segundos.value = "";
    renderizarInterface();
}

// ==========================================
// ENGINE: ALARME PERSISTENTE
// ==========================================
function definirAlarme() {
    const h = parseInt(inputAlarme.hora.value);
    const m = parseInt(inputAlarme.minuto.value);

    if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
        mostrarNotificacao("Insira valores válidos (Horas: 00-23, Minutos: 00-59)!");
        return;
    }

    estadoAlarme.horaAlvo = h;
    estadoAlarme.minutoAlvo = m;
    estadoAlarme.definido = true;
    
    localStorage.setItem("estado_alarme", JSON.stringify(estadoAlarme));
    renderizarInterface();
}

function removerAlarme() {
    alarmeAudio.pause();
    alarmeAudio.currentTime = 0;
    estadoAlarme.definido = false;
    estadoAlarme.horaAlvo = null;
    estadoAlarme.minutoAlvo = null;
    inputAlarme.hora.value = "";
    inputAlarme.minuto.value = "";
    localStorage.removeItem("estado_alarme");
    renderizarInterface();
}

function verificarAlarmeDoSistema() {
    const agora = new Date();
    if (modoAtual === "alarme") {
        tempoDisplay.innerText = agora.toLocaleTimeString("pt-BR");
    }

    if (estadoAlarme.definido && agora.getHours() === estadoAlarme.horaAlvo && agora.getMinutes() === estadoAlarme.minutoAlvo && agora.getSeconds() === 0) {
        alarmeAudio.play();
    }
}

// ==========================================
// COMPONENTIZAÇÃO E EXIBIÇÃO DE INTERFACES
// ==========================================
function renderizarInterface() {
    // Esconder painéis de inputs por padrão
    paineis.temporizador.classList.add("hidden");
    paineis.alarme.classList.add("hidden");
    btnVolta.classList.add("hidden");

    if (modoAtual === "cronometro") {
        mainTitle.innerText = "Cronômetro";
        btnVolta.classList.remove("hidden");
        if (estadoCronometro.voltas.length > 0) paineis.laps.classList.remove("hidden");
        
        const tempoCorrente = estadoCronometro.ativo ? 
            (Date.now() - estadoCronometro.timestampInicio + estadoCronometro.tempoAcumulado) : estadoCronometro.tempoAcumulado;
        tempoDisplay.innerText = formatarTempoCompleto(tempoCorrente);
    } 
    else if (modoAtual === "temporizador") {
        mainTitle.innerText = "Temporizador";
        paineis.laps.classList.add("hidden");
        
        if (estadoTemporizador.configurado) {
            tempoDisplay.innerText = formatarTempoCompleto(estadoTemporizador.tempoRestanteMs, false);
        } else {
            tempoDisplay.innerText = "00:00:00";
            paineis.temporizador.classList.remove("hidden");
        }
    } 
    else if (modoAtual === "alarme") {
        mainTitle.innerText = "Alarme";
        paineis.laps.classList.add("hidden");
        paineis.alarme.classList.remove("hidden");
        tempoDisplay.innerText = new Date().toLocaleTimeString("pt-BR");

        if (estadoAlarme.definido) {
            const hF = estadoAlarme.horaAlvo.toString().padStart(2, "0");
            const mF = estadoAlarme.minutoAlvo.toString().padStart(2, "0");
            inputAlarme.status.innerText = `Alarme ativo para às ${hF}:${mF}`;
            inputAlarme.status.style.color = "var(--accent)";
        } else {
            inputAlarme.status.innerText = "Nenhum alarme definido";
            inputAlarme.status.style.color = "var(--text-muted)";
        }
    }
}

// ==========================================
// ESCUTADORES DE EVENTOS EXTERNOS
// ==========================================
btnIniciar.addEventListener("click", () => {
    if (modoAtual === "cronometro") iniciarCronometro();
    if (modoAtual === "temporizador") iniciarTemporizador();
    if (modoAtual === "alarme") definirAlarme();
});

btnParar.addEventListener("click", () => {
    if (modoAtual === "cronometro") pararCronometro();
    if (modoAtual === "temporizador") pararTemporizador();
    if (modoAtual === "alarme") alarmeAudio.pause();
});

btnReiniciar.addEventListener("click", () => {
    if (modoAtual === "cronometro") resetarCronometro();
    if (modoAtual === "temporizador") resetarTemporizador();
    if (modoAtual === "alarme") removerAlarme();
});

btnVolta.addEventListener("click", registrarVolta);

seletorSom.addEventListener("change", (e) => {
    somSelecionado = e.target.value;
    alarmeAudio.src = sonsAlarme[somSelecionado];
    localStorage.setItem("som_selecionado", somSelecionado);
});

// Chaves das abas
Object.keys(tabs).forEach(modo => {
    tabs[modo].addEventListener("click", () => {
        Object.values(tabs).forEach(t => t.classList.remove("active"));
        tabs[modo].classList.add("active");
        modoAtual = modo;
        localStorage.setItem("modo_atual", modo);
        renderizarInterface();
    });
});

// ==========================================
// INTEGRAÇÃO DE ATALHOS DE TECLADO
// ==========================================
window.addEventListener("keydown", (e) => {
    // Evita acionar atalhos enquanto digita valores nos inputs
    if (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "SELECT") return;

    if (e.code === "Space") {
        e.preventDefault(); // Impede barra de rolar a página
        if (!estadoCronometro.ativo && modoAtual === "cronometro") iniciarCronometro();
        else if (estadoCronometro.ativo && modoAtual === "cronometro") pararCronometro();
        
        if (!estadoTemporizador.ativo && modoAtual === "temporizador") iniciarTemporizador();
        else if (estadoTemporizador.ativo && modoAtual === "temporizador") pararTemporizador();
    }
    
    if (e.code === "KeyR") {
        if (modoAtual === "cronometro") resetarCronometro();
        if (modoAtual === "temporizador") resetarTemporizador();
    }
});

// Inicialização imediata com restauração confiável
document.getElementById(`tab-${modoAtual}`).classList.add("active");
renderizarInterface();