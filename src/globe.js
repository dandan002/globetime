// Globe controller - Three.js bordered earth with sun-shader day/night,
// city markers, great-circle arcs, and 3 visual styles.
import * as THREE from "three";
import { sampleBorderLineSegments } from "./data/borderGeometry.js";
import { worldBorders } from "./data/worldBorders.js";

  const RAD = Math.PI / 180;
  const R = 1.0;

  // lat/lon (deg) -> Vector3 on sphere of radius r. Equirectangular-aligned.
  function llToVec(lat, lon, r) {
    const phi = (90 - lat) * RAD;
    const theta = (lon + 180) * RAD;
    return new THREE.Vector3(
      -r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta)
    );
  }

  // ----- shaders -----
  const BORDER_VERT = `
    varying vec3 vN;
    void main(){
      vN = normalize(mat3(modelMatrix) * normalize(position));
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }`;
  const BORDER_FRAG = `
    precision mediump float;
    uniform vec3 uSun; uniform vec3 uDay; uniform vec3 uNight; uniform float uOpacity;
    varying vec3 vN;
    void main(){
      float lit = dot(normalize(vN), normalize(uSun));
      float day = smoothstep(-0.12,0.18,lit);
      vec3 col = mix(uNight, uDay, day);
      gl_FragColor = vec4(col, uOpacity);
    }`;

  const SURF_VERT = `
    varying vec3 vN; varying vec3 vWPos;
    void main(){
      vN = normalize(mat3(modelMatrix) * normalize(position));
      vec4 wp = modelMatrix * vec4(position,1.0);
      vWPos = wp.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }`;
  const SURF_FRAG = `
    precision mediump float;
    uniform vec3 uSun; uniform vec3 uDay; uniform vec3 uNight; uniform vec3 uTerm; uniform vec3 uRim;
    varying vec3 vN; varying vec3 vWPos;
    void main(){
      vec3 N = normalize(vN);
      vec3 V = normalize(cameraPosition - vWPos);
      float lit = dot(N, normalize(uSun));
      float day = smoothstep(-0.10,0.22,lit);
      vec3 col = mix(uNight, uDay, day);
      float t = 1.0 - smoothstep(0.0, 0.12, abs(lit));
      col += uTerm * t;
      float fres = pow(1.0 - max(dot(N, V), 0.0), 3.4);
      col += uRim * fres * 0.6;
      gl_FragColor = vec4(col, 1.0);
    }`;

  const ATM_VERT = `
    varying vec3 vN; varying vec3 vView;
    void main(){
      vN = normalize(mat3(modelMatrix) * normalize(position));
      vec4 mv = modelViewMatrix * vec4(position,1.0);
      vView = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv;
    }`;
  const ATM_FRAG = `
    precision mediump float;
    uniform vec3 uColor; uniform vec3 uSun; uniform float uIntensity;
    varying vec3 vN; varying vec3 vView;
    void main(){
      float fres = pow(1.0 - max(dot(normalize(vN), vec3(0.0,0.0,1.0)), 0.0), 7.5);
      float lit = clamp(dot(normalize(vN), normalize(uSun))*0.5+0.75, 0.55, 1.0);
      gl_FragColor = vec4(uColor, fres * uIntensity * lit);
    }`;

  export function GlobeController(canvas) {
    this.canvas = canvas;
    this.cities = [];
    this.markers = new Map();
    this.arcs = [];
    this.style = "borders";
    this.accent = new THREE.Color("#5ad1e6");
    this.sunDir = new THREE.Vector3(1, 0, 0);
    this.sunWorld = new THREE.Vector3(1, 0, 0);
    this.targetYaw = 0.4;
    this.yaw = 0.4;
    this.tilt = 0.32;
    this.autoRotate = true;
    this.camDist = 4.2;
    this.dragging = false;
    this._init();
  }

  GlobeController.prototype._init = function () {
    const w = this.canvas.clientWidth || 800;
    const h = this.canvas.clientHeight || 600;
    const renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    renderer.setClearColor(0x070809, 1);
    this.renderer = renderer;

    const scene = new THREE.Scene();
    this.scene = scene;
    const cam = new THREE.PerspectiveCamera(34, w / h, 0.1, 100);
    cam.position.set(0, 0, 4.2);
    this.camera = cam;

    const group = new THREE.Group();
    scene.add(group);
    this.group = group;

    // occluder / surface sphere
    this.surfUniforms = {
      uSun: { value: this.sunWorld },
      uDay: { value: new THREE.Color("#2b3744") },
      uNight: { value: new THREE.Color("#161f29") },
      uTerm: { value: new THREE.Color("#10151a") },
      uRim: { value: this.accent.clone() },
    };
    const surfMat = new THREE.ShaderMaterial({
      vertexShader: SURF_VERT, fragmentShader: SURF_FRAG,
      uniforms: this.surfUniforms,
    });
    const surf = new THREE.Mesh(new THREE.SphereGeometry(R * 0.992, 64, 48), surfMat);
    group.add(surf);
    this.surf = surf;

    // graticule
    this.graticule = this._buildGraticule();
    group.add(this.graticule);

    // border uniforms
    this.borderUniforms = {
      uSun: { value: this.sunWorld },
      uDay: { value: new THREE.Color("#eef3f5") },
      uNight: { value: new THREE.Color("#2b3a44") },
      uOpacity: { value: 0.9 },
    };

    // atmosphere
    this.atmUniforms = {
      uColor: { value: this.accent.clone() },
      uSun: { value: this.sunWorld },
      uIntensity: { value: 1.0 },
    };
    const atm = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.14, 48, 32),
      new THREE.ShaderMaterial({
        vertexShader: ATM_VERT, fragmentShader: ATM_FRAG, uniforms: this.atmUniforms,
        blending: THREE.AdditiveBlending, transparent: true, side: THREE.BackSide, depthWrite: false,
      })
    );
    scene.add(atm);
    this.atm = atm;

    // groups for cities/arcs
    this.markerGroup = new THREE.Group();
    this.arcGroup = new THREE.Group();
    group.add(this.arcGroup);
    group.add(this.markerGroup);

    this._dotSprite = this._makeDotTexture();

    this._buildBorders();
    this._bindPointer();
    window.addEventListener("resize", () => this.resize());
    if (window.ResizeObserver) {
      this._ro = new ResizeObserver(() => this.resize());
      this._ro.observe(this.canvas);
    }
    this.resize();
    this._animate();
  };

  GlobeController.prototype._buildGraticule = function () {
    const segs = [];
    for (let lat = -60; lat <= 60; lat += 30) {
      let prev = null;
      for (let lon = -180; lon <= 180; lon += 6) {
        const v = llToVec(lat, lon, R * 1.001);
        if (prev) segs.push(prev.x, prev.y, prev.z, v.x, v.y, v.z);
        prev = v;
      }
    }
    for (let lon = -180; lon < 180; lon += 30) {
      let prev = null;
      for (let lat = -90; lat <= 90; lat += 6) {
        const v = llToVec(lat, lon, R * 1.001);
        if (prev) segs.push(prev.x, prev.y, prev.z, v.x, v.y, v.z);
        prev = v;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(segs, 3));
    const m = new THREE.LineBasicMaterial({ color: 0x3a4750, transparent: true, opacity: 0.18 });
    return new THREE.LineSegments(g, m);
  };

  GlobeController.prototype._makeDotTexture = function () {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const x = c.getContext("2d");
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.5, "rgba(255,255,255,0.9)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g; x.beginPath(); x.arc(32, 32, 32, 0, 7); x.fill();
    const t = new THREE.CanvasTexture(c);
    return t;
  };

  // Build thin line segments along local country/coast border geometry.
  GlobeController.prototype._buildBorders = function () {
    const positions = [];
    const borderSegments = sampleBorderLineSegments(worldBorders, 0.8);

    for (const [lon, lat] of borderSegments) {
      const p = llToVec(lat, lon, R);
      positions.push(p.x, p.y, p.z);
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const mat = new THREE.ShaderMaterial({
      vertexShader: BORDER_VERT, fragmentShader: BORDER_FRAG, uniforms: this.borderUniforms,
      transparent: true, depthWrite: true,
    });
    if (this.borders) { this.group.remove(this.borders); this.borders.geometry.dispose(); }
    this.borders = new THREE.LineSegments(g, mat);
    this.group.add(this.borders);
    this.applyStyle(this.style);
  };

  GlobeController.prototype._bindPointer = function () {
    const el = this.canvas;
    let lx = 0, ly = 0;
    const down = (e) => {
      this.dragging = true; this.autoRotate = false;
      const p = e.touches ? e.touches[0] : e;
      lx = p.clientX; ly = p.clientY;
      this._vy = 0;
    };
    const move = (e) => {
      if (!this.dragging) return;
      const p = e.touches ? e.touches[0] : e;
      const dx = p.clientX - lx, dy = p.clientY - ly;
      lx = p.clientX; ly = p.clientY;
      this.targetYaw += dx * 0.006;
      this.tilt = Math.max(-1.15, Math.min(1.15, this.tilt + dy * 0.005));
      this._vy = dx * 0.006;
    };
    const up = () => {
      if (!this.dragging) return;
      this.dragging = false;
      clearTimeout(this._resumeT);
      this._resumeT = setTimeout(() => { this.autoRotate = true; }, 3500);
    };
    el.addEventListener("mousedown", down);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    el.addEventListener("touchstart", down, { passive: true });
    el.addEventListener("touchmove", move, { passive: true });
    el.addEventListener("touchend", up);
  };

  GlobeController.prototype.resize = function () {
    const w = this.canvas.clientWidth || 800;
    const h = this.canvas.clientHeight || 600;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.scene && this.camera) this.renderer.render(this.scene, this.camera);
  };

  GlobeController.prototype.setAccent = function (hex) {
    this.accent = new THREE.Color(hex);
    this.atmUniforms.uColor.value.copy(this.accent);
    if (this.surfUniforms && this.surfUniforms.uRim) this.surfUniforms.uRim.value.copy(this.accent);
    // refresh markers/arcs colors
    this.cities && this.setCities(this.cities, this.activeId, true);
  };

  GlobeController.prototype.setSun = function (lat, lon) {
    const v = llToVec(lat, lon, 1).normalize();
    this.sunDir.copy(v);
  };

  GlobeController.prototype.applyStyle = function (style) {
    const normalizedStyle = style === "dots" ? "borders" : style;
    this.style = normalizedStyle;
    const borders = this.borders, grat = this.graticule;
    if (normalizedStyle === "borders") {
      if (borders) borders.visible = true;
      grat.material.opacity = 0.14;
      this.surfUniforms.uDay.value.set("#384a57");
      this.surfUniforms.uNight.value.set("#212e39");
      this.surfUniforms.uTerm.value.set("#243643");
      this.borderUniforms.uOpacity.value = 0.85;
      this.borderUniforms.uDay.value.set("#ffffff");
      this.borderUniforms.uNight.value.set("#94adbc");
      this.atmUniforms.uIntensity.value = 0.7;
    } else if (normalizedStyle === "wire") {
      if (borders) borders.visible = false;
      grat.material.opacity = 0.5;
      this.surfUniforms.uDay.value.set("#141a1f");
      this.surfUniforms.uNight.value.set("#0a0e12");
      this.surfUniforms.uTerm.value.set("#14202a");
      this.atmUniforms.uIntensity.value = 0.85;
    } else if (normalizedStyle === "solid") {
      if (borders) borders.visible = true;
      grat.material.opacity = 0.06;
      this.surfUniforms.uDay.value.set("#222831");
      this.surfUniforms.uNight.value.set("#0d1115");
      this.surfUniforms.uTerm.value.set("#1c232b");
      this.borderUniforms.uOpacity.value = 0.55;
      this.borderUniforms.uDay.value.set("#dfe6ec");
      this.borderUniforms.uNight.value.set("#54707f");
      this.atmUniforms.uIntensity.value = 0.5;
    }
  };

  // ---- city markers + arcs ----
  GlobeController.prototype.setCities = function (list, activeId, silent) {
    const prevIds = new Set(this.markers.keys());
    const nextIds = new Set(list.map((c) => c.id));
    const prevActiveId = this.activeId;
    this.cities = list.slice();
    this.activeId = activeId;

    // remove gone
    for (const id of prevIds) {
      if (!nextIds.has(id)) {
        const m = this.markers.get(id);
        if (m) this.markerGroup.remove(m.group);
        this.markers.delete(id);
      }
    }
    // add new
    list.forEach((c) => {
      if (!this.markers.has(c.id)) {
        const m = this._makeMarker(c);
        this.markers.set(c.id, m);
        this.markerGroup.add(m.group);
        m.born = performance.now();
        // bring new city into view (skip on initial bulk load)
        if (!silent) this.rotateToCity(c);
      }
      // update active styling
      const m = this.markers.get(c.id);
      const active = c.id === activeId;
      m.dot.material.color.copy(active ? new THREE.Color("#ffffff") : this.accent);
      m.ring.material.color.copy(active ? new THREE.Color("#ffffff") : this.accent);
      m.pillar.material.color.copy(this.accent);
      m.active = active;
    });

    // rotate to active city when selection changes (city already exists)
    if (activeId && activeId !== prevActiveId && this.markers.has(activeId)) {
      const c = list.find((city) => city.id === activeId);
      if (c) this.rotateToCity(c);
    }

    this._rebuildArcs();
  };

  GlobeController.prototype._makeMarker = function (c) {
    const group = new THREE.Group();
    const base = llToVec(c.lat, c.lon, R * 1.004);
    const out = llToVec(c.lat, c.lon, R * 1.10);

    // glowing dot sprite
    const dotMat = new THREE.SpriteMaterial({ map: this._dotSprite, color: this.accent.clone(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const dot = new THREE.Sprite(dotMat);
    dot.position.copy(base);
    dot.scale.setScalar(0.05);
    group.add(dot);

    // pillar line
    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.Float32BufferAttribute([base.x, base.y, base.z, out.x, out.y, out.z], 3));
    const pillar = new THREE.Line(pg, new THREE.LineBasicMaterial({ color: this.accent.clone(), transparent: true, opacity: 0.5 }));
    group.add(pillar);

    // pulse ring (oriented to surface normal)
    const ringGeo = new THREE.RingGeometry(0.018, 0.03, 32);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: this.accent.clone(), transparent: true, opacity: 0.0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    ring.position.copy(base);
    ring.lookAt(base.clone().multiplyScalar(2));
    group.add(ring);

    return { group, dot, pillar, ring, city: c, born: performance.now() };
  };

  GlobeController.prototype._rebuildArcs = function () {
    for (const a of this.arcs) this.arcGroup.remove(a.line);
    this.arcs = [];
    const cs = this.cities;
    for (let i = 0; i < cs.length; i++) {
      for (let j = i + 1; j < cs.length; j++) {
        const arc = this._makeArc(cs[i], cs[j]);
        this.arcs.push(arc);
        this.arcGroup.add(arc.line);
      }
    }
  };

  GlobeController.prototype._makeArc = function (a, b) {
    const va = llToVec(a.lat, a.lon, R).normalize();
    const vb = llToVec(b.lat, b.lon, R).normalize();
    const ang = va.angleTo(vb);
    const lift = 0.12 + ang * 0.16;
    const N = 60;
    const pts = [];
    const cols = [];
    const aIsActive = a.id === this.activeId || b.id === this.activeId;
    const col = aIsActive ? new THREE.Color("#ffffff") : this.accent;
    for (let k = 0; k <= N; k++) {
      const t = k / N;
      // slerp
      const v = va.clone().multiplyScalar(Math.sin((1 - t) * ang)).add(vb.clone().multiplyScalar(Math.sin(t * ang))).multiplyScalar(1 / Math.max(1e-6, Math.sin(ang)));
      v.normalize().multiplyScalar(R * (1 + Math.sin(Math.PI * t) * lift));
      pts.push(v.x, v.y, v.z);
      const edge = Math.sin(Math.PI * t); // fade ends
      cols.push(col.r, col.g, col.b);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
    const m = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: aIsActive ? 0.55 : 0.22, blending: THREE.AdditiveBlending, depthWrite: false });
    const line = new THREE.Line(g, m);
    line.userData = { born: performance.now(), N };
    g.setDrawRange(0, 1);
    return { line, a, b };
  };

  GlobeController.prototype.rotateToCity = function (c) {
    // desired yaw so the city faces camera (+Z), with slight tilt to its latitude
    const targetYaw = Math.atan2(Math.cos(c.lat * RAD) * Math.cos((c.lon + 180) * RAD),
      Math.cos(c.lat * RAD) * Math.sin((c.lon + 180) * RAD));
    // normalize relative to current to take short path
    let ty = targetYaw;
    while (ty - this.targetYaw > Math.PI) ty -= 2 * Math.PI;
    while (ty - this.targetYaw < -Math.PI) ty += 2 * Math.PI;
    this.targetYaw = ty;
    this.tilt = Math.max(-0.8, Math.min(0.8, c.lat * RAD * 0.7));
    this.autoRotate = false;
    clearTimeout(this._resumeT);
    this._resumeT = setTimeout(() => { this.autoRotate = true; }, 5000);
  };

  GlobeController.prototype._animate = function () {
    const loop = () => {
      this._raf = requestAnimationFrame(loop);
      const now = performance.now();
      if (this.autoRotate && !this.dragging) this.targetYaw += 0.0016;
      this.yaw += (this.targetYaw - this.yaw) * 0.08;
      this.group.rotation.y = this.yaw;
      this.group.rotation.x = this.tilt * (1 - 0); // tilt applied to group X
      // actually apply tilt on a parent axis: rotate group then camera; simpler: set group.rotation.x
      this.group.rotation.x = 0;
      this.group.rotation.z = 0;
      this.camera.position.y = Math.sin(this.tilt) * this.camDist;
      this.camera.position.z = Math.cos(this.tilt) * this.camDist;
      this.camera.lookAt(0, 0.12, 0);

      // marker animations
      this.markers.forEach((m) => {
        const age = (now - m.born) / 1000;
        const pop = Math.min(1, age / 0.4);
        const ease = 1 - Math.pow(1 - pop, 3);
        m.dot.scale.setScalar(0.03 + ease * (m.active ? 0.05 : 0.04));
        // pulse ring
        const phase = (age % 2.4) / 2.4;
        const rs = 0.6 + phase * 2.6;
        m.ring.scale.setScalar(rs);
        m.ring.material.opacity = (m.active ? 0.5 : 0.28) * (1 - phase) * Math.min(1, age / 0.4);
      });

      // arc draw-on
      for (const a of this.arcs) {
        const ud = a.line.userData;
        const age = (now - ud.born) / 1000;
        const p = Math.min(1, age / 0.7);
        const ease = 1 - Math.pow(1 - p, 3);
        a.line.geometry.setDrawRange(0, Math.max(1, Math.floor(ease * (ud.N + 1))));
      }

      // transform sun direction to world space (account for globe yaw)
      const cosY = Math.cos(this.yaw);
      const sinY = Math.sin(this.yaw);
      this.sunWorld.x = cosY * this.sunDir.x + sinY * this.sunDir.z;
      this.sunWorld.y = this.sunDir.y;
      this.sunWorld.z = -sinY * this.sunDir.x + cosY * this.sunDir.z;

      this.renderer.render(this.scene, this.camera);
    };
    loop();
  };
