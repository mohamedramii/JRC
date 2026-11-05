(function () {
  var html = document.documentElement;
  var WA_NUMBER = "962776053228";

  // ---- Language ----
  function setLang(lang) {
    html.lang = lang;
    html.dir = lang === "ar" ? "rtl" : "ltr";
    var t = html.getAttribute("data-title-" + lang);
    if (t) document.title = t;
    var d = html.getAttribute("data-desc-" + lang), meta = document.querySelector('meta[name="description"]');
    if (d && meta) meta.setAttribute("content", d);
    document.querySelectorAll("[data-ph-en]").forEach(function (el) {
      el.placeholder = el.getAttribute("data-ph-" + lang);
    });
    document.querySelectorAll("option[data-en]").forEach(function (el) {
      el.textContent = el.getAttribute("data-" + lang);
    });
    try { localStorage.setItem("jrc-lang", lang); } catch (e) {}
  }
  var initial = new URLSearchParams(location.search).get("lang");
  if (!initial) { try { initial = localStorage.getItem("jrc-lang"); } catch (e) {} }
  setLang(initial === "ar" ? "ar" : "en");
  document.querySelectorAll(".lang-toggle").forEach(function (btn) {
    btn.addEventListener("click", function () { setLang(html.lang === "ar" ? "en" : "ar"); });
  });

  // ---- Header / mobile nav ----
  var header = document.querySelector(".header");
  var nav = document.querySelector(".nav");
  var menuBtn = document.querySelector(".menu-btn");
  var toTop = document.querySelector(".to-top");
  menuBtn.addEventListener("click", function () {
    var open = nav.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", open);
  });
  nav.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", function () { nav.classList.remove("open"); menuBtn.setAttribute("aria-expanded", false); });
    a.classList.toggle("active", a.getAttribute("data-page") === html.getAttribute("data-page"));
  });
  // Services menu: hover and focus open it (CSS); the arrow button opens it on touch screens and in the phone menu
  var subItems = document.querySelectorAll(".has-sub");
  var closeSubs = function (except) {
    subItems.forEach(function (item) {
      if (item === except) return;
      item.classList.remove("open");
      item.querySelector(".sub-toggle").setAttribute("aria-expanded", false);
    });
  };
  subItems.forEach(function (item) {
    var btn = item.querySelector(".sub-toggle");
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = item.classList.toggle("open");
      btn.setAttribute("aria-expanded", open);
      closeSubs(item);
    });
    item.querySelectorAll(".subnav a").forEach(function (a) {
      a.classList.toggle("active", location.pathname.split("/").pop() === a.getAttribute("href"));
    });
  });
  document.addEventListener("click", function (e) { if (!e.target.closest(".has-sub")) closeSubs(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSubs(); });
  window.addEventListener("scroll", function () {
    header.classList.toggle("scrolled", window.scrollY > 10);
    toTop.classList.toggle("show", window.scrollY > 600);
  }, { passive: true });
  toTop.addEventListener("click", function () { window.scrollTo({ top: 0 }); });

  // ---- Load the later slideshow photos after the page has finished loading ----
  window.addEventListener("load", function () {
    document.querySelectorAll(".hero-slide.later").forEach(function (el) { el.classList.remove("later"); });
  });

  // ---- Hero slider (home); each slide has a caption that links to its service ----
  var slides = document.querySelectorAll(".hero-slide");
  var captions = document.querySelectorAll(".hero-caption");
  var dotsWrap = document.querySelector(".hero-dots");
  if (slides.length && dotsWrap) {
    var current = 0, timer;
    slides.forEach(function (_, i) {
      var b = document.createElement("button");
      b.setAttribute("aria-label", "Slide " + (i + 1));
      b.addEventListener("click", function () { go(i); restart(); });
      dotsWrap.appendChild(b);
    });
    var dots = dotsWrap.querySelectorAll("button");
    var go = function (i) {
      slides[current].classList.remove("active"); dots[current].classList.remove("active");
      if (captions[current]) captions[current].classList.remove("active");
      current = i;
      void dots[current].offsetWidth; // restarts the progress bar even when the same dot is pressed again
      slides[current].classList.add("active"); dots[current].classList.add("active");
      if (captions[current]) captions[current].classList.add("active");
    };
    var restart = function () { clearInterval(timer); timer = setInterval(function () { go((current + 1) % slides.length); }, 6000); };
    go(0); restart();
  }

  // ---- Counters (home) ----
  var statsEl = document.querySelector(".stats");
  if (statsEl) {
    new IntersectionObserver(function (entries, obs) {
      if (!entries[0].isIntersecting) return;
      obs.disconnect();
      document.querySelectorAll("[data-count]").forEach(function (el) {
        var target = +el.getAttribute("data-count"), start = null;
        function step(t) {
          if (!start) start = t;
          var p = Math.min((t - start) / 1400, 1);
          el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    }, { threshold: .4 }).observe(statsEl);
  }

  // ---- Animation setup: staggered cards and side-in image/text pairs ----
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  [".services-main", ".docs-grid", ".ind-grid", ".lang-grid", ".clients-grid", ".faq-list", ".vm-grid", ".contact-info"].forEach(function (sel) {
    document.querySelectorAll(sel).forEach(function (grid) {
      Array.prototype.forEach.call(grid.children, function (el, i) {
        el.classList.add("reveal");
        if (!reduceMotion) el.style.transitionDelay = (i % 6) * 90 + "ms";
      });
    });
  });
  document.querySelectorAll(".about-media").forEach(function (el) { el.classList.add("from-start"); });
  document.querySelectorAll(".about-text").forEach(function (el) { el.classList.add("from-end"); });
  document.querySelectorAll(".cta-band, .map").forEach(function (el) { el.classList.add("zoom"); });

  // Values cards: scattered left and right, then fly in together when the row comes into view
  document.querySelectorAll(".values").forEach(function (row) {
    var cards = Array.prototype.slice.call(row.children);
    cards.forEach(function (card, i) {
      card.classList.remove("reveal");
      card.classList.add("scatter");
      var side = i % 2 === 0 ? -1 : 1;
      card.style.setProperty("--sx", side * (180 + Math.random() * 260) + "px");
      card.style.setProperty("--sy", (Math.random() * 240 - 120) + "px");
      card.style.setProperty("--sr", (Math.random() * 40 - 20) + "deg");
    });
    new IntersectionObserver(function (entries, obs) {
      if (!entries[0].isIntersecting) return;
      cards.forEach(function (c) { c.classList.add("in"); });
      obs.disconnect();
    }, { threshold: .25 }).observe(row);
  });

  // ---- Scroll progress bar + parallax ----
  var bar = document.createElement("div");
  bar.className = "scroll-progress";
  document.body.appendChild(bar);
  var heroSlides = document.querySelectorAll(".hero-slide");
  var pageHero = document.querySelector(".page-hero");
  var heroY = pageHero ? getComputedStyle(pageHero).backgroundPositionY : "50%";
  var ticking = false;
  function onScroll() {
    var y = window.scrollY, max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = "scaleX(" + (max > 0 ? y / max : 0) + ")";
    if (!reduceMotion) {
      if (y < innerHeight * 1.2) heroSlides.forEach(function (s) { s.style.translate = "0 " + y * 0.35 + "px"; });
      if (pageHero && y < innerHeight) pageHero.style.backgroundPositionY = "calc(" + heroY + " + " + y * 0.4 + "px)";
    }
    ticking = false;
  }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  // ---- Reveal on scroll ----
  var rev = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); rev.unobserve(en.target); } });
  }, { threshold: .12 });
  document.querySelectorAll(".reveal").forEach(function (el) { rev.observe(el); });

  // ---- Document category filter (services) ----
  var filterBtns = document.querySelectorAll(".docs-filter button");
  filterBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      filterBtns.forEach(function (b) { b.classList.toggle("active", b === btn); b.setAttribute("aria-pressed", b === btn); });
      var f = btn.getAttribute("data-filter");
      document.querySelectorAll(".doc").forEach(function (d) {
        d.classList.toggle("hide", f !== "all" && d.getAttribute("data-cat") !== f);
      });
    });
  });

  // ---- Quote form → WhatsApp / email (contact) ----
  var form = document.getElementById("quote-form");
  if (form) {
    var buildMessage = function () {
      var d = new FormData(form);
      var svc = form.service.options[form.service.selectedIndex];
      var ar = html.lang === "ar";
      var lines = ar
        ? ["طلب عرض سعر – مركز نهر الأردن للترجمة المعتمدة", "الاسم: " + d.get("name"), "الهاتف: " + d.get("phone"), "الخدمة: " + svc.text, "اللغات: " + d.get("languages"), "التفاصيل: " + d.get("message")]
        : ["Quote request – Jordan River Center for Certified Translation", "Name: " + d.get("name"), "Phone: " + d.get("phone"), "Service: " + svc.text, "Languages: " + d.get("languages"), "Details: " + d.get("message")];
      return lines.join("\n");
    };
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      window.open("https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(buildMessage()), "_blank", "noopener");
    });
    document.getElementById("send-email").addEventListener("click", function () {
      if (!form.reportValidity()) return;
      var subject = html.lang === "ar" ? "طلب عرض سعر ترجمة" : "Translation quote request";
      location.href = "mailto:info@jrc-translation.com?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(buildMessage());
    });
  }

  // ---- Blog post: share, like ----
  // Likes need an online service to store them. Set BLOG_API to that service's base URL at launch
  // (see README "Blog"). Until then they work in preview mode, saved only in this browser.
  var BLOG_API = null;
  var post = document.querySelector(".post[data-post]");
  if (post) {
    var slug = post.getAttribute("data-post");
    var pageUrl = location.href.split("#")[0].split("?")[0];
    var postTitle = function () {
      var t = document.querySelector(".page-hero h1 ." + html.lang);
      return t ? t.textContent : document.title;
    };
    var store = {
      get: function (k, d) { try { return JSON.parse(localStorage.getItem("jrc-blog:" + slug + ":" + k)) || d; } catch (e) { return d; } },
      set: function (k, v) { try { localStorage.setItem("jrc-blog:" + slug + ":" + k, JSON.stringify(v)); } catch (e) {} }
    };
    var api = function (path, body) {
      var opts = body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {};
      return fetch(BLOG_API + path, opts).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
    };

    // Share
    post.querySelectorAll(".share-btn").forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.preventDefault();
        var u = encodeURIComponent(pageUrl), t = encodeURIComponent(postTitle());
        var links = {
          whatsapp: "https://wa.me/?text=" + t + "%20" + u,
          facebook: "https://www.facebook.com/sharer/sharer.php?u=" + u,
          linkedin: "https://www.linkedin.com/sharing/share-offsite/?url=" + u,
          x: "https://twitter.com/intent/tweet?url=" + u + "&text=" + t
        };
        var kind = b.getAttribute("data-share");
        if (kind === "copy") {
          var done = function () {
            var m = post.querySelector(".share-copied");
            m.hidden = false;
            setTimeout(function () { m.hidden = true; }, 2000);
          };
          if (navigator.clipboard) navigator.clipboard.writeText(pageUrl).then(done, done); else done();
        } else {
          window.open(links[kind], "_blank", "noopener,width=640,height=560");
        }
      });
    });

    // Like
    var likeBtn = post.querySelector(".like-btn"), likeCount = post.querySelector(".like-count");
    var liked = store.get("liked", false);
    var renderLike = function (n) { likeBtn.setAttribute("aria-pressed", liked); likeCount.textContent = n; };
    if (BLOG_API) api("/likes?post=" + slug).then(function (d) { renderLike(d.count); }).catch(function () {});
    else renderLike(store.get("likes", 0));
    likeBtn.addEventListener("click", function () {
      liked = !liked;
      store.set("liked", liked);
      var n = Math.max(0, (+likeCount.textContent || 0) + (liked ? 1 : -1));
      renderLike(n);
      if (BLOG_API) api("/likes", { post: slug, like: liked }).then(function (d) { renderLike(d.count); }).catch(function () {});
      else store.set("likes", n);
    });

  }

  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
