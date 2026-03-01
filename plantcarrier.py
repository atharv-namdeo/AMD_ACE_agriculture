import cv2
import RPi.GPIO as GPIO
import threading
import time
import evdev
from evdev import ecodes
import os
import tkinter as tk
from flask import Flask, render_template_string, Response, jsonify

# ==========================================
# 1. HARDWARE CONFIGURATION
# ==========================================
GPIO.setmode(GPIO.BCM)
GPIO.setwarnings(False)

# Left Bank of Motors
IN1_L = 17; IN2_L = 27; ENA_L = 22
# Right Bank of Motors
IN3_R = 23; IN4_R = 24; ENB_R = 25

# Payload Pins
PUMP_PIN = 5

# Setup Motor Pins
motor_pins = [IN1_L, IN2_L, ENA_L, IN3_R, IN4_R, ENB_R]
for pin in motor_pins:
    GPIO.setup(pin, GPIO.OUT)
    GPIO.output(pin, GPIO.LOW)

# Setup Pump Pin (START OFF using High-Z Input trick)
GPIO.setup(PUMP_PIN, GPIO.IN)

pwm_l = GPIO.PWM(ENA_L, 1000); pwm_l.start(0)
pwm_r = GPIO.PWM(ENB_R, 1000); pwm_r.start(0)

# ==========================================
# 2. ROVER STATES & LOGIC
# ==========================================
current_action = "SYSTEM IDLE"
action_color = "#aaaaaa"
speed_multiplier = 1.0  
current_gear = 6
pump_active = False

def stop_motors():
    GPIO.output(IN1_L, GPIO.LOW); GPIO.output(IN2_L, GPIO.LOW)
    GPIO.output(IN3_R, GPIO.LOW); GPIO.output(IN4_R, GPIO.LOW)
    pwm_l.ChangeDutyCycle(0)
    pwm_r.ChangeDutyCycle(0)

def set_motors(left_speed, right_speed):
    if left_speed > 0:
        GPIO.output(IN1_L, GPIO.HIGH); GPIO.output(IN2_L, GPIO.LOW)
    elif left_speed < 0:
        GPIO.output(IN1_L, GPIO.LOW); GPIO.output(IN2_L, GPIO.HIGH)
    else:
        GPIO.output(IN1_L, GPIO.LOW); GPIO.output(IN2_L, GPIO.LOW)
    pwm_l.ChangeDutyCycle(abs(left_speed) * speed_multiplier)

    if right_speed > 0:
        GPIO.output(IN3_R, GPIO.HIGH); GPIO.output(IN4_R, GPIO.LOW)
    elif right_speed < 0:
        GPIO.output(IN3_R, GPIO.LOW); GPIO.output(IN4_R, GPIO.HIGH)
    else:
        GPIO.output(IN3_R, GPIO.LOW); GPIO.output(IN4_R, GPIO.LOW)
    pwm_r.ChangeDutyCycle(abs(right_speed) * speed_multiplier)

# ==========================================
# 3. DIRECT KEYBOARD THREAD (BULLETPROOF)
# ==========================================
KEYBOARD_PATH = '/dev/input/event5'

