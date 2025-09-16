(() => {
  const canvas = document.getElementById('space-canvas');
  const ctx = canvas.getContext('2d', { alpha: true });

  // DPI-aware sizing
  const state = {
    w: 0, h: 0, dpr: Math.max(1, Math.min(2, window.devicePixelRatio || 1)),
    t: 0, // time
    stars: [],
    layers: [],
    meteors: [],
    blobs: [] // nebula blobs
  };

  function resize() {
    state.w = canvas.clientWidth;
    state.h = canvas.clientHeight;
    canvas.width  = Math.floor(state.w * state.dpr);
    canvas.height = Math.floor(state.h * state.dpr);
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  // ---- helpers
  const rand = (a=0,b=1)=>Math.random()*(b-a)+a;
  const TAU = Math.PI*2;

  // ---- build parallax star layers
  function buildStars() {
    state.layers = [
      { count: Math.floor((state.w*state.h)/14000), speed: 0.03, size:[0.6,1.2], alpha:[0.35,0.6] },
      { count: Math.floor((state.w*state.h)/22000), speed: 0.06, size:[0.9,1.8], alpha:[0.45,0.8] },
      { count: Math.floor((state.w*state.h)/30000), speed: 0.12, size:[1.4,2.6], alpha:[0.5,0.95] }
    ];
    state.stars = [];
    state.layers.forEach((L, li)=>{
      for(let i=0;i<L.count;i++){
        state.stars.push({
          x: rand(0, state.w),
          y: rand(0, state.h),
          r: rand(L.size[0], L.size[1]),
          a: rand(L.alpha[0], L.alpha[1]),
          tw: rand(0.001, 0.003) * (li+1), // twinkle speed
          tp: rand(0, TAU), // twinkle phase
          sp: L.speed,
          layer: li
        });
      }
    });
  }

  // ---- build drifting nebula blobs (purely programmatic)
  function buildNebula() {
    const blobCount = 8;
    state.blobs = [];
    for (let i=0;i<blobCount;i++){
      const base = Math.min(state.w, state.h);
      state.blobs.push({
        x: rand(-0.2*state.w, 1.2*state.w),
        y: rand(-0.2*state.h, 1.2*state.h),
        r: rand(base*0.25, base*0.55),
        hue: rand(195, 215), // blue range
        sat: rand(45, 70),
        alp: rand(0.04, 0.12),
        dx: rand(-0.05, 0.05),
        dy: rand(-0.02, 0.02),
        pulse: rand(0.0004, 0.0012),
        phase: rand(0, TAU)
      });
    }
  }

  // ---- meteors (shooting stars)
  function spawnMeteor() {
    const side = Math.random() < 0.5 ? 'left' : 'right';
    const x = side === 'left' ? rand(-0.15*state.w, 0.2*state.w) : rand(0.8*state.w, 1.15*state.w);
    const y = rand(0.05*state.h, 0.55*state.h);
    const speed = rand(9, 14);
    const ang = side === 'left' ? rand(Math.PI*0.05, Math.PI*0.25) : rand(Math.PI*0.75, Math.PI*0.95);
    state.meteors.push({
      x, y, vx: Math.cos(ang)*speed, vy: Math.sin(ang)*speed,
      life: rand(500, 900), // ms
      born: performance.now(),
      len: rand(120, 220),
      w: rand(1.2, 2.2)
    });
    // spawn again at random interval 1.5–6s
    setTimeout(spawnMeteor, rand(1500, 6000));
  }

  // ---- draw
  function drawNebula() {
    // dark blue base vignette
    const grad = ctx.createRadialGradient(state.w*0.5, state.h*0.5, Math.min(state.w,state.h)*0.1, state.w*0.5, state.h*0.5, Math.max(state.w,state.h)*0.9);
    grad.addColorStop(0, 'rgba(5, 15, 35, 0.85)');
    grad.addColorStop(1, 'rgba(0, 5, 20, 1)');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,state.w,state.h);

    // drifted translucent blobs
    ctx.globalCompositeOperation = 'screen';
    for (const b of state.blobs){
      b.phase += b.pulse;
      b.x += b.dx * 0.4;
      b.y += b.dy * 0.4;
      // slight pulse
      const r = b.r * (1 + Math.sin(b.phase)*0.07);

      const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r);
      const c1 = `hsla(${b.hue}, ${b.sat}%, 55%, ${b.alp})`;
      const c2 = `hsla(${b.hue+6}, ${b.sat+10}%, 40%, ${b.alp*0.65})`;
      g.addColorStop(0, c1);
      g.addColorStop(1, c2);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, TAU); ctx.fill();

      // wrap-around drift
      if (b.x < -b.r) b.x = state.w + b.r;
      if (b.x > state.w + b.r) b.x = -b.r;
      if (b.y < -b.r) b.y = state.h + b.r;
      if (b.y > state.h + b.r) b.y = -b.r;
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawStars(dt) {
    for (const s of state.stars){
      // parallax drift
      s.x -= s.sp * (dt*0.06);
      if (s.x < -4) { s.x = state.w + 4; s.y = rand(0, state.h); }

      // twinkle
      s.tp += s.tw * dt;
      const tw = (Math.sin(s.tp) + 1) * 0.5; // 0..1
      const alpha = s.a*0.6 + tw * s.a*0.4;

      // soft glow
      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r*4);
      g.addColorStop(0, `rgba(220,245,255, ${alpha})`);
      g.addColorStop(1, `rgba(220,245,255, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r*4, 0, TAU); ctx.fill();

      // crisp core
      ctx.fillStyle = `rgba(255,255,255,${Math.min(1, alpha+0.15)})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r*0.6, 0, TAU); ctx.fill();
    }
  }

  function drawMeteors(now) {
    for (let i = state.meteors.length-1; i >= 0; i--){
      const m = state.meteors[i];
      const age = now - m.born;
      const lifeRatio = Math.max(0, 1 - age/m.life);
      if (lifeRatio <= 0) { state.meteors.splice(i,1); continue; }

      // move
      m.x += m.vx;
      m.y += m.vy;

      // tail
      const ex = m.x - m.vx * (m.len/Math.hypot(m.vx, m.vy));
      const ey = m.y - m.vy * (m.len/Math.hypot(m.vx, m.vy));

      const grad = ctx.createLinearGradient(m.x, m.y, ex, ey);
      grad.addColorStop(0, `rgba(255,255,255, ${0.95*lifeRatio})`);
      grad.addColorStop(1, `rgba(140,200,255, 0)`);

      ctx.strokeStyle = grad;
      ctx.lineWidth = m.w;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      // little head glow
      ctx.fillStyle = `rgba(200,235,255, ${0.6*lifeRatio})`;
      ctx.beginPath(); ctx.arc(m.x, m.y, m.w*1.2, 0, TAU); ctx.fill();
    }
  }

  // ---- main loop
  let last = performance.now();
  function tick(now) {
    const dt = Math.min(33, now - last); // clamp delta for stability
    last = now;

    drawNebula();
    drawStars(dt);
    drawMeteors(now);

    requestAnimationFrame(tick);
  }

  // init
  resize();
  buildNebula();
  buildStars();
  spawnMeteor(); // sets itself up repeatedly

  // rebuild on resize for correct densities
  window.addEventListener('resize', () => {
    buildNebula();
    buildStars();
  });

  requestAnimationFrame(tick);
})();
