// Credenciales para autenticación básica
const authHeader = 'Basic ' + btoa('admin:idomo');
//Calculos solares

// Elementos del DOM para sensores

const chargeStatusEl = document.getElementById('charge_status_value');
const chargeBannerEl = document.getElementById('charge_banner');
const tempExtValueEl = document.getElementById('tempExt');
const tempValueEl = document.getElementById('temp_value');
const humidityValueEl = document.getElementById('humidity_value');
const voltageValueEl = document.getElementById('voltage_value');
const capacityValueEl = document.getElementById('capacity_value');
const powerValueEl = document.getElementById('power_value');
const generateValueEl = document.getElementById('generate_value');
const solarMoonValueEl = document.getElementById('solarMoon');
const energyValueEl = document.getElementById('energy_value');
const totalEsperadoValueEl = document.getElementById('esperado_value');
const hoursValueEl = document.getElementById('hours_value');
const sourceValueEl = document.getElementById('source_value');

// Formulario de automatización
const automationForm = document.getElementById('automation-form');
const automationListEl = document.getElementById('automation-list');

let electricityChartInstance = null;
let todayConsumptionChartInstance = null; // <--- NUEVA VARIABLE

const chartDataPoints = 30; // Show last 30 energy readings
let energyHistory = [];

// DARK MODE START - JavaScript Logic
const darkModeToggle = document.getElementById('darkModeToggle');
const body = document.body;
const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");

function setDarkMode(enabled) {
    if (enabled) {
        body.classList.add('dark-mode');
        darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>'; // Sun icon for dark mode
        localStorage.setItem('darkMode', 'enabled');
    } else {
        body.classList.remove('dark-mode');
        darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>'; // Moon icon for light mode
        localStorage.setItem('darkMode', 'disabled');
    }
    // Update chart colors if it exists
    /*if (electricityChartInstance) {
        const isDarkMode = body.classList.contains('dark-mode');
        const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const ticksColor = isDarkMode ? '#e0e0e0' : '#333';
        const titleColor = isDarkMode ? '#e0e0e0' : '#333';

        electricityChartInstance.options.scales.y.grid.color = gridColor;
        electricityChartInstance.options.scales.x.grid.color = gridColor;
        electricityChartInstance.options.scales.y.ticks.color = ticksColor;
        electricityChartInstance.options.scales.x.ticks.color = ticksColor;
        electricityChartInstance.options.scales.y.title.color = titleColor;
        electricityChartInstance.options.scales.x.title.color = titleColor;
        electricityChartInstance.options.plugins.legend.labels.color = titleColor;
        electricityChartInstance.update();
    }*/
}

darkModeToggle.addEventListener('click', () => {
    setDarkMode(!body.classList.contains('dark-mode'));
});

// Check local storage or system preference on load
const savedMode = localStorage.getItem('darkMode');
if (savedMode === 'enabled') {
    setDarkMode(true);
} else if (savedMode === 'disabled') {
    setDarkMode(false);
} else if (prefersDarkScheme.matches) { // If no saved pref, check system pref
    setDarkMode(true);
} else {
    setDarkMode(false); // Default to light mode
}
// DARK MODE END - JavaScript Logic

