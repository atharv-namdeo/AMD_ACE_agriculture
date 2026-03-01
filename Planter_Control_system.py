import os
import cv2
import time
import math
import smbus2
import pygame
import threading
import tkinter as tk
import adafruit_dht
import board
from flask import Flask, render_template_string, Response, jsonify
from gpiozero import PWMOutputDevice, DigitalOutputDevice, DigitalInputDevice
from adafruit_servokit import ServoKit

# ==========================================
# 1. HTML TEMPLATE (Embedded)
# ==========================================
HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <title>Rover Command Center</title>
    <style>
        body { font-family: Arial, sans-serif; background-color: #1e1e1e; color: #fff; margin: 0; padding: 20px; display: flex; }
        .column-left { flex: 1; padding-right: 20px; }
        .column-right { flex: 1; background: #2d2d2d; padding: 20px; border-radius: 10px; }
        img.camera-feed { width: 100%; border: 3px solid #444; border-radius: 5px; }
        .data-box { background: #3d3d3d; padding: 15px; margin-bottom: 15px; border-radius: 5px; }
        .status-on { color: #4caf50; font-weight: bold; }
        .status-off { color: #f44336; font-weight: bold; }
        h1, h2, h3 { color: #00bcd4; }
    </style>
    <script>
        function updateData() {
            fetch('/data')
                .then(response => response.json())
                .then(data => {
                    document.getElementById('temp').innerText = data.temp + ' °C';
                    document.getElementById('humidity').innerText = data.humidity + ' %';
                    document.getElementById('moisture').innerText = data.moisture;
                    document.getElementById('pitch').innerText = data.pitch + ' °';
                    document.getElementById('roll').innerText = data.roll + ' °';
                    document.getElementById('action').innerText = data.current_action;
                    document.getElementById('precision').innerText = data.precision_mode ? "ON (60%)" : "OFF (100%)";
                    document.getElementById('anti_topple').innerText = data.anti_topple ? "ENABLED" : "DISABLED";
                    document.getElementById('anti_topple').className = data.anti_topple ? "status-on" : "status-off";
                });
        }
        setInterval(updateData, 500); // Fetch data every 500ms
    </script>
</head>
<body>
    <div class="column-left">
        <h1>Rover Camera Feed</h1>
        <img src="/video_feed" class="camera-feed" alt="Logitech C270 Feed">
    </div>
    <div class="column-right">
        <h2>Telemetry & Controls</h2>
        
        <div class="data-box">
            <h3>Current Action</h3>
            <p id="action" style="font-size: 1.2em; color: #ffeb3b;">Idle</p>
        </div>

        <div class="data-box">
            <h3>System Status</h3>
            <p>Precision Mode (Button X): <span id="precision">OFF</span></p>
            <p>Anti-Topple (Button A): <span id="anti_topple">DISABLED</span></p>
        </div>

        <div class="data-box">
            <h3>DHT11 & Moisture</h3>
            <p>Temperature: <span id="temp">--</span></p>
            <p>Humidity: <span id="humidity">--</span></p>
            <p>Soil Moisture (Digital): <span id="moisture">--</span></p>
        </div>

        <div class="data-box">
            <h3>IMU MPU6050</h3>
            <p>Pitch: <span id="pitch">--</span></p>
            <p>Roll: <span id="roll">--</span></p>
        </div>
    </div>
</body>
</html>
"""

# ==========================================
# 2. HARDWARE CONFIGURATION & PIN MAPPING
# ==========================================

# Motor Driver 1 (Wheels/Tank Treads) - L298N
WHEEL_ENA = PWMOutputDevice(17)
WHEEL_IN1 = DigitalOutputDevice(27)
WHEEL_IN2 = DigitalOutputDevice(22)

WHEEL_ENB = PWMOutputDevice(25)
WHEEL_IN3 = DigitalOutputDevice(23)
WHEEL_IN4 = DigitalOutputDevice(24)

# Motor Driver 2 (Arm & Claw) - L298N
# Using BCM 6 (Physical Pin 31)
ARM_ENA = PWMOutputDevice(13)
ARM_IN1 = DigitalOutputDevice(5)
ARM_IN2 = DigitalOutputDevice(6) # Physical Pin 31

CLAW_ENB = PWMOutputDevice(12)
CLAW_IN3 = DigitalOutputDevice(19)
CLAW_IN4 = DigitalOutputDevice(26)

# Sensors
# Assuming DHT11 data on BCM 4
dht_device = adafruit_dht.DHT11(board.D4)
# Assuming standard digital comparator moisture sensor on BCM 16
moisture_sensor = DigitalInputDevice(16) 

# PCA9685 Servo Controller (I2C)
try:
    kit = ServoKit(channels=16)
    servo_x = kit.servo[0]
    servo_y = kit.servo[1]
except Exception as e:
    print(f"PCA9685 Init Error: {e}")

# MPU6050 (I2C)
bus = smbus2.SMBus(1)
MPU_ADDR = 0x68
try:
    bus.write_byte_data(MPU_ADDR, 0x6B, 0) # Wake up MPU6050
except Exception as e:
    print(f"MPU6050 Init Error: {e}")

# ==========================================
# 3. GLOBAL STATE VARIABLES
# ==========================================
state = {
    "temp": "--",
    "humidity": "--",
    "moisture": "Dry",
    "pitch": 0.0,
    "roll": 0.0,
    "precision_mode": False,
    "anti_topple": False,
    "current_action": "Idle",
    "running": True
}

app = Flask(__name__)
camera = cv2.VideoCapture(0) # Logitech C270

# ==========================================
# 4. HELPER FUNCTIONS
# ==========================================
def read_imu():
    try:
        # Read Accelerometer raw data
        accel_xout = read_word_2c(0x3B)
        accel_yout = read_word_2c(0x3D)
        accel_zout = read_word_2c(0x3F)
        
        # Convert to g force
        ax = accel_xout / 16384.0
        ay = accel_yout / 16384.0
        az = accel_zout / 16384.0
        
        # Calculate Pitch and Roll
        pitch = math.atan2(-ax, math.sqrt(ay * ay + az * az)) * 180 / math.pi
        roll = math.atan2(ay, az) * 180 / math.pi
        return round(pitch, 2), round(roll, 2)
    except:
        return 0.0, 0.0

def read_word_2c(reg):
    h = bus.read_byte_data(MPU_ADDR, reg)
    l = bus.read_byte_data(MPU_ADDR, reg+1)
    val = (h << 8) + l
    if val >= 0x8000:
        return -((65535 - val) + 1)
    else:
        return val

def motor_drive(ena, in1, in2, speed):
    """Speed from -1.0 to 1.0"""
    if speed > 0:
        in1.on()
        in2.off()
        ena.value = speed
    elif speed < 0:
        in1.off()
        in2.on()
        ena.value = abs(speed)
    else:
        in1.off()
        in2.off()
        ena.value = 0

def stop_all_motors():
    motor_drive(WHEEL_ENA, WHEEL_IN1, WHEEL_IN2, 0)
    motor_drive(WHEEL_ENB, WHEEL_IN3, WHEEL_IN4, 0)
    motor_drive(ARM_ENA, ARM_IN1, ARM_IN2, 0)
    motor_drive(CLAW_ENB, CLAW_IN3, CLAW_IN4, 0)

# ==========================================
# 5. THREAD: SENSOR POLLING
# ==========================================
def sensor_loop():
    while state["running"]:
        # IMU
        p, r = read_imu()
        state["pitch"] = p
        state["roll"] = r
        
        # Anti-Topple Logic
        if state["anti_topple"] and (abs(p) > 45 or abs(r) > 45):
            stop_all_motors()
            state["current_action"] = "ANTI-TOPPLE TRIGGERED! MOTORS LOCKED."
            time.sleep(1) # Lockout duration
            continue

        # DHT11 (Slow polling, prone to read errors)
        try:
            state["temp"] = dht_device.temperature
            state["humidity"] = dht_device.humidity
        except RuntimeError:
            pass # DHT11 frequently throws runtime errors on read, just pass

        # Moisture (1 = Dry, 0 = Wet usually on these modules)
        state["moisture"] = "Dry" if moisture_sensor.value else "Wet"
        
        time.sleep(0.5)

# ==========================================
# 6. THREAD: GAMEPAD CONTROL
# ==========================================
def gamepad_loop():
    pygame.init()
    pygame.joystick.init()
    
    if pygame.joystick.get_count() == 0:
        print("No gamepad detected!")
        return

    joystick = pygame.joystick.Joystick(0)
    joystick.init()

    servo_x_ang = 90
    servo_y_ang = 90

    while state["running"]:
        pygame.event.pump()
        
        # Toggle Buttons (A = Anti-topple, X = Precision)
        for event in pygame.event.get():
            if event.type == pygame.JOYBUTTONDOWN:
                if event.button == 0: # A Button
                    state["anti_topple"] = not state["anti_topple"]
                elif event.button == 2: # X Button
                    state["precision_mode"] = not state["precision_mode"]

        # If Anti-Topple is currently locked out, ignore inputs
        if state["anti_topple"] and (abs(state["pitch"]) > 45 or abs(state["roll"]) > 45):
            continue

        power_mult = 0.6 if state["precision_mode"] else 1.0
        current_action = "Driving"

        # --- RIGHT JOYSTICK: TANK STEERING ---
        r_x = joystick.get_axis(2) 
        r_y = joystick.get_axis(3)
        
        r_x = 0 if abs(r_x) < 0.15 else r_x
        r_y = 0 if abs(r_y) < 0.15 else r_y

        if r_x < -0.5: # Hard Left
            motor_drive(WHEEL_ENA, WHEEL_IN1, WHEEL_IN2, 0)
            motor_drive(WHEEL_ENB, WHEEL_IN3, WHEEL_IN4, 1.0 * power_mult)
            current_action = "Turning Left"
        elif r_x > 0.5: # Hard Right
            motor_drive(WHEEL_ENA, WHEEL_IN1, WHEEL_IN2, 1.0 * power_mult)
            motor_drive(WHEEL_ENB, WHEEL_IN3, WHEEL_IN4, 0)
            current_action = "Turning Right"
        else:
            motor_drive(WHEEL_ENA, WHEEL_IN1, WHEEL_IN2, -r_y * power_mult)
            motor_drive(WHEEL_ENB, WHEEL_IN3, WHEEL_IN4, -r_y * power_mult)
            if r_y == 0:
                current_action = "Idle"

        # --- D-PAD: ARM AND CLAW ---
        dpad = joystick.get_hat(0)
        if dpad[1] == 1:   # Up
            motor_drive(ARM_ENA, ARM_IN1, ARM_IN2, 1.0 * power_mult)
            current_action = "Arm Up"
        elif dpad[1] == -1: # Down
            motor_drive(ARM_ENA, ARM_IN1, ARM_IN2, -1.0 * power_mult)
            current_action = "Arm Down"
        else:
            motor_drive(ARM_ENA, ARM_IN1, ARM_IN2, 0)

        if dpad[0] == 1:   # Right
            motor_drive(CLAW_ENB, CLAW_IN3, CLAW_IN4, 1.0 * power_mult)
            current_action = "Claw Open"
        elif dpad[0] == -1: # Left
            motor_drive(CLAW_ENB, CLAW_IN3, CLAW_IN4, -1.0 * power_mult)
            current_action = "Claw Close"
        else:
            motor_drive(CLAW_ENB, CLAW_IN3, CLAW_IN4, 0)

        # --- LEFT JOYSTICK: SERVOS (PCA9685) ---
        l_x = joystick.get_axis(0)
        l_y = joystick.get_axis(1)
        
        if abs(l_x) > 0.15:
            servo_x_ang += l_x * 2 
            servo_x_ang = max(0, min(180, servo_x_ang))
            try: servo_x.angle = servo_x_ang; except: pass
            
        if abs(l_y) > 0.15:
            servo_y_ang += l_y * 2
            servo_y_ang = max(0, min(180, servo_y_ang))
            try: servo_y.angle = servo_y_ang; except: pass

        state["current_action"] = current_action
        time.sleep(0.05)

# ==========================================
# 7. FLASK WEB APP
# ==========================================
def generate_frames():
    while state["running"]:
        success, frame = camera.read()
        if not success:
            break
        else:
            ret, buffer = cv2.imencode('.jpg', frame)
            frame_bytes = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

@app.route('/')
def index():
    # Renders the HTML directly from the multiline string variable
    return render_template_string(HTML_TEMPLATE)

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/data')
def get_data():
    return jsonify(state)

def run_flask():
    # suppress Flask output to keep the terminal clean
    import logging
    log = logging.getLogger('werkzeug')
    log.setLevel(logging.ERROR)
    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)

# ==========================================
# 8. LOCAL TKINTER GUI & MAIN EXECUTION
# ==========================================
def update_gui(root, lbl_imu, lbl_dht, lbl_moist):
    if not state["running"]:
        root.destroy()
        return
    
    imu_color = "green" if state["pitch"] != 0.0 else "red"
    dht_color = "green" if state["temp"] != "--" else "red"
    moist_color = "green" if state["moisture"] != "--" else "red"

    lbl_imu.config(text=f"IMU Data: Pitch {state['pitch']}, Roll {state['roll']}", fg=imu_color)
    lbl_dht.config(text=f"DHT11: Temp {state['temp']}, Hum {state['humidity']}", fg=dht_color)
    lbl_moist.config(text=f"Moisture: {state['moisture']}", fg=moist_color)
    
    root.after(500, update_gui, root, lbl_imu, lbl_dht, lbl_moist)

def stop_program():
    print("Initiating shutdown...")
    state["running"] = False
    stop_all_motors()
    camera.release()
    pygame.quit()

if __name__ == '__main__':
    # Start Threads
    threading.Thread(target=sensor_loop, daemon=True).start()
    threading.Thread(target=gamepad_loop, daemon=True).start()
    threading.Thread(target=run_flask, daemon=True).start()

    # Setup Local GUI (Must run on main thread)
    root = tk.Tk()
    root.title("Rover Local Status")
    root.geometry("400x250")
    root.configure(bg="#222")

    tk.Label(root, text="Sensor Status", fg="white", bg="#222", font=("Arial", 16, "bold")).pack(pady=10)
    
    lbl_imu = tk.Label(root, text="IMU Data: --", bg="#222", font=("Arial", 12))
    lbl_imu.pack()
    
    lbl_dht = tk.Label(root, text="DHT11: --", bg="#222", font=("Arial", 12))
    lbl_dht.pack()
    
    lbl_moist = tk.Label(root, text="Moisture: --", bg="#222", font=("Arial", 12))
    lbl_moist.pack()

    btn_stop = tk.Button(root, text="EMERGENCY STOP / EXIT", bg="red", fg="white", font=("Arial", 12, "bold"), command=stop_program)
    btn_stop.pack(pady=20)

    # Start GUI loop
    print("Starting Rover System...")
    print("Web Interface running at: http://<PI_IP>:5000")
    root.after(500, update_gui, root, lbl_imu, lbl_dht, lbl_moist)
    root.mainloop()

    # Cleanup after window closes
    stop_program()
