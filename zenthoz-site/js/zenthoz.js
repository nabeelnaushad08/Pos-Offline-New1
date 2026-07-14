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

  /* ---------- work previews (generative, follow cursor) ---------- */
  var preview = document.getElementById("preview");
  var workRows = document.querySelectorAll(".wk[data-project]");
  if (preview && workRows.length){
    var palettes = [
      ["#8b30f0", "#fbfaf8", "#17151c"],
      ["#e0338c", "#17151c", "#fbfaf8"],
      ["#2aa5d8", "#8b30f0", "#0e0e12"],
      ["#17151c", "#e0338c", "#f2f0ea"]
    ];
    var canvases = palettes.map(function(pal, idx){
      var c = document.createElement("canvas");
      c.width = 480; c.height = 600;
      var g = c.getContext("2d");
      g.fillStyle = pal[2]; g.fillRect(0, 0, 480, 600);
      for (var i = 0; i < 26; i++){
        var t = (i * 97 + idx * 31) % 100 / 100;
        var cy = 80 + ((i * 53 + idx * 71) % 100) / 100 * 440;
        var grad = g.createRadialGradient(60 + t * 360, cy, 8, 60 + t * 360, cy, 90 + t * 140);
        grad.addColorStop(0, pal[i % 2] + "cc");
        grad.addColorStop(1, pal[i % 2] + "00");
        g.fillStyle = grad;
        g.fillRect(0, 0, 480, 600);
      }
      g.fillStyle = "rgba(14,14,18,.22)";
      for (var y = 0; y < 600; y += 4){ g.fillRect(0, y, 480, 1); }
      g.fillStyle = pal[1];
      g.font = "700 22px Helvetica, Arial, sans-serif";
      g.fillText("ZENTHOZ", 24, 566);
      preview.appendChild(c);
      return c;
    });
    var px = 0, py = 0, tx = 0, ty = 0;
    workRows.forEach(function(row){
      var i = +row.dataset.project % canvases.length;
      row.addEventListener("mouseenter", function(){
        canvases.forEach(function(c, j){ c.classList.toggle("on", j === i); });
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

  /* ---------- local clock ---------- */
  var clock = document.getElementById("clock");
  if (clock){
    var fmt = new Intl.DateTimeFormat("en-GB", {hour:"2-digit", minute:"2-digit", second:"2-digit", hour12:false});
    var tickClock = function(){ clock.textContent = fmt.format(new Date()); };
    tickClock(); setInterval(tickClock, 1000);
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
})();
