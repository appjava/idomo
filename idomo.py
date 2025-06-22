
import requests
import yaml
import time
import schedule
import threading
import pytz
from datetime import datetime
from flask import Flask, request, render_template, jsonify
from flask_httpauth import HTTPBasicAuth

from flask_sqlalchemy import SQLAlchemy

auth = HTTPBasicAuth()
users = {"admin": "idomo"}

@auth.verify_password
def verify_password(username, password):
    return users.get(username) == password

# Función para cargar config.yaml dinámicamente
def load_config():
    with open('config.yaml', 'r') as f:
        return yaml.safe_load(f)

config = load_config()

ESP_IP = config['esp_ip']
ESP2_IP = config['esp2_ip']

DEVICE_NAMES = config['devices']
SENSOR_DISPLAY_NAMES = config['sensors']

climateData = []
climateURL = ""

app = Flask(__name__)

PORT = 5000

def get_device_name(channel_num):
    return DEVICE_NAMES.get(channel_num, f"Dispositivo CH{channel_num}")

@app.route('/')
def dashboard_view():
    """Sirve la página principal del dashboard."""
    return render_template('dashboard.html', 
                           esp_ip=ESP_IP,
                           esp2_ip=ESP2_IP,
                           device_names=DEVICE_NAMES,
                           sensor_names=SENSOR_DISPLAY_NAMES)

@app.route('/get_esp_sensors')
def get_esp_sensors_route():
    """Obtiene los datos de sensores y estado de canales del ESP8266."""
    try:
        esp_url = f"http://{ESP_IP}/sensors"
        esp_response = requests.get(esp_url, timeout=7) # Timeout un poco mayor por si el ESP tarda
        esp_response.raise_for_status() # Lanza error para respuestas 4xx/5xx
        sensor_data = esp_response.json() # Asume que el ESP responde con JSON válido
        return jsonify(sensor_data)
    except requests.exceptions.HTTPError as e:
        error_msg = f"Error HTTP del ESP al obtener sensores: {e.response.status_code}"
        if e.response.text:
             error_msg += f" - {e.response.text[:100]}" # Primeros 100 caracteres del error del ESP
        return jsonify({"error": error_msg }), e.response.status_code
    except requests.exceptions.Timeout:
        return jsonify({"error": "El ESP8266 no respondió a tiempo (Timeout) al pedir sensores."}), 504
    except requests.exceptions.ConnectionError:
        return jsonify({"error": "No se pudo conectar con el ESP8266 para obtener sensores."}), 503
    except requests.exceptions.JSONDecodeError:
        return jsonify({"error": "Respuesta del ESP para /sensors no es un JSON válido."}), 500
    except Exception as e:
        return jsonify({"error": f"Ocurrió un error inesperado al obtener sensores: {str(e)}"}), 500

@app.route('/get_esp2_sensors')
def get_esp2_sensors_route():
    """Obtiene los datos de sensores y estado de canales del ESP8266."""
    try:
        esp_url = f"http://{ESP2_IP}/sensors"
        esp_response = requests.get(esp_url, timeout=12) # Timeout un poco mayor por si el ESP tarda
        esp_response.raise_for_status() # Lanza error para respuestas 4xx/5xx
        sensor_data = esp_response.json() # Asume que el ESP responde con JSON válido
        return jsonify(sensor_data)
    except requests.exceptions.HTTPError as e:
        error_msg = f"Error HTTP del ESP al obtener sensores: {e.response.status_code}"
        if e.response.text:
             error_msg += f" - {e.response.text[:100]}" # Primeros 100 caracteres del error del ESP
        return jsonify({"error": error_msg }), e.response.status_code
    except requests.exceptions.Timeout:
        return jsonify({"error": "El ESP8266 no respondió a tiempo (Timeout) al pedir sensores."}), 504
    except requests.exceptions.ConnectionError:
        return jsonify({"error": "No se pudo conectar con el ESP8266 para obtener sensores."}), 503
    except requests.exceptions.JSONDecodeError:
        return jsonify({"error": "Respuesta del ESP para /sensors no es un JSON válido."}), 500
    except Exception as e:
        return jsonify({"error": f"Ocurrió un error inesperado al obtener sensores: {str(e)}"}), 500