/*
function initElectricityChart() {
    const ctx = document.getElementById('electricityChart').getContext('2d');

    // DARK MODE - Chart Color Adjustments
    const isDarkMode = body.classList.contains('dark-mode');
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const ticksColor = isDarkMode ? '#e0e0e0' : '#333'; // Match --text-dark
    const titleColor = isDarkMode ? '#e0e0e0' : '#333';

    electricityChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [], // Timestamps or count
            datasets: [{
                label: 'Carga (W)',
                data: [],
                borderColor: 'var(--orange-accent)',
                backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--orange-accent').trim() + '33', // Add alpha for area, e.g., 33 for 20% opacity
                borderWidth: 2,
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'W', color: titleColor },
                    grid: { color: gridColor },
                    ticks: { color: ticksColor }
                },
                x: {
                    title: { display: true, text: 'Tiempo (actualizaciones)', color: titleColor },
                    grid: { color: gridColor },
                    ticks: { color: ticksColor }
                }
            },
            animation: {
                duration: 300 //ms
            },
            plugins: { // DARK MODE - Legend color
                legend: {
                    labels: {
                        color: titleColor
                    }
                }
            }
        }
    });
}

function updateElectricityChart(newEnergyValue) {
    if (!electricityChartInstance) return;

    if (energyHistory.length >= chartDataPoints) {
        energyHistory.shift(); 
        electricityChartInstance.data.labels.shift();
    }

    energyHistory.push(parseFloat(newEnergyValue) || 0);
    electricityChartInstance.data.labels.push(energyHistory.length); 
    electricityChartInstance.data.datasets[0].data = [...energyHistory];

    const currentOrangeAccent = getComputedStyle(document.documentElement).getPropertyValue('--orange-accent').trim();
    electricityChartInstance.data.datasets[0].backgroundColor = currentOrangeAccent + '33'; 

    electricityChartInstance.update();
}
*/
async function updateDashboardData() {
    // Update data from /get_esp_sensors
    try {
        const response = await fetch('/get_esp_sensors', {
            headers: { 'Authorization': authHeader } });
        const data = await response.json();

        if (!response.ok || (data && data.error)) { 
            console.error('Error al obtener datos de ESP1:', (data && data.error) || response.status);
            if (chargeStatusEl) chargeStatusEl.textContent = 'Error ESP1';
            if (chargeBannerEl) chargeBannerEl.className = 'charge-banner status-error'; 
            if (tempValueEl) tempValueEl.textContent = 'N/A';
            if (humidityValueEl) humidityValueEl.textContent = 'N/A';
            if (voltageValueEl) voltageValueEl.textContent = 'N/A';
            if (capacityValueEl) capacityValueEl.textContent = 'N/A';
        } else {
            // 1. Update Charge Banner
            if (chargeStatusEl && chargeBannerEl) {
                chargeStatusEl.textContent = data.Charge || 'N/A';
                let chargeState = (data.Charge || 'N/A').toUpperCase();
                chargeBannerEl.className = 'charge-banner'; 
                if (chargeState === 'HIGH' || chargeState === 'HIGHEST' || chargeState === 'HIGHER')
                    chargeBannerEl.classList.add('charge-high');
                else if (chargeState === 'MID' || chargeState === 'MID-HIGH')
                    chargeBannerEl.classList.add('charge-medium');
                else if (chargeState === 'LOWEST!' || chargeState === 'LOWER!' || chargeState === 'LOW' || chargeState === 'OVER_CHARGE!!!')
                    chargeBannerEl.classList.add('charge-low');
                else if (chargeState === 'SOFT_CHARGE')
                    chargeBannerEl.classList.add('charge-charging');
            }

            // 2. Update Sensor Widgets for ESP1
            if (tempValueEl) tempValueEl.textContent = data.Temperature !== undefined ? `${data.Temperature}°C` : 'N/A';
            if (humidityValueEl) humidityValueEl.textContent = data.Humidity !== undefined ? `${data.Humidity}%` : 'N/A';
            if (voltageValueEl) voltageValueEl.textContent = data.Voltage !== undefined ? `${data.Voltage}V` : 'N/A';
            if(capacityValueEl) capacityValueEl.textContent = data.Capacity !== undefined ? `${data.Capacity}%`: 'N/A';

            // 3. Update Device States (CH1-CH6)
            for (let i = 1; i <= 6; i++) {
                const channelKey = `CH${i}`;
                const switchElement = document.getElementById(`switch_ch${i}`);
                const statusDiv = document.getElementById(`status_ch${i}`);
                const currentDeviceState = data && data[channelKey] ? data[channelKey].toUpperCase() : undefined;


                if (currentDeviceState !== undefined) { 
                    if (switchElement) {
                        // Specific logic for CH5 and CH6 based on multiple ON/OFF states
                        if (channelKey === "CH5") {
                            switchElement.checked = (currentDeviceState === "ON_MANUAL" || currentDeviceState === "ON_AUTO");
                        } else if (channelKey === "CH6") {
                            switchElement.checked = (currentDeviceState === "ON"); // OFF and CUT OFF will be unchecked
                        } else {
                            // Default logic for CH1-CH4
                            switchElement.checked = (currentDeviceState === "ON");
                        }
                    }
                    if (statusDiv) {
                        statusDiv.textContent = `Estado: ${data[channelKey]}`; // Show actual state string
                        // Class for status text (success if any ON state, info otherwise unless error)
                        if (currentDeviceState.includes("ON")) {
                             statusDiv.className = 'status success';
                        } else if (currentDeviceState.includes("OFF")) {
                             statusDiv.className = 'status info';
                        } else {
                             statusDiv.className = 'status'; // Default or unknown
                        }
                    }
                } else {
                    if (statusDiv) {
                        statusDiv.textContent = 'Estado: Desconocido';
                        statusDiv.className = 'status';
                    }
                    if (switchElement) { // Default to off if no data
                        switchElement.checked = false;
                    }
                    console.warn(`No data found for ${channelKey} in ESP1 response.`);
                }
            }
        }
    } catch (error) {
        console.error('Fallo al actualizar datos ESP1:', error);
        if(chargeStatusEl) chargeStatusEl.textContent = 'Error de Red ESP1';
        if(chargeBannerEl) chargeBannerEl.className = 'charge-banner status-error';
        if(tempValueEl) tempValueEl.textContent = 'N/A';
        if(humidityValueEl) humidityValueEl.textContent = 'N/A';
        if(voltageValueEl) voltageValueEl.textContent = 'N/A';
        if(capacityValueEl) capacityValueEl.textContent = 'N/A';
        for (let i = 1; i <= 6; i++) { 
            const statusDiv = document.getElementById(`status_ch${i}`);
            if (statusDiv) { statusDiv.textContent = 'Error de Red'; statusDiv.className = 'status error';}
             const switchElement = document.getElementById(`switch_ch${i}`);
            if (switchElement) { switchElement.checked = false; } // Default to off on error
        }
    }

    // Update data from /get_esp2_sensors
    try {
        const response2 = await fetch('/get_esp2_sensors', {
            headers: { 'Authorization': authHeader } });
        const data2 = await response2.json();

        if (!response2.ok || (data2 && data2.error)) {
            console.error('Error al obtener datos de ESP2:', (data2 && data2.error) || response2.status);
            //if(powerValueEl) powerValueEl.textContent = 'N/A'; 
            //if(energyValueEl) energyValueEl.textContent = 'N/A';
            //if(hoursValueEl) hoursValueEl.textContent = 'N/A';
            //if(sourceValueEl) sourceValueEl.textContent = 'N/A';
        } else {
            if(powerValueEl) powerValueEl.textContent = data2.Power !== undefined ? `${data2.Power}W` : 'N/A';
            if(energyValueEl) {
                energyValueEl.textContent = data2.Energy !== undefined ? `${data2.Energy}Wh` : 'N/A';
                /*if (data2.Power !== undefined)
                    updateElectricityChart(data2.Power);*/
            }
            if(hoursValueEl) hoursValueEl.textContent = data2.Hours !== undefined ? `${data2.Hours}h` : 'N/A';
            if(sourceValueEl) sourceValueEl.textContent = data2.Source !== undefined ? `${data2.Source.toUpperCase()}` : 'N/A';

            // --- NUEVA LÓGICA PARA LA TARJETA DE ENERGÍA ---
            //const energyValueEl = document.getElementById('energy_value');
            if (energyValueEl) {
                let energiaMostrada = 0;
                let etiquetaEnergia = "Energía";

                if (data2.Source === 'solar') {
                    energiaMostrada = data2.PaSol || 0;
                } else { // 'red'
                    energiaMostrada = data2.PaRed || 0;
                }
                
                document.querySelector('.widget.energy .widget-label').textContent = etiquetaEnergia;
                //energyValueEl.textContent = `${parseFloat(energiaMostrada).toFixed(0)} Wh`;
             }
        }
    } catch (error) {
        console.error('Fallo al actualizar datos ESP2:', error);
        if(powerValueEl) powerValueEl.textContent = 'Error Red';
        if(energyValueEl) energyValueEl.textContent = 'Error Red';
        if(hoursValueEl) hoursValueEl.textContent = 'Error Red';
        if(sourceValueEl) sourceValueEl.textContent = 'Error Red';
    }

    updateTodayConsumptionChart();
}

