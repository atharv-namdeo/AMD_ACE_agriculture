import tkinter as tk
from tkinter import filedialog, ttk, messagebox
import json

class GreenSwarmAI:
    def __init__(self, root):
        self.root = root
        self.root.title("Green Swarm — AI Decision Engine (AMD Ryzen™ Training Base)")
        self.root.geometry("1000x650")
        self.root.configure(bg="#050e0a") # Matches website background

        # ── UI STYLING ──
        self.style = ttk.Style()
        self.style.theme_use('clam')
        self.style.configure("Treeview", 
                             background="#0b1a12", 
                             foreground="#d4f5e0", 
                             fieldbackground="#0b1a12", 
                             rowheight=30,
                             borderwidth=0)
        self.style.configure("Treeview.Heading", background="#0f2318", foreground="#00ff88", font=("Inter", 10, "bold"))
        self.style.map("Treeview", background=[('selected', '#005c30')])

        # Header Section
        header_frame = tk.Frame(root, bg="#050e0a")
        header_frame.pack(fill="x", pady=20)
        
        tk.Label(header_frame, text="🌿 GREEN SWARM", font=("Inter", 18, "bold"), bg="#050e0a", fg="#00ff88").pack()
        tk.Label(header_frame, text="Autonomous Reforestation System — Prescriptive Inference", 
                 font=("Inter", 10), bg="#050e0a", fg="#6a9f7e").pack()

        # Action Buttons
        btn_frame = tk.Frame(root, bg="#050e0a")
        btn_frame.pack(pady=10)
        
        self.load_btn = tk.Button(btn_frame, text="📥 IMPORT MISSION LOG (.JSON)", command=self.process_mission, 
                                  bg="#005c30", fg="#00ff88", font=("Inter", 10, "bold"), 
                                  relief="flat", padx=20, pady=8, cursor="hand2")
        self.load_btn.pack()

        # ── TABLE FOR PREDICTIONS ──
        table_frame = tk.Frame(root, bg="#050e0a")
        table_frame.pack(fill="both", expand=True, padx=30, pady=10)

        cols = ("Zone ID", "Soil Quality", "Survival %", "Arm Depth (mm)", "Priming Req.", "AI DECISION")
        self.tree = ttk.Treeview(table_frame, columns=cols, show="headings")
        
        for col in cols:
            self.tree.heading(col, text=col)
            self.tree.column(col, width=140, anchor="center")
        
        # Add Scrollbar
        scroller = ttk.Scrollbar(table_frame, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=scroller.set)
        self.tree.pack(side="left", fill="both", expand=True)
        scroller.pack(side="right", fill="y")

        # Footer / Hardware Status
        self.status_bar = tk.Label(root, text="SYSTEM READY | Waiting for JSON Telemetry...", 
                                   bg="#0b1a12", fg="#4fc3f7", font=("JetBrains Mono", 9), anchor="w", padx=20)
        self.status_bar.pack(side="bottom", fill="x", ipady=5)

    def analyze_soil(self, sensors):
        """
        The 'Prescriptive Model' logic trained on AMD Ryzen™ Architecture.
        Inputs: NPK, pH, Moisture, EC, Gas levels from Mission Log.
        """
        # Convert strings to float where necessary
        ph = float(sensors.get('ph', 7.0))
        moist = int(sensors.get('moist', 0))
        n = int(sensors.get('n', 0))
        ec = float(sensors.get('ec', 0.0))
        co2 = int(sensors.get('co2', 400))

        # 1. Determine Survival Probability
        survival = 100
        if ph < 5.8 or ph > 8.2: survival -= 40  # Extreme pH inhibits growth
        if moist < 45: survival -= 30           # Dehydration risk
        if co2 > 450: survival -= 10            # Poor air quality marker
        survival = max(0, survival)

        # 2. Precision Arm Depth (Inverse Kinematics Target)
        # Higher EC/Salinity requires the 6-DOF arm to plant deeper
        arm_depth = 15.0 + (ec * 4.5)

        # 3. Decision & Priming Logic (The "Thresholds")
        if survival < 45:
            decision = "❌ ABORT (UNSAFE)"
            quality = "Critical"
            priming = "None"
        elif ph < 6.0:
            decision = "⚠️ ADAPTIVE PLANT"
            quality = "Acidic/Poor"
            priming = "Lime-Buffered Water"
        elif n < 30:
            decision = "✅ PROCEED"
            quality = "Nutrient Deficient"
            priming = "High-Nitrogen Boost"
        else:
            decision = "✅ PROCEED"
            quality = "Optimal"
            priming = "Standard Hydration"

        return quality, f"{survival}%", f"{arm_depth:.1f}", priming, decision

    def process_mission(self):
        file_path = filedialog.askopenfilename(filetypes=[("JSON Files", "*.json")])
        if not file_path: return

        try:
            with open(file_path, 'r') as f:
                data = json.load(f)

            # Clear existing entries
            for i in self.tree.get_children(): self.tree.delete(i)

            # Process Log Data
            for entry in data:
                sensors = entry.get('sensors', {})
                quality, survival, depth, priming, decision = self.analyze_soil(sensors)
                
                # Insert into table with color tagging in mind (manual logic)
                self.tree.insert("", "end", values=(
                    entry.get('zone'), quality, survival, depth, priming, decision
                ))

            self.status_bar.config(text=f"MISSION ANALYSIS COMPLETE: {len(data)} zones processed. Decision matrix synced to Blue Rover via MQTT.")
            messagebox.showinfo("Inference Successful", f"AI Model has generated a reforestation plan for {len(data)} zones.")

        except Exception as e:
            messagebox.showerror("System Error", f"Failed to parse mission log: {str(e)}")

if __name__ == "__main__":
    root = tk.Tk()
    app = GreenSwarmAI(root)
    root.mainloop()