def keyboard_thread():
    global current_action, action_color, speed_multiplier, pump_active, current_gear
    
    while True:
        try:
            kb = evdev.InputDevice(KEYBOARD_PATH)
            print(f"✅ OPTIMUS KEYBOARD LOCKED: {kb.name}")
            
            for event in kb.read_loop():
                if event.type == ecodes.EV_KEY:
                    key_event = evdev.categorize(event)
                    
                    # Force keycode into a list so it never fails matching
                    kc = key_event.keycode
                    keys = kc if isinstance(kc, list) else [kc]
                    
                    if key_event.keystate == 1: # Key Down
                        if 'KEY_1' in keys: speed_multiplier = 0.5; current_gear = 1
                        elif 'KEY_2' in keys: speed_multiplier = 0.6; current_gear = 2
                        elif 'KEY_3' in keys: speed_multiplier = 0.7; current_gear = 3
                        elif 'KEY_4' in keys: speed_multiplier = 0.8; current_gear = 4
                        elif 'KEY_5' in keys: speed_multiplier = 0.9; current_gear = 5
                        elif 'KEY_6' in keys: speed_multiplier = 1.0; current_gear = 6
                        
                        elif 'KEY_W' in keys or 'KEY_UP' in keys:
                            set_motors(100, 100)
                            current_action, action_color = f"DRIVING FORWARD [G{current_gear}] ⬆️", "#00ff00"
                        elif 'KEY_S' in keys or 'KEY_DOWN' in keys:
                            set_motors(-100, -100)
                            current_action, action_color = f"REVERSING [G{current_gear}] ⬇️", "#ff3333"
                        elif 'KEY_A' in keys or 'KEY_LEFT' in keys:
                            set_motors(0, 100)
                            current_action, action_color = "SWING LEFT ⬅️", "#ffaa00"
                        elif 'KEY_D' in keys or 'KEY_RIGHT' in keys:
                            set_motors(100, 0)
                            current_action, action_color = "SWING RIGHT ➡️", "#ffaa00"
                        elif 'KEY_Q' in keys:
                            set_motors(-100, 100)
                            current_action, action_color = "PIVOT LEFT 🔄", "#cc00ff"
                        elif 'KEY_E' in keys:
                            set_motors(100, -100)
                            current_action, action_color = "PIVOT RIGHT 🔄", "#cc00ff"
                            
                        # --- HIGH-Z PUMP LOGIC ---
                        elif 'KEY_R' in keys:
                            pump_active = not pump_active
                            if pump_active:
                                GPIO.setup(PUMP_PIN, GPIO.OUT)
                                GPIO.output(PUMP_PIN, GPIO.LOW) # Turn ON
                                current_action, action_color = "WATER PUMP ACTIVE 💦", "#00ccff"
                            else:
                                GPIO.setup(PUMP_PIN, GPIO.IN) # Turn OFF (High-Z trick)
                                current_action, action_color = "SYSTEM IDLE", "#aaaaaa"

                    elif key_event.keystate == 0: # Key Released
                        stop_keys = ['KEY_W', 'KEY_S', 'KEY_A', 'KEY_D', 'KEY_Q', 'KEY_E', 'KEY_UP', 'KEY_DOWN', 'KEY_LEFT', 'KEY_RIGHT']
                        if any(k in stop_keys for k in keys):
                            stop_motors()
                            current_action, action_color = "SYSTEM IDLE", "#aaaaaa"
                            
        except Exception as e:
            print(f"Searching for keyboard at {KEYBOARD_PATH}...")
            time.sleep(2)

threading.Thread(target=keyboard_thread, daemon=True).start()

# ==========================================
# 4. SPECTATOR WEB SERVER & CAMERA
# ==========================================
app = Flask(__name__)
camera = cv2.VideoCapture(0)

HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <title>Black Rover - Leader Dashboard</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { background-color: #050505; color: white; font-family: 'Segoe UI', sans-serif; margin: 0; height: 100vh; display: flex; overflow: hidden; }
        .video-container { flex: 1; padding: 20px; display: flex; flex-direction: column; }
        .header { font-size: 24px; font-weight: bold; color: #ffaa00; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 2px; }
        .video-stream { flex: 1; width: 100%; object-fit: contain; border: 3px solid #333; border-radius: 8px; background: #000; }
        .dashboard { width: 350px; background-color: #121212; border-left: 2px solid #222; padding: 20px; display: flex; flex-direction: column; justify-content: space-between; }
        .section-title { font-size: 14px; color: #00ccff; font-weight: bold; margin-bottom: 5px; }
        .action-box { background-color: #000; border: 1px solid #333; border-radius: 6px; padding: 15px; text-align: center; font-family: monospace; font-size: 20px; font-weight: bold; margin-bottom: 20px; }
        .status-text { font-family: monospace; font-size: 16px; margin-bottom: 10px; font-weight: bold; }
        .legend-box { background-color: #1a1a1a; border: 1px solid #333; border-radius: 6px; padding: 15px; margin-top: auto; border-left: 4px solid #ffaa00;}
        .legend-title { font-size: 14px; font-weight: bold; margin-bottom: 10px; color: #ffaa00; }
        .legend-item { font-size: 14px; color: #ddd; margin-bottom: 8px; font-family: monospace; }
        .key-highlight { color: #00ccff; font-weight: bold; }
        .key-gear { color: #ff33ff; font-weight: bold; }
    </style>
</head>
<body>
    <div class="video-container">
        <div class="header">⬛ BLACK ROVER (LEADER) - LIVE FEED</div>
        <img class="video-stream" src="{{ url_for('video_feed') }}">
    </div>
    <div class="dashboard">
        <div>
            <div class="section-title">⚡ CURRENT COMMAND</div>
            <div class="action-box" id="action-display">SYSTEM IDLE</div>
            
            <div class="section-title" style="color: #00ff00;">🔧 SYSTEM STATUS</div>
            <div class="status-text" id="gear-display">Transmission: GEAR 6 (100%)</div>
            <div class="status-text" id="pump-display">Water Pump: OFF</div>
        </div>
        
        <div class="legend-box">
            <div class="legend-title">HARDWARE CONTROL ACTIVE</div>
            <div class="legend-item"><span class="key-highlight">[W/A/S/D] or [ARROWS]</span> Standard Drive</div>
            <div class="legend-item"><span class="key-highlight">[Q/E]</span> Zero-Turn Pivot</div>
            <div class="legend-item"><span class="key-gear">[1 - 6]</span> Shift Gears (50% to 100%)</div>
            <div class="legend-item"><span style="color:#00ff00; font-weight:bold;">[R]</span> Toggle Water Pump</div>
        </div>
    </div>

    <script>
        setInterval(function() {
            fetch('/telemetry')
                .then(response => response.json())
                .then(data => {
                    let actionBox = document.getElementById('action-display');
                    actionBox.innerText = data.action; 
                    actionBox.style.color = data.color;
                    document.getElementById('gear-display').innerText = "Transmission: GEAR " + data.gear + " (" + (data.speed * 100) + "%)";
                    let pumpStatus = document.getElementById('pump-display');
                    pumpStatus.innerText = "Water Pump: " + (data.pump ? "ACTIVE 💦" : "OFF");
                    pumpStatus.style.color = data.pump ? "#00ccff" : "#ffffff";
                });
        }, 100); 
    </script>
</body>
</html>
"""

def generate_frames():
    while True:
        success, frame = camera.read()
        if not success: 
            time.sleep(0.1)
            continue
        frame = cv2.resize(frame, (640, 480))
        ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
        yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')

@app.route('/')
def index(): return render_template_string(HTML_TEMPLATE)

@app.route('/video_feed')
def video_feed(): return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/telemetry')
def telemetry():
    return jsonify({"action": current_action, "color": action_color, "pump": pump_active, "speed": speed_multiplier, "gear": current_gear})

def run_flask():
    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)

threading.Thread(target=run_flask, daemon=True).start()

# ==========================================
# 5. LOCAL TKINTER GUI (MAIN THREAD)
# ==========================================
def shutdown_system():
    print("EMERGENCY STOP: Shutting down hardware...")
    stop_motors()
    GPIO.setup(PUMP_PIN, GPIO.IN) # Ensure Pump is OFF
    if camera.isOpened(): camera.release()
    GPIO.cleanup()
    root.destroy()
    os._exit(0)

def update_gui():
    action_label.config(text=f"Action: {current_action}", fg=action_color)
    gear_label.config(text=f"Current Gear: {current_gear} ({int(speed_multiplier*100)}%)")
    pump_text = "Water Pump: ACTIVE 💦" if pump_active else "Water Pump: OFF"
    pump_color = "#00ccff" if pump_active else "#aaaaaa"
    pump_label.config(text=pump_text, fg=pump_color)
    root.after(100, update_gui)

root = tk.Tk()
root.title("Black Rover Leader - Local Dash")
root.geometry("600x400")
root.configure(bg="#121212")

title_label = tk.Label(root, text="⬛ BLACK ROVER LEADER", font=("Segoe UI", 24, "bold"), bg="#121212", fg="#ffaa00")
title_label.pack(pady=15)
gear_label = tk.Label(root, text="Current Gear: 6 (100%)", font=("Courier New", 18), bg="#121212", fg="#ffffff")
gear_label.pack(pady=5)
pump_label = tk.Label(root, text="Water Pump: OFF", font=("Courier New", 18, "bold"), bg="#121212", fg="#aaaaaa")
pump_label.pack(pady=5)
action_label = tk.Label(root, text="Action: SYSTEM IDLE", font=("Courier New", 16, "bold"), bg="#121212", fg="#aaaaaa")
action_label.pack(pady=20)

stop_btn = tk.Button(root, text="STOP SYSTEM", font=("Segoe UI", 20, "bold"), bg="#ff3333", fg="white", command=shutdown_system, height=2, width=15)
stop_btn.pack(side=tk.BOTTOM, pady=30)

update_gui()
root.mainloop()
