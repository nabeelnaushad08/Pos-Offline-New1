/* ZENTHOZ — shared behaviour (all pages) */
(function(){
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- theme toggle (light default, persisted) ---------- */
  function applyTheme(t){
    document.documentElement.dataset.theme = t;
    try{ localStorage.setItem("zenthoz-theme", t); }catch(e){}
    document.querySelectorAll(".theme-toggle b").forEach(function(b){
      b.textContent = t === "dark" ? "Light" : "Dark";
    });
  }
  applyTheme(document.documentElement.dataset.theme || "light");
  document.querySelectorAll(".theme-toggle").forEach(function(btn){
    btn.addEventListener("click", function(){
      applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
    });
  });

  /* ---------- preloader (home only) ---------- */
  var pre = document.getElementById("preloader");
  function finishLoad(){
    if (pre){
      pre.classList.add("done");
      setTimeout(function(){ pre.style.display = "none"; }, 1100);
    }
    document.body.classList.remove("locked");
    document.body.classList.add("ready");
  }
  if (!pre || reduced){
    if (pre && reduced) { pre.style.display = "none"; }
    // small tick so hero transition still plays on subpages
    requestAnimationFrame(function(){ requestAnimationFrame(finishLoad); });
  } else {
    var count = document.getElementById("loadcount"),
        bar = document.getElementById("loadbar"),
        word = document.getElementById("loadword"),
        words = ["Zenthoz","Consult","Craft","Conquer","Growth"],
        n = 0, wi = 0;
    var tick = setInterval(function(){
      n = Math.min(100, n + Math.ceil(Math.random() * 9) + 2);
      count.textContent = n;
      bar.style.width = n + "%";
      if (n % 18 < 9){ word.textContent = words[(wi++) % words.length]; }
      if (n >= 100){
        clearInterval(tick);
        word.textContent = "Zenthoz";
        setTimeout(finishLoad, 350);
      }
    }, 90);
  }

  /* ---------- custom cursor ---------- */
  if (window.matchMedia("(pointer:fine)").matches && !reduced){
    var dot = document.querySelector(".cursor"),
        ring = document.querySelector(".cursor-ring"),
        mx = innerWidth/2, my = innerHeight/2, rx = mx, ry = my;
    if (dot && ring){
      addEventListener("mousemove", function(e){
        mx = e.clientX; my = e.clientY;
        dot.style.transform = "translate(" + (mx-4) + "px," + (my-4) + "px)";
        document.body.classList.remove("cursor-hide");
      });
      addEventListener("mouseleave", function(){ document.body.classList.add("cursor-hide"); });
      (function loop(){
        rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16;
        ring.style.transform = "translate(" + (rx-18) + "px," + (ry-18) + "px)";
        requestAnimationFrame(loop);
      })();
      document.querySelectorAll("a,button,[data-cursor]").forEach(function(el){
        el.addEventListener("mouseenter", function(){ document.body.classList.add("cursor-grow"); });
        el.addEventListener("mouseleave", function(){ document.body.classList.remove("cursor-grow"); });
      });
    }
  }

  /* ---------- nav hide on scroll ---------- */
  var nav = document.querySelector(".nav"), lastY = 0;
  if (nav){
    addEventListener("scroll", function(){
      var y = scrollY;
      nav.classList.toggle("hidden", y > lastY && y > 140);
      lastY = y;
    }, {passive:true});
  }

  /* ---------- menu overlay ---------- */
  var menu = document.getElementById("menu");
  if (menu){
    var setMenu = function(open){
      menu.classList.toggle("open", open);
      menu.setAttribute("aria-hidden", String(!open));
      document.body.classList.toggle("locked", open);
    };
    var opener = document.getElementById("menuOpen");
    if (opener) opener.addEventListener("click", function(){ setMenu(true); });
    var closer = document.getElementById("menuClose");
    if (closer) closer.addEventListener("click", function(){ setMenu(false); });
    menu.querySelectorAll("a").forEach(function(a){
      a.addEventListener("click", function(){ setMenu(false); });
    });
    addEventListener("keydown", function(e){ if (e.key === "Escape") setMenu(false); });
  }

  /* ---------- scroll reveals ---------- */
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if (en.isIntersecting){ en.target.classList.add("in"); io.unobserve(en.target); }
    });
  }, {threshold: 0.15});
  document.querySelectorAll(".reveal").forEach(function(el){ io.observe(el); });

  /* ---------- manifesto word reveal ---------- */
  var man = document.getElementById("manifesto");
  if (man){
    man.innerHTML = man.textContent.trim().split(/\s+/).map(function(w){
      var s = /^(growth|average|revenue|conquer|results)\b/i.test(w) ? " serif" : "";
      return '<span class="w' + s + '">' + w + '</span>';
    }).join(" ");
    var wordEls = man.querySelectorAll(".w");
    var litWords = function(){
      var r = man.getBoundingClientRect(),
          p = Math.min(1, Math.max(0, (innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.35))),
          upto = Math.floor(p * wordEls.length);
      wordEls.forEach(function(el, i){ el.classList.toggle("lit", i < upto); });
    };
    if (reduced){ wordEls.forEach(function(el){ el.classList.add("lit"); }); }
    else { addEventListener("scroll", litWords, {passive:true}); litWords(); }
  }

  /* ---------- services accordion ---------- */
  document.querySelectorAll(".svc").forEach(function(svc){
    var row = svc.querySelector(".svc__row"), body = svc.querySelector(".svc__body");
    if (!row || !body) return;
    row.addEventListener("click", function(){
      var open = svc.classList.toggle("open");
      row.setAttribute("aria-expanded", String(open));
      body.style.maxHeight = open ? body.scrollHeight + "px" : "0px";
    });
  });

  /* ---------- generative brand art painter (shared) ---------- */
  var artPalettes = [
    ["#8b30f0", "#fbfaf8", "#17151c"],
    ["#e0338c", "#17151c", "#fbfaf8"],
    ["#2aa5d8", "#8b30f0", "#0e0e12"],
    ["#17151c", "#e0338c", "#f2f0ea"]
  ];
  function paintArt(c, idx, w, h, mark){
    c.width = w; c.height = h;
    var pal = artPalettes[idx % artPalettes.length],
        g = c.getContext("2d");
    g.fillStyle = pal[2]; g.fillRect(0, 0, w, h);
    for (var i = 0; i < 26; i++){
      var t = (i * 97 + idx * 31) % 100 / 100;
      var cy = h * .12 + ((i * 53 + idx * 71) % 100) / 100 * h * .76;
      var grad = g.createRadialGradient(w * .12 + t * w * .76, cy, 6, w * .12 + t * w * .76, cy, (h * .18) + t * h * .3);
      grad.addColorStop(0, pal[i % 2] + "cc");
      grad.addColorStop(1, pal[i % 2] + "00");
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
    }
    g.fillStyle = "rgba(14,14,18,.22)";
    for (var y = 0; y < h; y += 4){ g.fillRect(0, y, w, 1); }
    if (mark){
      g.fillStyle = pal[1];
      g.font = "700 22px Helvetica, Arial, sans-serif";
      g.fillText("ZENTHOZ", 24, h - 34);
    }
  }

  /* ---------- work previews (real screenshots, follow cursor) ---------- */
  var preview = document.getElementById("preview");
  var workRows = document.querySelectorAll(".wk");
  if (preview && workRows.length){
    var pvCache = {};
    var getPv = function(row, idx){
      var key = row.dataset.img || ("c" + idx);
      if (pvCache[key]) return pvCache[key];
      var wrap = document.createElement("div");
      wrap.className = "pv";
      var useCanvas = function(){
        wrap.innerHTML = "";
        var c = document.createElement("canvas");
        paintArt(c, idx, 480, 600, true);
        wrap.appendChild(c);
      };
      if (row.dataset.img){
        var im = new Image();
        im.alt = "";
        im.onerror = useCanvas;
        im.src = row.dataset.img;
        wrap.appendChild(im);
      } else {
        useCanvas();
      }
      preview.appendChild(wrap);
      pvCache[key] = wrap;
      return wrap;
    };
    var px = 0, py = 0, tx = 0, ty = 0;
    workRows.forEach(function(row, idx){
      row.addEventListener("mouseenter", function(){
        var pv = getPv(row, idx);
        preview.querySelectorAll(".pv").forEach(function(el){ el.classList.toggle("on", el === pv); });
        preview.classList.add("show");
      });
      row.addEventListener("mouseleave", function(){ preview.classList.remove("show"); });
    });
    addEventListener("mousemove", function(e){ tx = e.clientX; ty = e.clientY; });
    (function follow(){
      px += (tx - px) * 0.10; py += (ty - py) * 0.10;
      preview.style.left = px + "px"; preview.style.top = py + "px";
      requestAnimationFrame(follow);
    })();
  }

  /* ---------- magnetic mail link ---------- */
  var mag = document.getElementById("magnet");
  if (mag && window.matchMedia("(pointer:fine)").matches && !reduced){
    mag.addEventListener("mousemove", function(e){
      var r = mag.getBoundingClientRect();
      mag.style.transform = "translate(" +
        (e.clientX - r.left - r.width/2) * 0.18 + "px," +
        (e.clientY - r.top - r.height/2) * 0.35 + "px)";
    });
    mag.addEventListener("mouseleave", function(){ mag.style.transform = ""; });
  }

  /* ---------- liquid ink hero background ---------- */
  var inkCv = document.querySelector("canvas.ink");
  if (inkCv && !reduced){
    (function(){
      var ctx = inkCv.getContext("2d"),
          host = inkCv.parentElement,
          W = 0, H = 0, blobs = [],
          colors = ["#8b30f0", "#e0338c", "#2aa5d8"],
          lx, ly, painted = false;

      function size(){
        W = inkCv.width = host.offsetWidth;
        H = inkCv.height = host.offsetHeight;
        painted = false;
      }
      size();
      addEventListener("resize", size);

      function hexA(hex, a){
        var n = parseInt(hex.slice(1), 16);
        return "rgba(" + (n >> 16) + "," + (n >> 8 & 255) + "," + (n & 255) + "," + a + ")";
      }
      function spawn(x, y, vx, vy, big){
        blobs.push({
          x: x, y: y,
          vx: vx + (Math.random() - .5) * .6,
          vy: vy + (Math.random() - .5) * .6,
          r: (big ? 60 : 20) + Math.random() * (big ? 90 : 40),
          life: 1,
          c: colors[(Math.random() * colors.length) | 0]
        });
        if (blobs.length > 240) blobs.splice(0, blobs.length - 240);
      }

      host.addEventListener("mousemove", function(e){
        var r = inkCv.getBoundingClientRect(),
            x = e.clientX - r.left, y = e.clientY - r.top;
        if (lx !== undefined){
          var dx = x - lx, dy = y - ly, d = Math.hypot(dx, dy) || 1;
          for (var i = 0; i < d; i += 16){
            spawn(lx + dx * i / d, ly + dy * i / d, dx * .06, dy * .06, false);
          }
        }
        lx = x; ly = y;
      });
      host.addEventListener("mouseleave", function(){ lx = ly = undefined; });

      var tickAmb = 0;
      (function frame(){
        // wet smear: fade slowly toward the page background
        var bg = getComputedStyle(document.body).backgroundColor;
        if (!painted){ ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H); painted = true; }
        ctx.globalAlpha = .07;
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;

        // ambient drift so the floor feels liquid even without the mouse
        if (++tickAmb % 34 === 0){
          spawn(Math.random() * W, Math.random() * H, (Math.random() - .5), (Math.random() - .5), true);
        }

        for (var i = blobs.length - 1; i >= 0; i--){
          var b = blobs[i];
          b.x += b.vx; b.y += b.vy;
          b.vx *= .97; b.vy *= .97;
          b.r *= 1.006;
          b.life -= .009;
          if (b.life <= 0){ blobs.splice(i, 1); continue; }
          var g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
          g.addColorStop(0, hexA(b.c, .26 * b.life));
          g.addColorStop(1, hexA(b.c, 0));
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, 6.2832);
          ctx.fill();
        }
        requestAnimationFrame(frame);
      })();
    })();
  }

  /* ---------- scroll story (framer-motion style, scroll-linked) ---------- */
  var story = document.querySelector(".story");
  if (story){
    var steps = story.querySelectorAll(".story__step"),
        figs = story.querySelectorAll(".story__vis .fig"),
        barFill = story.querySelector(".story__bar i"),
        stepCount = steps.length;
    var runStory = function(){
      var r = story.getBoundingClientRect(),
          total = r.height - innerHeight,
          p = Math.min(1, Math.max(0, -r.top / (total || 1))),
          idx = Math.min(stepCount - 1, Math.floor(p * stepCount)),
          local = p * stepCount - idx; // 0..1 inside the active step
      steps.forEach(function(s, i){ s.classList.toggle("on", i === idx); });
      figs.forEach(function(f, i){
        f.classList.toggle("on", i === idx);
        if (i === idx){
          f.style.transform = "translateY(" + ((.5 - local) * 26) + "px) scale(" + (0.96 + .04 * Math.sin(local * Math.PI)) + ")";
        }
      });
      if (barFill) barFill.style.transform = "scaleY(" + p + ")";
    };
    if (reduced){
      steps.forEach(function(s){ s.classList.add("on"); });
      if (figs[0]) figs[0].classList.add("on");
    } else {
      addEventListener("scroll", runStory, {passive:true});
      runStory();
    }
  }

  /* ---------- 3D hero visual tilt ---------- */
  var tilt = document.querySelector(".hero3d__tilt");
  if (tilt && window.matchMedia("(pointer:fine)").matches && !reduced){
    var tiltHost = tilt.closest(".hero");
    tiltHost.addEventListener("mousemove", function(e){
      var r = tiltHost.getBoundingClientRect(),
          rx = ((e.clientY - r.top) / r.height - .5) * -14,
          ry = ((e.clientX - r.left) / r.width - .5) * 18;
      tilt.style.transform = "rotateX(" + rx + "deg) rotateY(" + ry + "deg)";
    });
    tiltHost.addEventListener("mouseleave", function(){ tilt.style.transform = ""; });
  }

  /* ---------- ZENTHOZ letters: shrink once, spring back ---------- */
  document.querySelectorAll(".zletters span").forEach(function(l){
    var pop = function(){ if (!reduced) l.classList.add("zap"); };
    l.addEventListener("mouseenter", pop);
    l.addEventListener("click", pop);
    l.addEventListener("animationend", function(){ l.classList.remove("zap"); });
  });

  /* ---------- drag marquee: auto-scrolls, pauses on hover, drags ---------- */
  function dragMarquee(track, speed){
    var strip = track.parentElement,
        x = 0, half = 0, paused = false, dragging = false,
        lastX = 0, vel = 0;
    track.innerHTML += track.innerHTML; // duplicate for seamless wrap
    track.style.animation = "none";
    track.style.willChange = "transform";
    strip.style.cursor = "grab";
    strip.style.touchAction = "pan-y";
    track.querySelectorAll("img").forEach(function(i){ i.draggable = false; });
    var measure = function(){ half = track.scrollWidth / 2; };
    addEventListener("resize", measure);
    // images change the track width as they load
    track.querySelectorAll("img").forEach(function(i){ i.addEventListener("load", measure); });
    measure();
    strip.addEventListener("mouseenter", function(){ paused = true; });
    strip.addEventListener("mouseleave", function(){ paused = false; });
    strip.addEventListener("pointerdown", function(e){
      dragging = true; lastX = e.clientX; vel = 0;
      try{ strip.setPointerCapture(e.pointerId); }catch(err){}
      strip.style.cursor = "grabbing";
      e.preventDefault();
    });
    strip.addEventListener("pointermove", function(e){
      if (!dragging) return;
      var dx = e.clientX - lastX; lastX = e.clientX;
      x += dx; vel = dx;
    });
    var endDrag = function(){ dragging = false; strip.style.cursor = "grab"; };
    strip.addEventListener("pointerup", endDrag);
    strip.addEventListener("pointercancel", endDrag);
    (function frame(){
      if (!dragging){
        if (Math.abs(vel) > .25){ x += vel; vel *= .94; }        // momentum after a drag
        else if (!paused && !reduced){ x -= speed; }             // idle auto-scroll
      }
      if (half > 0){
        while (x <= -half) x += half;
        while (x > 0) x -= half;
      }
      track.style.transform = "translateX(" + x + "px)";
      requestAnimationFrame(frame);
    })();
  }
  var brandsTrack = document.getElementById("brandsTrack");
  if (brandsTrack) dragMarquee(brandsTrack, .7);
  var reviewsTrack = document.getElementById("reviewsTrack");
  if (reviewsTrack) dragMarquee(reviewsTrack, .45);

  /* ---------- contact form (email relay + mail-app fallback) ---------- */
  var cf = document.getElementById("contactForm");
  if (cf){
    var statusEl = document.getElementById("formStatus"),
        submitBtn = cf.querySelector('button[type="submit"]');
    cf.querySelectorAll('input[name="enquiry_type"]').forEach(function(r){
      r.addEventListener("change", function(){
        cf.classList.toggle("is-meeting", r.value === "Book a meeting" && r.checked);
      });
    });
    cf.addEventListener("submit", function(e){
      e.preventDefault();
      var data = new FormData(cf),
          type = data.get("enquiry_type") || "Project enquiry";
      if (data.get("_honey")) return; // spam bot filled the hidden field
      data.set("_subject", type + " from " + (data.get("name") || "website") + " — zenthoz.com");
      statusEl.textContent = "Sending…";
      submitBtn.disabled = true;
      fetch("https://formsubmit.co/ajax/info@zenthoz.com", {
        method: "POST",
        body: data,
        headers: {Accept: "application/json"}
      }).then(function(r){
        if (!r.ok) throw new Error("relay error");
        return r.json();
      }).then(function(){
        cf.reset();
        cf.classList.remove("is-meeting");
        statusEl.textContent = "✓ Sent — we'll get back to you within 24 hours.";
        submitBtn.disabled = false;
      }).catch(function(){
        // offline or relay unreachable: open the visitor's mail app pre-filled instead
        var lines = [];
        ["name","email","phone","company","meeting_date","meeting_time","message"].forEach(function(k){
          var v = data.get(k);
          if (v) lines.push(k.replace("_", " ") + ": " + v);
        });
        location.href = "mailto:info@zenthoz.com?subject=" +
          encodeURIComponent(type + " — zenthoz.com") +
          "&body=" + encodeURIComponent(lines.join("\n"));
        statusEl.textContent = "Opening your email app to send this instead…";
        submitBtn.disabled = false;
      });
    });
  }
})();