async function sendDeviceCommand(channel, action, deviceName) {
    const statusDivId = `status_ch${channel}`;
    const statusDiv = document.getElementById(statusDivId);
    const switchElement = document.getElementById(`switch_ch${channel}`); 
    const intendedCheckedState = (action === 'on');


    if (!statusDiv) {
        console.error(`Elemento de estado ${statusDivId} no encontrado.`);
        return;
    }
    
    statusDiv.textContent = `Enviando orden a ${deviceName}...`;
    statusDiv.className = 'status info';

    try {
        const response = await fetch(`/set_device_state/${channel}/${action}`, { headers: { 'Authorization': authHeader } });
        const data = await response.json();

        if (response.ok) {
            // statusDiv.textContent = data.message || `Comando enviado. ESP: ${data.status_code}`;
            // The status text and class will be updated by updateDashboardData
            setTimeout(updateDashboardData, 300); // Reduced delay
        } else {
            statusDiv.textContent = `Error (${response.status}): ${data.error || 'Error desconocido'}`;
            statusDiv.className = 'status error';
            if (switchElement && switchElement.checked === intendedCheckedState) {
                switchElement.checked = !intendedCheckedState; // Revert optimistic UI update
            }
            setTimeout(updateDashboardData, 100); 
        }
    } catch (error) {
        console.error(`Error en la solicitud para ${deviceName}:`, error);
        statusDiv.textContent = `Error de conexión para ${deviceName}.`;
        statusDiv.className = 'status error';
        if (switchElement && switchElement.checked === intendedCheckedState) {
             switchElement.checked = !intendedCheckedState; // Revert optimistic UI update
        }
        setTimeout(updateDashboardData, 100); 
    }
}

