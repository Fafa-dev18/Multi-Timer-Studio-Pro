const iniciarButton = document.querySelector("#iniciar")
const pararButton = document.querySelector("#parar")
const reiniciarButton = document.querySelector("#reiniciar")

let number = 0
let cron
let h2 = document.querySelector("h2")

function formatarTempo(totalSegundos) {
    const minutos = Math.floor(totalSegundos / 60).toString().padStart(2, "0");
    const segundos = (totalSegundos % 60).toString().padStart(2, "0");
    
    return `${minutos}:${segundos}`;
}

function start(){
    clearInterval(cron);
    cron = setInterval(function(){
        number++;
        h2.innerText = formatarTempo(number);
    }, 1000)
}

function stop(){
    clearInterval(cron);
}

function reset(){
    clearInterval(cron);
    number = 0;
    h2.innerText = formatarTempo(number);
}

iniciarButton.addEventListener("click", start)
pararButton.addEventListener("click", stop)
reiniciarButton.addEventListener("click", reset)