@app.route('/set_device_state/<int:channel_num>/<action>')
#@auth.login_required
def set_device_state(channel_num, action):
    """Controla un dispositivo en el ESP8266."""
    if action not in ['on', 'off']:
        return jsonify({"error": "Acción no válida. Usar 'on' o 'off'."}), 400

    if channel_num not in DEVICE_NAMES:
        return jsonify({"error": f"Canal {channel_num} no reconocido."}), 404

    esp_command = f"{action}ch{channel_num}"
    device_name = get_device_name(channel_num)
    esp_url = f"http://{ESP_IP}/{esp_command}"
    if channel_num == 6:
        esp2_url = f"http://{ESP2_IP}/{action}ch1"
        print(f"Enviando comando a ESP2: {esp2_url}")
        try:
            esp_response = requests.get(esp2_url, timeout=12)
            if esp_response.status_code == 200:
                print("ESP2: OK")
            else:
                print(f"ESP2: Error {esp_response.status_code}")
        except requests.exceptions.Timeout:
            print("Error: El ESP8266 (ESP2) no respondió a tiempo (Timeout) al cambiar ch1.")
            return jsonify({"error": "El ESP8266 (ESP2) no respondió a tiempo (Timeout) al cambiar ch1."}), 504

    try:
        esp_response = requests.get(esp_url, timeout=6)
        state_text = "encendido/a" if action == 'on' else "apagado/a"
        if esp_response.status_code == 200:
            message = f"{device_name} {state_text} correctamente. (ESP: {esp_response.status_code})"
            return jsonify({"message": message, "status_code": esp_response.status_code}), 200
        else:
            error_detail = esp_response.text[:100] if esp_response.text else "Sin detalle adicional."
            message = f"Error al cambiar estado de {device_name}. ESP respondió: {esp_response.status_code}. Detalle: {error_detail}"
            return jsonify({"error": message, "status_code": esp_response.status_code}), esp_response.status_code
    except requests.exceptions.Timeout:
        return jsonify({"error": f"El ESP8266 ({device_name}) no respondió a tiempo (Timeout)."}), 504
    except requests.exceptions.ConnectionError:
        return jsonify({"error": f"No se pudo conectar con el ESP8266 ({device_name}). Verifica la IP y la red."}), 503
    except Exception as e:
        return jsonify({"error": f"Ocurrió un error inesperado con {device_name}: {str(e)}"}), 500


#------ Auto ----
timeOnCh = ["" for _ in range(7)]
timeOffCh = ["" for _ in range(7)]

# Rutas para gestionar horarios de automatización en config.yaml
@app.route('/auto', methods=['GET'])
def get_automation_rules():
    """Obtiene todos los horarios de automatización desde config.yaml."""
    config = load_config()
    auto_rules = []
    for i in range(1, 7):
        time_on = config['auto'].get(f'timeOnCh{i}', '')
        time_off = config['auto'].get(f'timeOffCh{i}', '')
        auto_rules.append({
            'channel': i,
            'timeOn': time_on,
            'timeOff': time_off,
            'esp_ip': ESP_IP  # Puedes ajustar si necesitas soportar ESP2_IP
        })
    return jsonify(auto_rules), 200

@app.route('/auto', methods=['POST'])
@auth.login_required
def create_automation_rule():
    """Agrega o actualiza un horario de automatización en config.yaml."""
    data = request.get_json()
    if not data or not all(key in data for key in ['channel', 'timeOn', 'timeOff']):
        return jsonify({"error": "Faltan datos requeridos: channel, timeOn, timeOff."}), 400

    channel = data['channel']
    if not isinstance(channel, int) or channel < 1 or channel > 6:
        return jsonify({"error": "Canal inválido. Debe ser un número entre 1 y 6."}), 400

    time_on = data['timeOn']
    time_off = data['timeOff']
    try:
        if time_on:
            datetime.strptime(time_on, '%H:%M')
        if time_off:
            datetime.strptime(time_off, '%H:%M')
    except ValueError:
        return jsonify({"error": "Formato de hora inválido. Usar HH:MM."}), 400

    # Cargar config.yaml y actualizar
    config = load_config()
    config['auto'][f'timeOnCh{channel}'] = time_on
    config['auto'][f'timeOffCh{channel}'] = time_off

    # Guardar los cambios en config.yaml
    with open('config.yaml', 'w') as f:
        yaml.dump(config, f)

    # Reprogramar las reglas
    programar_luces()
    return jsonify({"message": f"Horarios para el canal {channel} actualizados correctamente."}), 201