function handleDeviceToggle(channel, checkboxElement, deviceName) {
    const action = checkboxElement.checked ? 'on' : 'off';
    sendDeviceCommand(channel, action, deviceName);
}

function clearAutomationForm(){
    automationForm.reset();
    document.getElementById('rule-channel').value = 1; 
    automationForm.onsubmit = saveAutomationRule; 
}

async function loadAutomationRules() {
    try {
        const response = await fetch('/auto', { headers: { 'Authorization': authHeader } });
        const rules = await response.json();

        if (!response.ok) {
            automationListEl.innerHTML = `<div class="status error">Error al cargar horarios: ${rules.error || response.status}</div>`;
            return;
        }

        if (rules.length === 0) {
            automationListEl.innerHTML = '<div class="status info">No hay horarios de automatización configurados.</div>';
        } else {
            automationListEl.innerHTML = '';
            rules.forEach(rule => {
                const ruleDiv = document.createElement('div');
                ruleDiv.className = 'automation-rule';
                const deviceName = document.querySelector(`#rule-channel option[value="${rule.channel}"]`)?.textContent || `Canal ${rule.channel}`;
                const timeOnText = rule.timeOn ? `ON: ${rule.timeOn}` : 'Sin ON';
                const timeOffText = rule.timeOff ? `OFF: ${rule.timeOff}` : 'Sin OFF';

                ruleDiv.innerHTML = `
                    <span>${deviceName} <br> <small>${timeOnText} | ${timeOffText}</small></span>
                    <div class="actions">
                        <button class="edit" onclick="editRule(${rule.channel}, '${rule.timeOn || ""}', '${rule.timeOff || ""}')"><i class="fas fa-edit"></i> Editar</button>
                        </div>
                `;
                automationListEl.appendChild(ruleDiv);

                const onAutoEl = document.getElementById(`OnAuto${rule.channel}`);
                if(onAutoEl) onAutoEl.innerText = rule.timeOn ? `AutoON: ${rule.timeOn}` : "";
                const offAutoEl = document.getElementById(`OffAuto${rule.channel}`);
                if(offAutoEl) offAutoEl.innerText = rule.timeOff ? `AutoOFF: ${rule.timeOff}` : "";
            });
        }
    } catch (error) {
        console.error('Error al cargar horarios:', error);
        automationListEl.innerHTML = '<div class="status error">Error de conexión al cargar horarios.</div>';
    }
}

