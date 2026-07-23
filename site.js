// Shared Header + Footer for all OpenToday pages.
// Each page sets window.CURRENT_PAGE = "home" | "explore" | "services" ...

// ===== Favicon（浏览器分页图标）=====
(function(){ try{ if(!document.querySelector('link[rel="icon"]')){ var l=document.createElement('link'); l.rel='icon'; l.type='image/png'; l.href='favicon.png'; document.head.appendChild(l);} }catch(e){} })();

// ===== 代理推荐追踪 =====
// 任何页面带 ?ref=代码 进来就记下，30 天内提交表单会自动带上，存进 customers.agent
(function () {
  var KEY = "ot_ref", DAYS = 30;
  try {
    var v = new URLSearchParams(location.search).get("ref");
    if (v) {
      v = String(v).trim().slice(0, 32).replace(/[^A-Za-z0-9_\-]/g, "");
      if (v) localStorage.setItem(KEY, JSON.stringify({ code: v, t: Date.now() }));
    }
  } catch (e) {}
  window.OT_getRef = function () {
    try {
      var raw = localStorage.getItem(KEY); if (!raw) return "";
      var o = JSON.parse(raw);
      if (!o || !o.code) return "";
      if (Date.now() - o.t > DAYS * 864e5) { localStorage.removeItem(KEY); return ""; }
      return o.code;
    } catch (e) { return ""; }
  };
})();

(function () {
  var page = window.CURRENT_PAGE || "";
  var links = [
    { label: "首页", href: "index.html", key: "home" },
    { label: "今日开业", href: "index.html#today", key: "today" },
    { label: "探索商家", href: "explore.html", key: "explore" },
    { label: "为商家服务", href: "pricing.html", key: "services" },
    { label: "关于我们", href: "about.html", key: "about" },
  ];

  var navHtml = links
    .map(function (l) {
      var active = l.key === page ? " active" : "";
      return '<a class="' + active.trim() + '" href="' + l.href + '">' + l.label + "</a>";
    })
    .join("");

  var header =
    '<header class="site"><div class="container nav">' +
    '<a class="logo" href="index.html"><img src="logo.png" alt="OpenToday" style="width:34px;height:34px;display:block;" />' +
    '<span><span class="logo-name">OpenToday</span> <span class="logo-zh">今日开业</span></span></a>' +
    '<nav class="nav-links">' + navHtml + "</nav>" +
    '<div class="nav-cta">' +
    '<a class="btn btn-brand" href="submit.html">免费提交</a>' +
    '<a class="btn btn-dark" href="https://wa.me/601175938168" target="_blank" rel="noopener">● WhatsApp</a></div>' +
    '<button class="menu-btn" id="menuBtn" aria-label="菜单">☰</button>' +
    '</div>' +
    '<div class="mobile-menu" id="mobileMenu"><div class="container" style="padding:0;">' +
    navHtml.replace(/class="[^"]*"/g, "") +
    '<div class="mcta"><a class="btn btn-brand btn-block" href="submit.html">免费提交</a>' +
    '<a class="btn btn-dark btn-block" href="https://wa.me/601175938168" target="_blank" rel="noopener">● WhatsApp 咨询</a></div></div></div></header>';

  var footer =
    '<footer class="site"><div class="container"><div class="foot-grid">' +
    '<div class="foot-col"><a class="logo" href="index.html"><img src="logo.png" alt="OpenToday" style="width:34px;height:34px;display:block;" /> <span class="logo-name">OpenToday</span></a>' +
    '<p style="font-size:14px;color:var(--muted);margin-top:12px;max-width:320px;">发现马来西亚最新开业商家，帮助新店被顾客、Google 和 AI 找到。专注 Johor。</p></div>' +
    '<div class="foot-col"><h4>探索</h4><a href="explore.html">探索商家</a><a href="explore.html">最新开业</a><a href="explore.html#categories">热门分类</a></div>' +
    '<div class="foot-col"><h4>为商家服务</h4><a href="pricing.html">套餐价格</a><a href="pricing.html">Opening Profile</a><a href="pricing.html">Launch Boost</a><a href="pricing.html">Premium Brand Launch</a></div>' +
    '<div class="foot-col"><h4>关于</h4><a href="about.html">关于我们</a><a href="pricing.html">套餐价格</a><a href="submit.html">免费提交</a></div>' +
    '</div><div class="foot-bottom"><span>© 2026 OpenToday｜今日开业. 专注 Johor.</span>' +
    '<span>本站示范商家资料均为 Demo，仅供展示。</span></div></div></footer>';

  var h = document.getElementById("site-header");
  var f = document.getElementById("site-footer");
  if (h) h.innerHTML = header;
  if (f) f.innerHTML = footer;

  var mb = document.getElementById("menuBtn");
  var mm = document.getElementById("mobileMenu");
  if (mb && mm) mb.addEventListener("click", function () { mm.classList.toggle("open"); });

  // Generic interactions used across pages
  document.addEventListener("click", function (e) {
    // Tabs
    var tab = e.target.closest(".tab");
    if (tab) {
      var wrap = tab.closest("[data-tabs]");
      wrap.querySelectorAll(".tab").forEach(function (t) { t.classList.remove("active"); });
      wrap.querySelectorAll(".tabpane").forEach(function (p) { p.classList.remove("active"); });
      tab.classList.add("active");
      var pane = wrap.querySelector("#" + tab.dataset.target);
      if (pane) pane.classList.add("active");
    }
    // FAQ
    var q = e.target.closest(".faq q");
    if (q) q.parentElement.classList.toggle("open");
    // Filter chips
    var chip = e.target.closest(".chip");
    if (chip && chip.dataset.group) {
      chip.parentElement.querySelectorAll(".chip").forEach(function (c) { c.classList.remove("active"); });
      chip.classList.add("active");
    }
  });
})();