def autoOnCh(i):
    try:
        esp_url = f"http://{ESP_IP}/onch{i}"
        response = requests.get(esp_url, timeout=5)
        if response.status_code == 200:
            print(f"Canal {i} encendido correctamente")
        else:
            print(f"Error al encender canal {i}: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"Error de red al encender canal {i}: {str(e)}")

def autoOffCh(i):
    try:
        esp_url = f"http://{ESP_IP}/offch{i}"
        response = requests.get(esp_url, timeout=5)
        if response.status_code == 200:
            print(f"Canal {i} apagado correctamente")
        else:
            print(f"Error al apagar canal {i}: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"Error de red al apagar canal {i}: {str(e)}")

#@app.route('/auto')
def programar_luces():
    config = load_config()

    schedule.clear()

    for i in range(1, 7):  # Itera de 1 a 6 (canales 1-6)
        # Leer horarios desde config['auto']
        timeOnCh[i] = config['auto'].get(f'timeOnCh{i}', "")  # Usa get() para evitar KeyError si la clave no existe
        if timeOnCh[i] and timeOnCh[i].strip():  # Verifica que no esté vacío ni solo espacios
            try:
                datetime.strptime(timeOnCh[i], '%H:%M')  # Validar formato HH:MM
                schedule.every().day.at(timeOnCh[i], tz='America/Bogota').do(autoOnCh, i)
                print(f"Programado encendido del canal {i} a las {timeOnCh[i]}")
            except ValueError:
                print(f"Formato de hora inválido para timeOnCh{i}: {timeOnCh[i]}")

        timeOffCh[i] = config['auto'].get(f'timeOffCh{i}', "")
        if timeOffCh[i] and timeOffCh[i].strip():
            try:
                datetime.strptime(timeOffCh[i], '%H:%M')
                schedule.every().day.at(timeOffCh[i], tz='America/Bogota').do(autoOffCh, i)
                print(f"Programado apagado del canal {i} a las {timeOffCh[i]}")
            except ValueError:
                print(f"Formato de hora inválido para timeOffCh{i}: {timeOffCh[i]}")


    while True:
        schedule.run_pending()
        time.sleep(1)
#---------------------------------
totalShort = 0
totalDirect = 0
totalDiffuse = 0
        
eEolica = []
radiacionDirecta = []
radiacionDifusa = []
radiacionCorta = []

horaGenerada = []
tiempo = []
		
potInstalada = config['solar']['potPanel']
areaInstalada = 0.35 * potInstalada/50
effiPanel = config['solar']['effiPanel']

lat = config['solar']['lati']
lon = config['solar']['longi']

urlINI = 'https://api.open-meteo.com/v1/forecast?'
urlA = 'latitude='+str(lat)
urlB = 'longitude='+str(lon)
urlC = 'current=temperature_2m,relative_humidity_2m'
urlD = 'hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,shortwave_radiation,direct_radiation,diffuse_radiation'
urlE = 'daily=temperature_2m_max,temperature_2m_min'
urlEND = 'wind_speed_unit=ms&timezone=auto&forecast_days=1&models=best_match'
urlAPI = urlINI +'&'+ urlA +'&'+ urlB +'&'+ urlC +'&'+ urlD +'&'+ urlE +'&'+ urlEND

climateURL = urlAPI
print("climateURL")
print(urlAPI)

#@app.route('/read_climate')
def read_climate(urlClimate):
    try:
        climate_url = urlClimate
        climate_response = requests.get(climate_url, timeout=7)
        climate_response.raise_for_status()
        data = climate_response.json()
        return data
    except requests.exceptions.HTTPError as e:
        error_msg = f"Error HTTP del Climate: {e.response.status_code}"
        if e.response.text:
             error_msg += f" - {e.response.text[:100]}"
        return jsonify({"error": error_msg }), e.response.status_code
    except requests.exceptions.Timeout:
        return jsonify({"error": "El Climate no respondió a tiempo (Timeout)."}), 504
    except requests.exceptions.ConnectionError:
        return jsonify({"error": "No se pudo conectar con el Climate para obtener datos."}), 503
    except requests.exceptions.JSONDecodeError:
        return jsonify({"error": "Respuesta del Climate para URL no es un JSON válido."}), 500
    except Exception as e:
        return jsonify({"error": f"Ocurrió un error inesperado al obtener Climate: {str(e)}"}), 500

dataClimate = read_climate(urlAPI)

radiacionCorta = dataClimate['hourly']['shortwave_radiation']
horaGenerada = list(map(lambda number: int(number * areaInstalada * effiPanel), radiacionCorta))

tempExt = dataClimate['current']['temperature_2m']

print("HORA GENERADA")
print(horaGenerada)
print("TEMP EXT")
print(tempExt)

@app.route('/datosClima')
def obtener_datos_clima():
    # Obtener la hora actual en formato de 24 horas
    hora_actual = time.localtime().tm_hour
    
    # Extraer el valor correspondiente del array horaGenerada
    if 0 <= hora_actual < len(horaGenerada):
        valor_hora_generada = horaGenerada[hora_actual]
    else:
        valor_hora_generada = None  # En caso de que la hora no esté en el rango

    # Calcular la sumatoria de los elementos de horaGenerada
    sumatoria_hora_generada = sum(horaGenerada)
    
    # Suponiendo que tempExt ya está definido en tu código
    response_data = {
        'horaGenerada': valor_hora_generada,
        'tempExt': tempExt,  # Asegúrate de que tempExt esté definido
        'sumatoria': sumatoria_hora_generada,  # Incluir la sumatoria en la respuesta
        'horaActual': hora_actual
    }
    
    return jsonify(response_data)  # Devolver como JSON

#---------------------------------

if __name__ == '__main__':
    threading.Thread(target=programar_luces).start()
    print(f"Servidor Flask ejecutándose en http://0.0.0.0:{PORT}")
    print(f"Accede al dashboard en http://<IP_DE_TU_MOVIL>:{PORT}/")
    print(f"Controlando ESP8266 en http://{ESP_IP} y http://{ESP2_IP}")
    
    app.run(host='0.0.0.0', port=PORT, debug=False)