async function saveAutomationRule(event) {
    event.preventDefault();
    const channel = document.getElementById('rule-channel').value;
    const timeOn = document.getElementById('rule-time-on').value || "";
    const timeOff = document.getElementById('rule-time-off').value || "";

    try {
        const response = await fetch('/auto', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader
            },
            body: JSON.stringify({ channel: parseInt(channel), timeOn, timeOff })
        });
        const data = await response.json();

        if (response.ok) {
            automationForm.reset();
            document.getElementById('rule-channel').value = 1; 
            automationForm.onsubmit = saveAutomationRule;
            setTimeout(loadAutomationRules, 300);
        } else {
            const errorMsg = `Error al guardar: ${data.error || 'Error desconocido'}`;
            console.error(errorMsg);
            const tempErrorDiv = document.createElement('div');
            tempErrorDiv.className = 'status error';
            tempErrorDiv.textContent = errorMsg;
            automationListEl.insertBefore(tempErrorDiv, automationListEl.firstChild);
            setTimeout(() => tempErrorDiv.remove(), 5000); 
        }
    } catch (error) {
        const errorMsg = 'Error de conexión al guardar horario.';
        console.error('Error al guardar horario:', error);
        const tempErrorDiv = document.createElement('div');
        tempErrorDiv.className = 'status error';
        tempErrorDiv.textContent = errorMsg;
        automationListEl.insertBefore(tempErrorDiv, automationListEl.firstChild);
        setTimeout(() => tempErrorDiv.remove(), 5000);
    }
}

function editRule(channel, timeOn, timeOff) {
    document.getElementById('rule-channel').value = channel;
    document.getElementById('rule-time-on').value = timeOn || "";
    document.getElementById('rule-time-off').value = timeOff || "";
    automationForm.scrollIntoView({ behavior: 'smooth' });
}

async function deleteRule(channel) {
    if (!window.confirm(`¿Seguro que quieres eliminar la automatización para el canal ${channel}?`)) return;

    try {
        const response = await fetch(`/auto/${channel}`, {
            method: 'DELETE',
            headers: { 'Authorization': authHeader }
        });
        const data = await response.json();

        if (response.ok) {
            setTimeout(loadAutomationRules, 300);
        } else {
            const errorMsg = `Error al eliminar: ${data.error || 'Error desconocido'}`;
            console.error(errorMsg);
            const tempErrorDiv = document.createElement('div');
            tempErrorDiv.className = 'status error';
            tempErrorDiv.textContent = errorMsg;
            automationListEl.insertBefore(tempErrorDiv, automationListEl.firstChild);
            setTimeout(() => tempErrorDiv.remove(), 5000);
        }
    } catch (error) {
        const errorMsg = 'Error de conexión al eliminar horario.';
        console.error('Error al eliminar horario:', error);
        const tempErrorDiv = document.createElement('div');
        tempErrorDiv.className = 'status error';
        tempErrorDiv.textContent = errorMsg;
        automationListEl.insertBefore(tempErrorDiv, automationListEl.firstChild);
        setTimeout(() => tempErrorDiv.remove(), 5000);
    }
}

// Función para obtener el valor de hora generada y tempExt desde el backend
async function obtenerDatos() {
    try {
        const response = await fetch('/datosClima');
        
        // Verificar si la respuesta es exitosa
        if (!response.ok) {
            throw new Error('Error en la respuesta del servidor');
        }

        // Obtener el valor de la respuesta
        const data = await response.json();
        
        // Acceder a los valores
        const valorHoraGenerada = data.horaGenerada;
        const temperaturaExterior = data.tempExt;
        const sumatoriaHoraGenerada = data.sumatoria;
        const horaAct = data.horaActual;
        
        if (horaAct < 6 || horaAct > 18){
            solarMoonValueEl.classList.remove('fa-sun');
            solarMoonValueEl.classList.add('fa-moon');

        } else {
            solarMoonValueEl.classList.remove('fa-moon');
            solarMoonValueEl.classList.add('fa-sun');
        }

        // Mostrar los valores en la consola o usarlos como necesites
        //console.log(`Valor correspondiente a la hora actual: ${valorHoraGenerada}`);
        //console.log(`Temperatura exterior: ${temperaturaExterior}`);
        generateValueEl.textContent = valorHoraGenerada + "W";
        tempExtValueEl.textContent = temperaturaExterior;
        totalEsperadoValueEl.textContent = sumatoriaHoraGenerada + "Wh";

    } catch (error) {
        console.error('Error al obtener los datos:', error);
    }
}

// Llamar a la función para obtener los valores
obtenerDatos();

// En el DOMContentLoaded
/*function adjustViewport() {
const viewportWidth = Math.max(document.documentElement.clientWidth || 0);
if (viewportWidth < 360) {
    document.querySelector('meta[name="viewport"]')
    .setAttribute('content', 'width=360, user-scalable=yes');
}
}*/
//adjustViewport();
//window.addEventListener('resize', adjustViewport);

