/* ZENTHOZ — E-Cards page interactions (loads after zenthoz.js) */
(function(){
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(pointer:fine)").matches;

  /* ---------- hero phone: 3D tilt + auto-rotating card previews ---------- */
  var phone = document.getElementById("phone");
  if (phone){
    var slides = phone.querySelectorAll(".phone__slide"),
        dotWrap = document.getElementById("phoneDots"),
        idx = 0, timer = null;

    var show = function(i){
      idx = (i + slides.length) % slides.length;
      slides.forEach(function(s, j){ s.classList.toggle("on", j === idx); });
      if (dotWrap){
        dotWrap.querySelectorAll("button").forEach(function(b, j){ b.classList.toggle("on", j === idx); });
      }
    };
    var play = function(){
      if (reduced) return;
      clearInterval(timer);
      timer = setInterval(function(){ show(idx + 1); }, 3800);
    };

    if (dotWrap){
      slides.forEach(function(s, j){
        var b = document.createElement("button");
        b.type = "button";
        b.setAttribute("aria-label", "Show card design " + (j + 1));
        b.addEventListener("click", function(){ show(j); play(); });
        dotWrap.appendChild(b);
      });
    }
    show(0);
    play();

    if (fine && !reduced){
      var host = phone.closest(".chero") || document.body;
      host.addEventListener("mousemove", function(e){
        var r = host.getBoundingClientRect(),
            rx = ((e.clientY - r.top) / r.height - .5) * -13,
            ry = ((e.clientX - r.left) / r.width - .5) * 17;
        phone.style.transform = "rotateX(" + rx + "deg) rotateY(" + ry + "deg)";
      });
      host.addEventListener("mouseleave", function(){ phone.style.transform = ""; });
    }
  }

  /* ---------- promise cards: pointer-follow glow ---------- */
  if (fine){
    document.querySelectorAll(".promise article").forEach(function(el){
      el.addEventListener("mousemove", function(e){
        var r = el.getBoundingClientRect();
        el.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100) + "%");
        el.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100) + "%");
      });
    });
  }

  /* ---------- occasion tiles: staggered reveal ---------- */
  var occ = document.querySelectorAll(".occ__item");
  if (occ.length){
    if (reduced){
      occ.forEach(function(el){ el.classList.add("in"); });
    } else {
      var oio = new IntersectionObserver(function(entries){
        entries.forEach(function(en){
          if (!en.isIntersecting) return;
          var i = [].indexOf.call(occ, en.target);
          en.target.style.transitionDelay = (i % 3) * 100 + "ms";
          en.target.classList.add("in");
          oio.unobserve(en.target);
        });
      }, {threshold: .18});
      occ.forEach(function(el){ oio.observe(el); });
    }
  }

  /* ---------- horizontal rail driven by vertical scroll ---------- */
  var rail = document.querySelector(".rail");
  if (rail && window.matchMedia("(min-width:901px)").matches && !reduced){
    var track = rail.querySelector(".rail__track"),
        fill = rail.querySelector(".rail__prog i");
    var runRail = function(){
      var r = rail.getBoundingClientRect(),
          total = r.height - innerHeight,
          p = Math.min(1, Math.max(0, -r.top / (total || 1))),
          dist = Math.max(0, track.scrollWidth - innerWidth + innerWidth * 0.08);
      track.style.transform = "translate3d(" + (-p * dist) + "px,0,0)";
      if (fill) fill.style.transform = "scaleX(" + p + ")";
    };
    addEventListener("scroll", runRail, {passive:true});
    addEventListener("resize", runRail);
    runRail();
  }

  /* ---------- flip cards (click / keyboard) ---------- */
  document.querySelectorAll(".flip").forEach(function(f){
    var toggle = function(){ f.classList.toggle("on"); };
    f.addEventListener("click", toggle);
    f.setAttribute("tabindex", "0");
    f.setAttribute("role", "button");
    f.addEventListener("keydown", function(e){
      if (e.key === "Enter" || e.key === " "){ e.preventDefault(); toggle(); }
    });
  });

  /* ---------- process steps lit by scroll ---------- */
  var lineWrap = document.querySelector(".steps-line");
  if (lineWrap){
    var psteps = lineWrap.querySelectorAll(".pstep"),
        lineFill = lineWrap.querySelector("i.fill");
    var runSteps = function(){
      var r = lineWrap.getBoundingClientRect(),
          p = Math.min(1, Math.max(0, (innerHeight * .72 - r.top) / (r.height * .82 || 1)));
      if (lineFill) lineFill.style.height = (p * 100) + "%";
      psteps.forEach(function(s){
        var sr = s.getBoundingClientRect();
        s.classList.toggle("on", sr.top < innerHeight * .74);
      });
    };
    if (reduced){
      psteps.forEach(function(s){ s.classList.add("on"); });
      if (lineFill) lineFill.style.height = "100%";
    } else {
      addEventListener("scroll", runSteps, {passive:true});
      runSteps();
    }
  }

  /* ---------- live countdown demo ---------- */
  var cd = document.getElementById("countdown");
  if (cd){
    var target = new Date(cd.dataset.date || "").getTime();
    if (!target || isNaN(target)){
      target = Date.now() + 128 * 864e5 + 5 * 36e5; // graceful default
    }
    var pad = function(n){ return String(n).padStart(2, "0"); };
    var tick = function(){
      var diff = Math.max(0, target - Date.now()),
          d = Math.floor(diff / 864e5),
          h = Math.floor(diff % 864e5 / 36e5),
          m = Math.floor(diff % 36e5 / 6e4),
          s = Math.floor(diff % 6e4 / 1e3);
      cd.querySelector("[data-d]").textContent = d;
      cd.querySelector("[data-h]").textContent = pad(h);
      cd.querySelector("[data-m]").textContent = pad(m);
      cd.querySelector("[data-s]").textContent = pad(s);
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- magnetic gradient buttons ---------- */
  if (fine && !reduced){
    document.querySelectorAll("[data-magnet]").forEach(function(btn){
      btn.addEventListener("mousemove", function(e){
        var r = btn.getBoundingClientRect();
        btn.style.transform = "translate(" +
          (e.clientX - r.left - r.width / 2) * .16 + "px," +
          ((e.clientY - r.top - r.height / 2) * .3 - 3) + "px)";
      });
      btn.addEventListener("mouseleave", function(){ btn.style.transform = ""; });
    });
  }
})();
