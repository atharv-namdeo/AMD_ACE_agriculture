
        // ── CLOCK ──
        function updateClock() { document.getElementById('clock').textContent = new Date().toLocaleTimeString(); }
        setInterval(updateClock, 1000); updateClock();

        // ── MAP ──
        const map = L.map('agriMap', { zoomControl: true, attributionControl: false }).setView([20.5937, 78.9629], 2);

        // Free tile layers — no API key required
        const tileLayers = {
            satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: '© Esri, Maxar, Earthstar Geographics', maxZoom: 20
            }),
            dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '©OpenStreetMap ©CartoDB', subdomains: 'abcd', maxZoom: 20
            }),
            terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
                attribution: '©OpenTopoMap ©OSM', subdomains: 'abc', maxZoom: 17
            })
        };
        // Satellite is default — best for field analysis
        tileLayers.satellite.addTo(map);
        let activeLayer = 'satellite';

        // Custom tile switcher
        const tileCtrl = L.control({ position: 'topright' });
        tileCtrl.onAdd = function () {
            const wrap = L.DomUtil.create('div', '');
            wrap.style.cssText = 'display:flex;flex-direction:column;gap:4px;';
            const btns = [
                { key: 'satellite', label: '🛰️ Satellite' },
                { key: 'dark', label: '🌑 Dark' },
                { key: 'terrain', label: '🏔️ Terrain' }
            ];
            btns.forEach(b => {
                const btn = L.DomUtil.create('button', '', wrap);
                btn.textContent = b.label;
                btn.id = 'tileBtn_' + b.key;
                btn.style.cssText = `
                    background:${b.key === 'satellite' ? '#005c30' : 'rgba(5,14,10,.88)'};
                    color:${b.key === 'satellite' ? '#00ff88' : '#8ab99a'};
                    border:1px solid ${b.key === 'satellite' ? '#00ff88' : '#1a3d26'};
                    border-radius:7px;padding:5px 11px;font-size:11px;font-family:Inter,sans-serif;
                    cursor:pointer;white-space:nowrap;backdrop-filter:blur(8px);
                    font-weight:${b.key === 'satellite' ? '700' : '400'};
                    transition:all .15s;`;
                L.DomEvent.on(btn, 'click', function (e) {
                    L.DomEvent.stopPropagation(e);
                    map.removeLayer(tileLayers[activeLayer]);
                    tileLayers[b.key].addTo(map);
                    // Push tile layer to bottom so markers stay on top
                    tileLayers[b.key].bringToBack();
                    activeLayer = b.key;
                    btns.forEach(x => {
                        const el = document.getElementById('tileBtn_' + x.key);
                        const active = x.key === b.key;
                        el.style.background = active ? '#005c30' : 'rgba(5,14,10,.88)';
                        el.style.color = active ? '#00ff88' : '#8ab99a';
                        el.style.border = `1px solid ${active ? '#00ff88' : '#1a3d26'}`;
                        el.style.fontWeight = active ? '700' : '400';
                    });
                });
                L.DomEvent.disableClickPropagation(wrap);
            });
            return wrap;
        };
        tileCtrl.addTo(map);

        // ── ENTITY ICONS ──
        const blueRoverIcon = L.divIcon({
            html: `<div title="Blue Rover — Surveillance" style="
                width:26px;height:26px;border-radius:5px;
                background:#1565c0;border:2px solid #90caf9;
                box-shadow:0 0 14px #1976d2,0 0 4px #90caf9;
                display:flex;align-items:center;justify-content:center;
                font-size:13px;cursor:pointer;">🔵</div>`,
            className: '', iconAnchor: [13, 13]
        });
        const blackRoverIcon = L.divIcon({
            html: `<div title="Black Rover — Fertilizer" style="
                width:26px;height:26px;border-radius:5px;
                background:#1a1a1a;border:2px solid #616161;
                box-shadow:0 0 12px #424242;
                display:flex;align-items:center;justify-content:center;
                font-size:13px;cursor:pointer;">⚫</div>`,
            className: '', iconAnchor: [13, 13]
        });
        const droneIcon = L.divIcon({
            html: `<div title="Drone — Visual Surveillance" style="
                width:28px;height:28px;border-radius:50%;
                background:#00c96a;border:2px solid #00ff88;
                box-shadow:0 0 18px #00ff88,0 0 6px #00ff88;
                display:flex;align-items:center;justify-content:center;
                font-size:14px;cursor:pointer;animation:droneGlow 1.4s infinite alternate;">✈️</div>`,
            className: '', iconAnchor: [14, 14]
        });

        // ── GEOLOCATION — centre map at user's real location ──
        let originLat = 20.5937, originLng = 78.9629; // fallback

        // Starting positions (relative offsets from origin, filled after geo)
        let bRoverPos = [originLat - 0.0005, originLng - 0.0005];
        let blRoverPos = [originLat + 0.0007, originLng + 0.0009];
        let dronePos = [originLat, originLng];

        const blueRoverMarker = L.marker(bRoverPos, { icon: blueRoverIcon, zIndexOffset: 500 }).addTo(map)
            .bindTooltip('🔵 Scout Rover — Collecting sensor data', { permanent: false, direction: 'top', className: 'leaflet-tt' });
        const blackRoverMarker = L.marker(blRoverPos, { icon: blackRoverIcon, zIndexOffset: 500 }).addTo(map)
            .bindTooltip('⚫ Fertilizer Rover — Deploying bullets', { permanent: false, direction: 'top', className: 'leaflet-tt' });
        const droneMarker = L.marker(dronePos, { icon: droneIcon, zIndexOffset: 600 }).addTo(map)
            .bindTooltip('✈️ Surveillance Drone — Live feed active', { permanent: false, direction: 'top', className: 'leaflet-tt' });



        function initLocation(lat, lng) {
            originLat = lat; originLng = lng;
            map.setView([lat, lng], 17);

            // Reposition entities relative to real location
            bRoverPos = [lat - 0.0005, lng - 0.0005];
            blRoverPos = [lat + 0.0007, lng + 0.0009];
            dronePos = [lat + 0.0003, lng - 0.0003];
            blueRoverMarker.setLatLng(bRoverPos);
            blackRoverMarker.setLatLng(blRoverPos);
            droneMarker.setLatLng(dronePos);

            // Clear old trails
            bRoverTrail = []; blRoverTrail = []; droneTrail = [];
            bRoverLine.setLatLngs([]); blRoverLine.setLatLngs([]); droneLine.setLatLngs([]);

            showToast('�️ Map centred at field coordinates');
        }

        // Geolocation disabled — use default field coordinates
        // (called AFTER trail variables are declared below)

        // Trails
        let bRoverTrail = [];
        let blRoverTrail = [];
        let droneTrail = [];
        const bRoverLine = L.polyline([], { color: '#1976d2', weight: 2, opacity: .5, dashArray: '4 6' }).addTo(map);
        const blRoverLine = L.polyline([], { color: '#757575', weight: 2, opacity: .4, dashArray: '4 6' }).addTo(map);
        const droneLine = L.polyline([], { color: '#00ff88', weight: 1.5, opacity: .4, dashArray: '3 8' }).addTo(map);

        // Now safe to call — trails are declared
        initLocation(originLat, originLng);

        // Map legend overlay
        const legendCtrl = L.control({ position: 'bottomleft' });
        legendCtrl.onAdd = function () {
            const d = L.DomUtil.create('div', '');
            d.style.cssText = 'background:rgba(5,14,10,.88);backdrop-filter:blur(8px);border:1px solid #005c30;border-radius:10px;padding:10px 14px;font-size:11px;font-family:Inter,sans-serif;color:#d4f5e0;min-width:160px;';
            d.innerHTML = `
                <div style="font-size:9px;color:#6a9f7e;letter-spacing:.6px;margin-bottom:7px;text-transform:uppercase">Map Entities</div>
                <div style="display:flex;align-items:center;gap:7px;margin:4px 0"><span style="width:12px;height:12px;background:#1565c0;border-radius:3px;display:inline-block;box-shadow:0 0 6px #1976d2"></span>Scout Rover</div>
                <div style="display:flex;align-items:center;gap:7px;margin:4px 0"><span style="width:12px;height:12px;background:#1a1a1a;border:1.5px solid #616161;border-radius:3px;display:inline-block"></span>Fertilizer Rover</div>
                <div style="display:flex;align-items:center;gap:7px;margin:4px 0"><span style="width:12px;height:12px;background:#00ff88;border-radius:50%;display:inline-block;box-shadow:0 0 6px #00ff88"></span>Surveillance Drone</div>
                <hr style="border-color:#1a3d26;margin:6px 0"/>
                <div style="display:flex;align-items:center;gap:7px;margin:4px 0"><span style="width:12px;height:4px;background:#ff4444;border-radius:2px;display:inline-block"></span>High Need</div>
                <div style="display:flex;align-items:center;gap:7px;margin:4px 0"><span style="width:12px;height:4px;background:#ffb300;border-radius:2px;display:inline-block"></span>Medium</div>
                <div style="display:flex;align-items:center;gap:7px;margin:4px 0"><span style="width:12px;height:4px;background:#00ff88;border-radius:2px;display:inline-block"></span>Low Need</div>
                <div style="display:flex;align-items:center;gap:7px;margin:4px 0"><span style="width:12px;height:4px;background:#4fc3f7;border-radius:2px;display:inline-block"></span>Fertilized</div>`;
            L.DomEvent.disableClickPropagation(d);
            return d;
        };
        legendCtrl.addTo(map);

        // ══════════════════════════════════════════════════════════
        //  MOVEMENT ALGORITHMS
        // ══════════════════════════════════════════════════════════

        // ── 1. BLACK FERTILIZER ROVER — patrols between marked zones ──
        let fertTarget = null;   // current target zone index
        let fertDwell = 0;      // ticks dwelling at a zone

        function moveBlackRover() {
            // Build list of unfertilized zone positions
            const targets = zones.filter(z => !z.fertilized).map(z => [z.lat, z.lng]);

            if (targets.length === 0) {
                // No zones — idle with gentle drift near origin
                const t = Date.now() / 9000;
                blRoverPos = [
                    originLat + Math.sin(t) * 0.00015,
                    originLng + Math.cos(t) * 0.00015
                ];
                blackRoverMarker.setLatLng(blRoverPos);
                blackRoverMarker.setTooltipContent('⚫ Fertilizer Rover — Standby (no zones)');
                return;
            }

            // Clamp target index
            if (fertTarget === null || fertTarget >= targets.length) fertTarget = 0;

            const goal = targets[fertTarget];
            const cur = blRoverPos;
            const dlat = goal[0] - cur[0];
            const dlng = goal[1] - cur[1];
            const dist = Math.sqrt(dlat * dlat + dlng * dlng);

            if (dist < 0.00008) {
                // Arrived — dwell for a few ticks then move to next zone
                fertDwell++;
                if (fertDwell > 5) {
                    fertDwell = 0;
                    fertTarget = (fertTarget + 1) % targets.length;
                }
                blackRoverMarker.setTooltipContent(`⚫ Fertilizer Rover — 🌿 Fertilizing zone ${fertTarget + 1}/${targets.length}`);
            } else {
                // Step toward goal (speed = 0.00004 per tick)
                const speed = 0.00004;
                blRoverPos = [
                    cur[0] + (dlat / dist) * speed,
                    cur[1] + (dlng / dist) * speed
                ];
                blackRoverMarker.setLatLng(blRoverPos);
                blackRoverMarker.setTooltipContent(`⚫ Fertilizer Rover — 🚗 En route to zone ${fertTarget + 1}/${targets.length}`);
            }

            blRoverTrail.push([...blRoverPos]);
            if (blRoverTrail.length > 200) blRoverTrail.shift();
            blRoverLine.setLatLngs(blRoverTrail);
        }


        // ── 2. SURVEILLANCE MODE — coordinated drone + blue rover sweep ──
        let survZone = null;   // { minLat, maxLat, minLng, maxLng }
        let survActive = false;
        let survStrips = [];     // pre-computed waypoints
        let survDroneIdx = 0;
        let survRoverIdx = 0;
        let survDroneCompleted = false;
        let survRoverCompleted = false;
        let survRectLayer = null;
        let survProgress = 0;

        // Build lawnmower strips for an area, split in half for two agents
        function buildSurvStrips(bbox, numStrips) {
            const strips = [];
            const latStep = (bbox.maxLat - bbox.minLat) / numStrips;
            for (let i = 0; i <= numStrips; i++) {
                const lat = bbox.minLat + i * latStep;
                // Alternate left-right each row
                if (i % 2 === 0) strips.push([lat, bbox.minLng], [lat, bbox.maxLng]);
                else strips.push([lat, bbox.maxLng], [lat, bbox.minLng]);
            }
            return strips;
        }

        function startSurveillance(bbox) {
            survZone = bbox;
            survActive = true;
            const total = 18;

            const allStrips = buildSurvStrips(bbox, total);
            const half = Math.floor(allStrips.length / 2);
            survStrips = allStrips;
            survDroneIdx = 0;
            survRoverIdx = half;
            survDroneCompleted = false;
            survRoverCompleted = false;
            survProgress = 0;

            document.getElementById('survStatus').textContent = '🔴 SCANNING — Drone + Scout Rover active';
            document.getElementById('survStatus').style.color = '#ff4444';
            document.getElementById('survBar').style.width = '0%';
            showToast('📡 Surveillance started — Drone + Scout Rover sweeping area');
        }

        function stepSurveillance() {
            if (!survActive) return;

            const speed = 0.00008;

            // Drone moves through top half
            if (!survDroneCompleted && survDroneIdx < survStrips.length) {
                const goal = survStrips[survDroneIdx];
                const dlat = goal[0] - dronePos[0];
                const dlng = goal[1] - dronePos[1];
                const dist = Math.sqrt(dlat * dlat + dlng * dlng);
                if (dist < 0.00006) {
                    survDroneIdx++;
                    if (survDroneIdx >= Math.floor(survStrips.length / 2)) survDroneCompleted = true;
                } else {
                    dronePos = [dronePos[0] + (dlat / dist) * speed * 1.3, dronePos[1] + (dlng / dist) * speed * 1.3];
                }
                droneMarker.setLatLng(dronePos);
                droneTrail.push([...dronePos]);
                if (droneTrail.length > 200) droneTrail.shift();
                droneLine.setLatLngs(droneTrail);
            } else {
                survDroneCompleted = true;
            }

            // Blue rover moves through bottom half in reverse
            if (!survRoverCompleted && survRoverIdx < survStrips.length) {
                const goal = survStrips[survRoverIdx];
                const dlat = goal[0] - bRoverPos[0];
                const dlng = goal[1] - bRoverPos[1];
                const dist = Math.sqrt(dlat * dlat + dlng * dlng);
                if (dist < 0.00006) {
                    survRoverIdx++;
                    if (survRoverIdx >= survStrips.length) survRoverCompleted = true;
                } else {
                    bRoverPos = [bRoverPos[0] + (dlat / dist) * speed, bRoverPos[1] + (dlng / dist) * speed];
                }
                blueRoverMarker.setLatLng(bRoverPos);
                bRoverTrail.push([...bRoverPos]);
                if (bRoverTrail.length > 200) bRoverTrail.shift();
                bRoverLine.setLatLngs(bRoverTrail);
            } else {
                survRoverCompleted = true;
            }

            // Progress
            const done = (survDroneIdx + (survRoverIdx - Math.floor(survStrips.length / 2)));
            survProgress = Math.min(100, Math.round(done / survStrips.length * 100));
            document.getElementById('survBar').style.width = survProgress + '%';
            document.getElementById('survPct').textContent = survProgress + '%';

            if (survDroneCompleted && survRoverCompleted) {
                survActive = false;
                document.getElementById('survStatus').textContent = '✅ COMPLETE';
                document.getElementById('survStatus').style.color = '#00ff88';
                document.getElementById('survBar').style.width = '100%';
                document.getElementById('survPct').textContent = '100%';
                showToast('✅ Surveillance complete — Area fully scanned!');
            }
        }

        // ── Default free-roam for blue rover + drone when no surveillance ──
        let entityTick = 0;
        function moveFreeRoam() {
            entityTick++;
            const t = entityTick * 0.018;
            const oL = originLat, oG = originLng;

            bRoverPos = [
                oL + Math.sin(t * 0.7) * 0.003 + Math.cos(t * 1.3) * 0.001,
                oG + Math.cos(t * 0.5) * 0.003 + Math.sin(t * 0.9) * 0.001
            ];
            blueRoverMarker.setLatLng(bRoverPos);
            bRoverTrail.push([...bRoverPos]);
            if (bRoverTrail.length > 120) bRoverTrail.shift();
            bRoverLine.setLatLngs(bRoverTrail);

            dronePos = [
                oL + Math.sin(t * 0.55 + 2.0) * 0.0045 + Math.sin(t * 1.8) * 0.0005,
                oG + Math.cos(t * 0.48 + 1.5) * 0.0048 + Math.cos(t * 1.6) * 0.0005
            ];
            droneMarker.setLatLng(dronePos);
            droneTrail.push([...dronePos]);
            if (droneTrail.length > 80) droneTrail.shift();
            droneLine.setLatLngs(droneTrail);
        }

        // Master tick
        function moveEntities() {
            moveBlackRover();
            if (survActive) stepSurveillance();
            else moveFreeRoam();
        }
        setInterval(moveEntities, 700);

        // State
        let currentTool = 'mark';
        let currentLevel = 'high';
        let zones = [];
        let heatmapVisible = false;
        let showDone = true;
        let heatmapCircles = [];
        let historyData = [];
        let totalBullets = 0;
        let totalArea = 0;

        // Colors
        const levelColor = { high: '#ff4444', med: '#ffb300', low: '#00ff88' };
        const levelLabel = { high: 'HIGH NEED', med: 'MEDIUM', low: 'LOW' };
        const levelBadge = { high: 'badge-high', med: 'badge-med', low: 'badge-low' };

        // ── MAP CLICK (disabled — zones are auto-detected from drone scan) ──
        // map.on('click', ...) removed

        function createZone(lat, lng, level) {
            const id = Date.now() + Math.floor(Math.random() * 1000);
            const t2 = Date.now() / 1000;
            // NPK
            const n = Math.round(10 + Math.random() * 80);
            const p = Math.round(10 + Math.random() * 80);
            const k = Math.round(10 + Math.random() * 80);
            // Temperature
            const airTemp = (28 + (Math.random() - 0.5) * 8).toFixed(1);
            const soilTemp = (22 + (Math.random() - 0.5) * 6).toFixed(1);
            // Moisture
            const moisture = Math.round(45 + Math.random() * 40);
            const humidity = Math.round(55 + Math.random() * 35);
            // Gas
            const co2 = Math.round(390 + Math.random() * 80);
            const nh3 = (0.6 + Math.random() * 2).toFixed(2);
            const voc = Math.round(120 + Math.random() * 200);
            // pH & EC
            const ph = (5.5 + Math.random() * 2.5).toFixed(1);
            const ec = (0.8 + Math.random() * 2.4).toFixed(2);

            const color = levelColor[level];
            const circle = L.circle([lat, lng], {
                radius: 18, color: color, fillColor: color, fillOpacity: 0.25, weight: 2
            }).addTo(map);

            const pulseMarker = L.circleMarker([lat, lng], {
                radius: 6, color: color, fillColor: color, fillOpacity: 1, weight: 2
            }).addTo(map);

            const zone = {
                id, lat, lng, level, n, p, k,
                airTemp, soilTemp, moisture, humidity,
                co2, nh3, voc, ph, ec, circle, pulseMarker, fertilized: false
            };
            zones.push(zone);

            // Clicking a marker always selects/highlights the zone in the sidebar
            const onZoneClick = function (e) {
                L.DomEvent.stopPropagation(e);
                selectZone(zone.id);
            };
            circle.on('click', onZoneClick);
            pulseMarker.on('click', onZoneClick);

            renderZoneList();
        }

        // ── ZONE LIST ──
        function renderZoneList() {
            const list = document.getElementById('zoneList');
            if (zones.length === 0) {
                list.innerHTML = '<p style="color:var(--text-muted);font-size:12px;text-align:center;margin-top:20px">No zones detected yet.</p>';
                updateStats(); return;
            }
            list.innerHTML = '';
            zones.slice().reverse().forEach(z => {
                const div = document.createElement('div');
                div.className = 'zone-card' + (z.fertilized ? ' fertilized' : '');
                div.id = 'zcard-' + z.id;

                const phColor = parseFloat(z.ph) < 5.5 ? '#ff4444' : parseFloat(z.ph) > 7.5 ? '#81d4fa' : '#ffb300';
                const co2Color = parseInt(z.co2) > 440 ? '#ff4444' : '#ffeb3b';

                div.innerHTML = `
                <div class="zone-row">
                    <div class="zone-name">📍 Zone @ ${z.lat.toFixed(4)}, ${z.lng.toFixed(4)}</div>
                    <span class="zone-badge ${z.fertilized ? 'badge-done' : levelBadge[z.level]}">${z.fertilized ? '✅ DONE' : levelLabel[z.level]}</span>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin:6px 0">

                  <!-- Temperature -->
                  <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:7px;padding:6px 8px">
                    <div style="font-size:9px;color:var(--text-muted);letter-spacing:.4px">🌡️ TEMPERATURE</div>
                    <div style="font-size:12px;font-weight:700;font-family:'JetBrains Mono',monospace;color:#ff8a65">
                      Air: ${z.airTemp}°C &nbsp; Soil: ${z.soilTemp}°C
                    </div>
                  </div>

                  <!-- Moisture -->
                  <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:7px;padding:6px 8px">
                    <div style="font-size:9px;color:var(--text-muted);letter-spacing:.4px">💧 MOISTURE</div>
                    <div style="font-size:12px;font-weight:700;font-family:'JetBrains Mono',monospace;color:#4fc3f7">
                      Vol: ${z.moisture}% &nbsp; RH: ${z.humidity}%
                    </div>
                  </div>

                  <!-- Gas sensor -->
                  <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:7px;padding:6px 8px">
                    <div style="font-size:9px;color:var(--text-muted);letter-spacing:.4px">☁️ GAS SENSOR</div>
                    <div style="font-size:11px;font-weight:700;font-family:'JetBrains Mono',monospace">
                      <span style="color:${co2Color}">CO₂ ${z.co2}ppm</span>
                      <span style="color:#ffd600"> NH₃ ${z.nh3}</span>
                      <span style="color:#ffcc02"> VOC ${z.voc}ppb</span>
                    </div>
                  </div>

                  <!-- pH / EC -->
                  <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:7px;padding:6px 8px">
                    <div style="font-size:9px;color:var(--text-muted);letter-spacing:.4px">⚗️ pH / EC</div>
                    <div style="font-size:12px;font-weight:700;font-family:'JetBrains Mono',monospace">
                      <span style="color:${phColor}">pH ${z.ph}</span>
                      <span style="color:#ffa726"> EC ${z.ec} dS/m</span>
                    </div>
                  </div>

                </div>

                <!-- NPK -->
                <div class="npk-row">
                  <div class="npk-chip"><div class="npk-label">NITROGEN</div><div class="npk-val n">${z.n}</div></div>
                  <div class="npk-chip"><div class="npk-label">PHOSPHORUS</div><div class="npk-val p">${z.p}</div></div>
                  <div class="npk-chip"><div class="npk-label">POTASSIUM</div><div class="npk-val k">${z.k}</div></div>
                </div>

                ${!z.fertilized
                        ? `<button onclick="event.stopPropagation();addToMission(${z.id})" class="tool-btn success" style="width:100%;margin-top:6px;justify-content:center">➕ Add to Rover Mission</button>`
                        : '<div style="font-size:11px;color:var(--blue-gps);text-align:center;margin-top:6px">✅ Fertilized — recorded</div>'
                    }
                `;
                div.onclick = () => selectZone(z.id);
                list.appendChild(div);
            });
            updateStats();
        }

        function selectZone(id) {
            const z = zones.find(x => x.id === id);
            if (!z) return;
            map.flyTo([z.lat, z.lng], 18, { duration: .6 });
            document.querySelectorAll('.zone-card').forEach(c => c.classList.remove('selected'));
            const card = document.getElementById('zcard-' + id);
            if (card) card.classList.add('selected');
        }

        function updateStats() {
            document.getElementById('statTotal').textContent = zones.length;
            document.getElementById('statHigh').textContent = zones.filter(z => z.level === 'high' && !z.fertilized).length;
            document.getElementById('statDone').textContent = zones.filter(z => z.fertilized).length;
        }

        // ── UNDO ──
        function undoLast() {
            const last = zones.pop();
            if (!last) return;
            map.removeLayer(last.circle);
            map.removeLayer(last.pulseMarker);
            renderZoneList();
            showToast('↩ Last zone removed');
        }

        // ── TOOL SELECTION ──
        function setTool(t) {
            currentTool = t;
            document.getElementById('btnMark').classList.toggle('active', t === 'mark');
            document.getElementById('btnView').classList.toggle('active', t === 'view');
            map.getContainer().style.cursor = t === 'mark' ? 'crosshair' : 'default';
        }

        function setNeedLevel(l) {
            currentLevel = l;
            ['High', 'Med', 'Low'].forEach(x => document.getElementById('lvl' + x).classList.remove('active'));
            document.getElementById('lvl' + l.charAt(0).toUpperCase() + l.slice(1)).classList.add('active');
        }

        // ── HEATMAP ──
        let heatLayers = [];
        function toggleHeatmap() {
            heatmapVisible = !heatmapVisible;
            document.getElementById('btnHeat').classList.toggle('active', heatmapVisible);
            heatLayers.forEach(l => map.removeLayer(l));
            heatLayers = [];
            if (heatmapVisible) {
                zones.filter(z => !z.fertilized).forEach(z => {
                    const r = z.level === 'high' ? 40 : z.level === 'med' ? 28 : 18;
                    const c = levelColor[z.level];
                    const l = L.circle([z.lat, z.lng], { radius: r, color: 'transparent', fillColor: c, fillOpacity: .18, weight: 0 }).addTo(map);
                    heatLayers.push(l);
                });
            }
        }

        // ── SHOW DONE TOGGLE ──
        function toggleFertDone() {
            showDone = !showDone;
            document.getElementById('btnDone').classList.toggle('active', showDone);
            zones.filter(z => z.fertilized).forEach(z => {
                if (showDone) { map.addLayer(z.circle); map.addLayer(z.pulseMarker); }
                else { map.removeLayer(z.circle); map.removeLayer(z.pulseMarker); }
            });
        }

        // ── MISSION QUEUE ──
        let mission = [];
        function addToMission(id) {
            const z = zones.find(x => x.id === id);
            if (!z || z.fertilized) return;
            if (mission.includes(id)) { showToast('⚠️ Zone already in queue'); return; }
            mission.push(id);
            renderMission();
            switchTab('rover', null);
            showToast('✅ Added to rover mission queue');
        }

        function removeFromMission(id) {
            mission = mission.filter(x => x !== id);
            renderMission();
        }

        function renderMission() {
            const list = document.getElementById('missionList');
            document.getElementById('missionCount').textContent = `(${mission.length} zones)`;
            document.getElementById('deployBtn').disabled = mission.length === 0;
            if (mission.length === 0) {
                list.innerHTML = '<div style="color:var(--text-muted);font-size:11px;text-align:center;padding:10px">No zones queued.</div>';
                return;
            }
            list.innerHTML = '';
            mission.forEach(id => {
                const z = zones.find(x => x.id === id);
                if (!z) return;
                const div = document.createElement('div');
                div.className = 'mission-item';
                div.innerHTML = `
      <span style="color:${levelColor[z.level]}">●</span>
      <span class="mcoords">${z.lat.toFixed(4)}, ${z.lng.toFixed(4)}</span>
      <span style="color:var(--text-muted)">${levelLabel[z.level]}</span>
      <button class="mremove" onclick="removeFromMission(${id})">✕</button>`;
                list.appendChild(div);
            });
        }

        // ── DEPLOY ──
        let deploying = false;
        function deployRover() {
            if (deploying || mission.length === 0) return;
            deploying = true;
            const btn = document.getElementById('deployBtn');
            btn.textContent = '⏳ DEPLOYING...';
            btn.disabled = true;
            document.getElementById('roverStatus').textContent = 'IN MISSION';
            document.getElementById('roverStatus').style.color = 'var(--green-neon)';
            showToast('🚀 Rover deployed! Processing mission...');

            let i = 0;
            const interval = setInterval(() => {
                if (i >= mission.length) {
                    clearInterval(interval);
                    deploying = false;
                    btn.textContent = '🚀 DEPLOY ROVER';
                    btn.disabled = false;
                    document.getElementById('roverStatus').textContent = 'STANDBY';
                    document.getElementById('roverStatus').style.color = 'var(--green-neon)';
                    mission = [];
                    renderMission();
                    showToast('✅ Mission complete! All zones fertilized.');
                    return;
                }
                const id = mission[i];
                markFertilized(id);
                i++;
            }, 1200);
        }

        function markFertilized(id) {
            const z = zones.find(x => x.id === id);
            if (!z) return;
            z.fertilized = true;

            // Update marker
            map.removeLayer(z.circle);
            map.removeLayer(z.pulseMarker);
            z.circle = L.circle([z.lat, z.lng], { radius: 18, color: '#4fc3f7', fillColor: '#4fc3f7', fillOpacity: .25, weight: 2 }).addTo(map);
            z.pulseMarker = L.circleMarker([z.lat, z.lng], { radius: 6, color: '#4fc3f7', fillColor: '#4fc3f7', fillOpacity: 1, weight: 2 }).addTo(map);

            const bullets = parseInt(document.getElementById('bulletsPerZone').value) || 5;
            const fertType = document.getElementById('fertType').value;
            const area = Math.round(Math.PI * 18 * 18);

            // Ammo update
            let ammo = parseInt(document.getElementById('roverAmmo').textContent);
            document.getElementById('roverAmmo').textContent = Math.max(0, ammo - bullets);

            // History
            const now = new Date();
            historyData.unshift({
                zone: `${z.lat.toFixed(4)}, ${z.lng.toFixed(4)}`,
                time: now.toLocaleString(),
                level: levelLabel[z.level],
                bullets, fertType, area
            });
            totalBullets += bullets;
            totalArea += area;

            renderHistory();
            renderZoneList();
        }

        function renderHistory() {
            const list = document.getElementById('historyList');
            if (historyData.length === 0) {
                list.innerHTML = '<p style="color:var(--text-muted);font-size:12px;text-align:center;margin-top:20px">No records yet.</p>';
                return;
            }
            list.innerHTML = '';
            historyData.forEach(h => {
                const div = document.createElement('div');
                div.className = 'history-entry';
                div.innerHTML = `
      <div class="hist-top">
        <div class="hist-zone">📍 Zone @ ${h.zone}</div>
        <div class="hist-time">${h.time}</div>
      </div>
      <div class="hist-details">
        <div>Need: <span>${h.level}</span></div>
        <div>Bullets: <span>${h.bullets}</span></div>
        <div>Type: <span>${h.fertType}</span></div>
        <div>Area: <span>${h.area}m²</span></div>
      </div>`;
                list.appendChild(div);
            });
            document.getElementById('histTotal').textContent = historyData.length;
            document.getElementById('histBullets').textContent = totalBullets;
            document.getElementById('histArea').textContent = totalArea + 'm²';
        }

        // ── EXPORT ──
        function exportHistory() {
            if (historyData.length === 0) { showToast('⚠️ No data to export'); return; }
            const csv = ['Zone,Time,Need Level,Bullets,Fertilizer,Area(m²)']
                .concat(historyData.map(h => `"${h.zone}","${h.time}","${h.level}",${h.bullets},"${h.fertType}",${h.area}`))
                .join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'green_swarm_fertilization_log.csv';
            a.click();
            showToast('📥 History exported as CSV!');
        }

        // ── TABS ──
        function switchTab(name, el) {
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.getElementById('tab-' + name).classList.add('active');
            if (el) el.classList.add('active');
        }

        // ── TOAST ──
        let toastTimer;
        function showToast(msg) {
            const t = document.getElementById('toast');
            t.textContent = msg;
            t.classList.add('show');
            clearTimeout(toastTimer);
            toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
        }

        // ── SEED SOME DEMO ZONES ──
        setTimeout(() => {
            createZone(20.5941, 78.9635, 'high');
            createZone(20.5930, 78.9620, 'med');
            createZone(20.5945, 78.9615, 'high');
            createZone(20.5928, 78.9640, 'low');
            createZone(20.5952, 78.9625, 'med');
        }, 600);

        // Default cursor
        map.getContainer().style.cursor = 'crosshair';

        // ── SCAN DATA ──
        let scanData = [];
        let scanLive = { n: 0, p: 0, k: 0, moist: 0, ph: 0, ec: 0, lat: 20.5937, lng: 78.9629 };

        // Simulate live sensor readings from drone position
        function updateScanReadings() {
            const t = Date.now() / 1000;
            scanLive.n = Math.round(25 + Math.sin(t / 1.8) * 30 + Math.random() * 8);
            scanLive.p = Math.round(18 + Math.cos(t / 2.1) * 25 + Math.random() * 6);
            scanLive.k = Math.round(35 + Math.sin(t / 2.5) * 20 + Math.random() * 7);
            scanLive.moist = Math.round(55 + Math.sin(t / 3) * 18 + Math.random() * 4);
            scanLive.ph = (6.2 + Math.sin(t / 4) * 0.8 + Math.random() * 0.15).toFixed(1);
            scanLive.ec = (1.2 + Math.cos(t / 3.5) * 0.6 + Math.random() * 0.1).toFixed(2);
            // Simulate drone GPS drift
            scanLive.lat = 20.5937 + Math.sin(t / 6) * 0.0008 + (Math.random() - 0.5) * 0.00005;
            scanLive.lng = 78.9629 + Math.cos(t / 7) * 0.0008 + (Math.random() - 0.5) * 0.00005;

            document.getElementById('sN').textContent = scanLive.n;
            document.getElementById('sP').textContent = scanLive.p;
            document.getElementById('sK').textContent = scanLive.k;
            document.getElementById('sMoist').textContent = scanLive.moist;
            document.getElementById('sPH').textContent = scanLive.ph;
            document.getElementById('sEC').textContent = scanLive.ec;
            document.getElementById('scanPos').textContent =
                scanLive.lat.toFixed(5) + ', ' + scanLive.lng.toFixed(5);
        }
        setInterval(updateScanReadings, 900);
        updateScanReadings();

        function collectData() {
            const btn = document.getElementById('collectBtn');
            btn.disabled = true;
            btn.textContent = '⏳ Collecting...';
            setTimeout(() => {
                const record = {
                    time: new Date().toLocaleTimeString(),
                    lat: scanLive.lat.toFixed(5),
                    lng: scanLive.lng.toFixed(5),
                    n: scanLive.n,
                    p: scanLive.p,
                    k: scanLive.k,
                    moist: scanLive.moist,
                    ph: scanLive.ph,
                    ec: scanLive.ec
                };
                scanData.unshift(record);
                renderScanLog();
                showToast('📥 Data collected & stored!');
                btn.disabled = false;
                btn.textContent = '📥 COLLECT DATA FOR THIS LOCATION';
            }, 800);
        }

        function renderScanLog() {
            const body = document.getElementById('scanLogBody');
            document.getElementById('scanCount').textContent = scanData.length + ' records';
            if (scanData.length === 0) {
                body.innerHTML = '<div style="color:var(--text-muted);font-size:11px;text-align:center;padding:14px">No data collected yet.</div>';
                return;
            }
            body.innerHTML = '';
            scanData.forEach(r => {
                const div = document.createElement('div');
                div.className = 'scan-entry';
                div.innerHTML = `
                    <span class="se-time">${r.time}</span>
                    <span style="color:#ff8a65">${r.n}</span>
                    <span style="color:#81d4fa">${r.p}</span>
                    <span style="color:#ce93d8">${r.k}</span>
                    <span style="color:var(--amber)">${r.ph}</span>`;
                body.appendChild(div);
                // Add tooltip popup for full data on hover
                div.title = `📍 ${r.lat}, ${r.lng} | Moist: ${r.moist}% | EC: ${r.ec} dS/m`;
            });
        }

        function clearScanLog() {
            scanData = [];
            renderScanLog();
            showToast('🗑️ Scan log cleared');
        }

        function exportScanData() {
            if (scanData.length === 0) { showToast('⚠️ No data to export'); return; }
            const csv = ['Time,Lat,Lng,N(mg/kg),P(mg/kg),K(mg/kg),Moisture(%),pH,EC(dS/m)']
                .concat(scanData.map(r =>
                    `${r.time},${r.lat},${r.lng},${r.n},${r.p},${r.k},${r.moist},${r.ph},${r.ec}`))
                .join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'green_swarm_scan_data.csv';
            a.click();
            showToast('📥 Scan data exported!');
        }

        // ── SENSOR STRIP LIVE UPDATE ──
        function updateSensorStrip() {
            const t = Date.now() / 1000;

            // Temperature
            const airT = (28 + Math.sin(t / 5) * 4 + Math.random() * .4).toFixed(1);
            const soilT = (22 + Math.sin(t / 6) * 3 + Math.random() * .3).toFixed(1);
            document.getElementById('ssAirTemp').textContent = airT;
            document.getElementById('ssSoilTemp').textContent = soilT;
            document.getElementById('ssAirTempBar').style.width = Math.min(parseFloat(airT) / 50 * 100, 100) + '%';
            document.getElementById('ssSoilTempBar').style.width = Math.min(parseFloat(soilT) / 50 * 100, 100) + '%';

            // Moisture
            const moist = Math.round(58 + Math.sin(t / 4) * 14 + Math.random() * 3);
            const humid = Math.round(65 + Math.cos(t / 3.5) * 12 + Math.random() * 3);
            document.getElementById('ssMoistVol').textContent = moist;
            document.getElementById('ssHumidity').textContent = humid;
            document.getElementById('ssMoistVolBar').style.width = moist + '%';
            document.getElementById('ssHumidityBar').style.width = humid + '%';

            // NPK
            const nVal = Math.round(25 + Math.sin(t / 1.8) * 28 + Math.random() * 7);
            const pVal = Math.round(18 + Math.cos(t / 2.1) * 22 + Math.random() * 5);
            const kVal = Math.round(35 + Math.sin(t / 2.5) * 18 + Math.random() * 6);
            document.getElementById('ssN').textContent = nVal;
            document.getElementById('ssP').textContent = pVal;
            document.getElementById('ssK').textContent = kVal;
            document.getElementById('ssNBar').style.width = Math.min(nVal, 100) + '%';
            document.getElementById('ssPBar').style.width = Math.min(pVal, 100) + '%';
            document.getElementById('ssKBar').style.width = Math.min(kVal, 100) + '%';

            // Gas sensor
            const co2 = Math.round(400 + Math.sin(t / 7) * 30 + Math.random() * 8);
            const nh3 = (1.2 + Math.cos(t / 4) * 0.8 + Math.random() * 0.2).toFixed(2);
            const voc = Math.round(180 + Math.sin(t / 5) * 60 + Math.random() * 15);
            document.getElementById('ssCO2').textContent = co2;
            document.getElementById('ssNH3').textContent = nh3;
            document.getElementById('ssVOC').textContent = voc;
            document.getElementById('ssCO2Bar').style.width = Math.min(co2 / 1000 * 100, 100) + '%';
            document.getElementById('ssNH3Bar').style.width = Math.min(parseFloat(nh3) / 5 * 100, 100) + '%';
            document.getElementById('ssVOCBar').style.width = Math.min(voc / 500 * 100, 100) + '%';
            // Alarm colour if CO2 high
            const co2el = document.getElementById('ssCO2');
            co2el.className = 'ss-val ' + (co2 > 440 ? 'c-alarm' : 'c-gas');

            // pH + EC
            const ph = (6.2 + Math.sin(t / 4) * 0.9 + Math.random() * 0.1).toFixed(1);
            const ec = (1.3 + Math.cos(t / 3.5) * 0.5 + Math.random() * 0.08).toFixed(2);
            document.getElementById('ssPH').textContent = ph;
            document.getElementById('ssEC').textContent = ec;
            document.getElementById('ssPHBar').style.width = (parseFloat(ph) / 14 * 100).toFixed(1) + '%';
            document.getElementById('ssECBar').style.width = Math.min(parseFloat(ec) / 4 * 100, 100) + '%';
            // Colour pH by acidity range
            const phEl = document.getElementById('ssPH');
            phEl.style.color = parseFloat(ph) < 5.5 ? 'var(--red-alert)' : parseFloat(ph) > 7.5 ? '#81d4fa' : 'var(--amber)';
        }
        setInterval(updateSensorStrip, 1100);
        updateSensorStrip();

        // ── LIVE POSITION PANEL (Leaflet control, bottom-right) ──
        const posCtrl = L.control({ position: 'bottomright' });
        posCtrl.onAdd = function () {
            const d = L.DomUtil.create('div', '');
            d.id = 'posPanel';
            d.style.cssText = `
                background:rgba(5,14,10,.93);backdrop-filter:blur(10px);
                border:1px solid #005c30;border-radius:10px;
                padding:10px 13px;font-family:'JetBrains Mono',monospace;
                font-size:10px;color:#d4f5e0;min-width:210px;
                box-shadow:0 0 20px rgba(0,255,136,.08);`;
            d.innerHTML = `
                <div style="font-size:9px;color:#6a9f7e;letter-spacing:.6px;text-transform:uppercase;margin-bottom:8px;font-family:Inter,sans-serif">
                    📡 Real-Time Navigation
                </div>

                <div class="pos-row" style="display:grid;grid-template-columns:18px 1fr;align-items:start;gap:4px;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #0f2318">
                    <span style="font-size:14px">🔵</span>
                    <div>
                        <div style="color:#90caf9;font-size:9px;font-family:Inter,sans-serif">SCOUT ROVER</div>
                        <div id="posBlue" style="color:#4fc3f7">--</div>
                        <div id="navBlue" style="color:#64b5f6;font-size:9px;font-family:Inter,sans-serif">Idle</div>
                    </div>
                </div>

                <div class="pos-row" style="display:grid;grid-template-columns:18px 1fr;align-items:start;gap:4px;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #0f2318">
                    <span style="font-size:14px">⚫</span>
                    <div>
                        <div style="color:#9e9e9e;font-size:9px;font-family:Inter,sans-serif">FERTILIZER ROVER</div>
                        <div id="posBlack" style="color:#bdbdbd">--</div>
                        <div id="navBlack" style="color:#9e9e9e;font-size:9px;font-family:Inter,sans-serif">Standby</div>
                    </div>
                </div>

                <div class="pos-row" style="display:grid;grid-template-columns:18px 1fr;align-items:start;gap:4px">
                    <span style="font-size:14px">✈️</span>
                    <div>
                        <div style="color:#a5d6a7;font-size:9px;font-family:Inter,sans-serif">DRONE</div>
                        <div id="posDrone" style="color:#00ff88">--</div>
                        <div id="navDrone" style="color:#69f0ae;font-size:9px;font-family:Inter,sans-serif">Free sweep</div>
                    </div>
                </div>`;
            L.DomEvent.disableClickPropagation(d);
            L.DomEvent.disableScrollPropagation(d);
            return d;
        };
        posCtrl.addTo(map);

        function updatePosPanel() {
            // Heading helper — cardinal direction from dx/dy
            function heading(dlat, dlng) {
                if (Math.abs(dlat) < 0.000005 && Math.abs(dlng) < 0.000005) return '●';
                const deg = Math.round(Math.atan2(dlng, dlat) * 180 / Math.PI);
                const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N'];
                return dirs[Math.round((deg + 360) % 360 / 45)];
            }

            // Blue scout rover
            const bEl = document.getElementById('posBlue');
            const bNav = document.getElementById('navBlue');
            if (bEl) {
                bEl.textContent = `${bRoverPos[0].toFixed(5)}, ${bRoverPos[1].toFixed(5)}`;
                bNav.textContent = survActive
                    ? `⊹ Sweep ${heading(0, 0)} — Surveillance scan`
                    : `→ ${heading(bRoverPos[0] - originLat, bRoverPos[1] - originLng)} Free patrol`;
            }

            // Black fertilizer rover
            const blEl = document.getElementById('posBlack');
            const blNav = document.getElementById('navBlack');
            if (blEl) {
                blEl.textContent = `${blRoverPos[0].toFixed(5)}, ${blRoverPos[1].toFixed(5)}`;
                const targets = zones.filter(z => !z.fertilized);
                if (targets.length === 0) {
                    blNav.textContent = '● Standby — no zones';
                } else {
                    const goal = targets[Math.min(fertTarget || 0, targets.length - 1)];
                    const dlat = goal.lat - blRoverPos[0];
                    const dlng = goal.lng - blRoverPos[1];
                    const dist = Math.sqrt(dlat * dlat + dlng * dlng);
                    const distM = Math.round(dist * 111320);
                    blNav.textContent = dist < 0.00008
                        ? `🌿 Fertilizing zone ${(fertTarget || 0) + 1}/${targets.length}`
                        : `→ ${heading(dlat, dlng)} Zone ${(fertTarget || 0) + 1} — ${distM}m`;
                }
            }

            // Drone
            const dEl = document.getElementById('posDrone');
            const dNav = document.getElementById('navDrone');
            if (dEl) {
                dEl.textContent = `${dronePos[0].toFixed(5)}, ${dronePos[1].toFixed(5)}`;
                dNav.textContent = survActive
                    ? `▣ Surveillance sweep ${survProgress}%`
                    : `↻ Free aerial sweep`;
            }
        }
        setInterval(updatePosPanel, 700);

        // ===================================================================
        //  SURVEILLANCE DRAW --- native DOM overlay (bypasses Leaflet events)
        // ===================================================================
        let survDrawMode = false;
        let survDrawStart = null;
        let survPendingBBox = null;

        const drawOverlay = document.createElement('div');
        drawOverlay.style.cssText = 'position:absolute;inset:0;z-index:800;display:none;cursor:crosshair;user-select:none;';
        map.getContainer().style.position = 'relative';
        map.getContainer().appendChild(drawOverlay);

        const drawBox = document.createElement('div');
        drawBox.style.cssText = 'position:absolute;border:2px dashed #fff700;background:rgba(255,247,0,.08);pointer-events:none;display:none;box-shadow:0 0 8px rgba(255,247,0,.4);';
        drawOverlay.appendChild(drawBox);

        function _setDrawBox(x1, y1, x2, y2) {
            const l = Math.min(x1, x2), t = Math.min(y1, y2), w = Math.abs(x2 - x1), h = Math.abs(y2 - y1);
            drawBox.style.left = l + 'px'; drawBox.style.top = t + 'px';
            drawBox.style.width = w + 'px'; drawBox.style.height = h + 'px';
            drawBox.style.display = (w > 5 && h > 5) ? 'block' : 'none';
        }
        function _onDown(e) {
            e.preventDefault();
            const r = drawOverlay.getBoundingClientRect();
            survDrawStart = { x: e.clientX - r.left, y: e.clientY - r.top };
            drawBox.style.display = 'none';
        }
        function _onMove(e) {
            if (!survDrawStart) return;
            const r = drawOverlay.getBoundingClientRect();
            _setDrawBox(survDrawStart.x, survDrawStart.y, e.clientX - r.left, e.clientY - r.top);
        }
        function _onUp(e) {
            if (!survDrawStart) return;
            const r = drawOverlay.getBoundingClientRect();
            const ex = e.clientX - r.left, ey = e.clientY - r.top;
            const a = map.containerPointToLatLng(L.point(survDrawStart.x, survDrawStart.y));
            const b = map.containerPointToLatLng(L.point(ex, ey));
            exitDrawMode();
            const bbox = { minLat: Math.min(a.lat, b.lat), maxLat: Math.max(a.lat, b.lat), minLng: Math.min(a.lng, b.lng), maxLng: Math.max(a.lng, b.lng) };
            if (bbox.maxLat - bbox.minLat < 0.0002 || bbox.maxLng - bbox.minLng < 0.0002) {
                showToast('Too small - drag a larger area');
                document.getElementById('btnSurv').textContent = ' Define Surveillance Area';
                document.getElementById('btnSurv').style.background = '';
                document.getElementById('survStatus').textContent = ' IDLE - Draw an area on the map';
                document.getElementById('survStatus').style.color = 'var(--text-muted)';
                return;
            }
            if (survRectLayer) map.removeLayer(survRectLayer);
            survRectLayer = L.rectangle([[bbox.minLat, bbox.minLng], [bbox.maxLat, bbox.maxLng]],
                { color: '#fff700', weight: 2, fillColor: '#fff700', fillOpacity: .07, dashArray: '6 5' })
                .addTo(map).bindTooltip('Surveillance Area', { permanent: true, direction: 'top', className: 'leaflet-tt' });
            survPendingBBox = bbox;
            document.getElementById('btnSurv').textContent = ' Redefine Area';
            document.getElementById('btnSurv').style.background = '';
            document.getElementById('btnStartSurv').style.display = 'inline-flex';
            document.getElementById('btnCancelSurv').style.display = 'inline-flex';
            document.getElementById('survDrawHint').style.display = 'none';
            document.getElementById('survStatus').textContent = 'Area ready - press Start Surveillance';
            document.getElementById('survStatus').style.color = '#00ff88';
            showToast('Area defined - click Start Surveillance');
        }
        function enterDrawMode() {
            survDrawMode = true; survDrawStart = null; drawBox.style.display = 'none';
            map.dragging.disable(); map.scrollWheelZoom.disable();
            drawOverlay.style.display = 'block';
            drawOverlay.addEventListener('mousedown', _onDown);
            drawOverlay.addEventListener('mousemove', _onMove);
            drawOverlay.addEventListener('mouseup', _onUp);
        }
        function exitDrawMode() {
            survDrawMode = false; survDrawStart = null;
            drawOverlay.style.display = 'none'; drawBox.style.display = 'none';
            map.dragging.enable(); map.scrollWheelZoom.enable();
            drawOverlay.removeEventListener('mousedown', _onDown);
            drawOverlay.removeEventListener('mousemove', _onMove);
            drawOverlay.removeEventListener('mouseup', _onUp);
        }
        function toggleSurvDraw() {
            if (survDrawMode) {
                exitDrawMode();
                document.getElementById('btnSurv').textContent = ' Define Surveillance Area';
                document.getElementById('btnSurv').style.background = '';
                document.getElementById('survDrawHint').style.display = 'none';
                if (!survPendingBBox && !survActive) {
                    document.getElementById('survStatus').textContent = ' IDLE - Draw an area on the map';
                    document.getElementById('survStatus').style.color = 'var(--text-muted)';
                }
                return;
            }
            if (survActive) { showToast('Cancel current surveillance first'); return; }
            if (survRectLayer) { map.removeLayer(survRectLayer); survRectLayer = null; }
            survPendingBBox = null;
            document.getElementById('btnStartSurv').style.display = 'none';
            enterDrawMode();
            document.getElementById('btnSurv').style.background = 'rgba(255,247,0,.18)';
            document.getElementById('btnSurv').textContent = ' Cancel Draw';
            document.getElementById('survDrawHint').style.display = 'inline';
            document.getElementById('survStatus').textContent = 'DRAW MODE - click and drag on the map';
            document.getElementById('survStatus').style.color = '#fff700';
        }
        function launchSurveillance() {
            if (!survPendingBBox) { showToast('Define an area first'); return; }
            startSurveillance(survPendingBBox);
            survPendingBBox = null;
            document.getElementById('btnStartSurv').style.display = 'none';
        }
        function cancelSurveillance() {
            survActive = false; survPendingBBox = null;
            exitDrawMode();
            if (survRectLayer) { map.removeLayer(survRectLayer); survRectLayer = null; }
            document.getElementById('btnSurv').textContent = ' Define Surveillance Area';
            document.getElementById('btnSurv').style.background = '';
            document.getElementById('btnCancelSurv').style.display = 'none';
            document.getElementById('btnStartSurv').style.display = 'none';
            document.getElementById('survStatus').textContent = ' IDLE - Draw an area on the map';
            document.getElementById('survStatus').style.color = 'var(--text-muted)';
            document.getElementById('survBar').style.width = '0%';
            document.getElementById('survPct').textContent = '0%';
            document.getElementById('survDrawHint').style.display = 'none';
            showToast('Surveillance cancelled');
        }


    