async function loadAndDisplayHistory() {
try {
const response = await fetch('/api/history');
const historyData = await response.json();

if (historyData.error) {
    console.error(historyData.error);
    return;
}

// historyData es un array de objetos: [{date, solar_wh, grid_wh}, ...]
// Ordena los datos por fecha para el gráfico
historyData.sort((a, b) => new Date(a.date) - new Date(b.date));

const labels = historyData.map(d => d.date);
const solarData = historyData.map(d => d.solar_wh);
const gridData = historyData.map(d => d.grid_wh);

// Aquí puedes usar Chart.js para crear un gráfico de barras
// Reemplaza el gráfico de línea existente con uno de barras
const ctx = document.getElementById('electricityChart').getContext('2d');
if(window.myHistoryChart) {
    window.myHistoryChart.destroy(); // Destruye el gráfico anterior si existe
}
window.myHistoryChart = new Chart(ctx, {
    type: 'bar',
    data: {
        labels: labels,
        datasets: [
            {
                label: 'Consumo Solar (Wh)',
                data: solarData,
                backgroundColor: 'rgba(255, 206, 86, 0.7)', // Amarillo
                borderColor: 'rgba(255, 206, 86, 1)',
                borderWidth: 1
            },
            {
                label: 'Consumo Red (Wh)',
                data: gridData,
                backgroundColor: 'rgba(255, 99, 132, 0.7)', // Rojo
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1
            }
        ]
    },
    options: {
        scales: {
            y: {
                beginAtZero: true,
                title: { display: true, text: 'Consumo (Wh)' }
            },
            x: {
                title: { display: true, text: 'Fecha' }
            }
        }
    }
});

} catch (error) {
console.error("Error al cargar el historial de consumo:", error);
}
}

function initTodayConsumptionChart() {
const ctx = document.getElementById('todayConsumptionChart').getContext('2d');

todayConsumptionChartInstance = new Chart(ctx, {
type: 'bar',
data: {
    labels: ['Solar', 'Red'], // Solo dos categorías
    datasets: [{
        label: 'Consumo del Día (Wh)',
        data: [0, 0], // Empezamos con 0
        backgroundColor: [
            'rgba(255, 206, 86, 0.7)', // Amarillo para Solar
            'rgba(255, 99, 132, 0.7)'  // Rojo para Red
        ],
        borderColor: [
            'rgba(255, 206, 86, 1)',
            'rgba(255, 99, 132, 1)'
        ],
        borderWidth: 1
    }]
},
options: {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
        y: {
            beginAtZero: true,
            title: {
                display: true,
                text: 'Energía Acumulada (Wh)'
            }
        }
    },
    plugins: {
        legend: {
            display: false // Opcional: la leyenda es redundante con solo 2 barras
        }
    }
}
});
}

async function updateTodayConsumptionChart() {
if (!todayConsumptionChartInstance) return; // No hacer nada si el gráfico no está listo

try {
const response = await fetch('/api/today_consumption');
const data = await response.json();

if (data.error) {
    console.error("Error al obtener consumo de hoy:", data.error);
    return;
}

// Actualizamos los datos del gráfico con los nuevos valores
todayConsumptionChartInstance.data.datasets[0].data[0] = data.solar_wh;
todayConsumptionChartInstance.data.datasets[0].data[1] = data.grid_wh;

// Le decimos a Chart.js que se redibuje con los datos nuevos
todayConsumptionChartInstance.update();

} catch (error) {
console.error("Fallo de conexión al actualizar consumo de hoy:", error);
}
}

document.addEventListener('DOMContentLoaded', () => {
    //initElectricityChart();
    loadAndDisplayHistory();  // Carga el historial de días pasados
    initTodayConsumptionChart(); // <--- INICIALIZA EL NUEVO GRÁFICO

    updateDashboardData(); 
    loadAutomationRules();

    setInterval(updateDashboardData, 6000); 
    setInterval(loadAutomationRules, 3000);
    setInterval(obtenerDatos, 30000);
    //setInterval(updateTodayConsumptionChart, 15000);
    automationForm.reset();
    document.getElementById('rule-channel').value = 1; 
    automationForm.addEventListener('submit', saveAutomationRule);
    //window.addEventListener('resize', adjustViewport);
    //loadAndDisplayHistory(); // Llama a la función al cargar la página
});