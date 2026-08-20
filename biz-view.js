// OpenToday 商家页「即时兜底」客户端渲染（旧版设计）
// 用途：商家刚批准、静态页还没生成时，business.html / 404.html 用它现场渲染，零等待。
// 静态页生成好后，会由静态 HTML 接管（这份只是兜底，不影响 SEO）。
(function () {
  var SB = "https://jumzzfvgkqsfeypbpgcq.supabase.co";
  var K = "sb_publishable_QspxuW5zHogZs2d3Uyl4lA_LEHGjHSI";
  var TIER = { "Free Listing": 0, "Opening Profile": 1, "Launch Boost": 2, "Premium Brand Launch": 3 };

  function esc(s) { return (s == null ? "" : String(s)).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function arr(v) { try { return Array.isArray(v) ? v : (v ? JSON.parse(v) : []); } catch (e) { return []; } }
  function teaser(s, n) { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n).trim() + "…" : s; }
  function fmtDate(d) { var m = String(d || "").match(/^(\d{4})-(\d{2})-(\d{2})/); if (!m) return ""; var y = +m[1], mo = +m[2], da = +m[3], now = new Date(); if ((now - new Date(y, mo - 1, da)) / 864e5 > 400) return ""; if (y !== now.getFullYear()) return y + "年" + mo + "月" + da + "日开业"; return mo + "月" + da + "日开业"; }
  function mapsUrl(b) { var g = b.google_maps_url && String(b.google_maps_url).trim(); if (g && /^https?:\/\//i.test(g)) return g; var q = (b.address && String(b.address).trim()) || g; return q ? "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q) : ""; }

  var IC = {
    fb: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>',
    ig: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>',
    gg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15 9 22 9.5 16.5 14 18.5 21 12 17 5.5 21 7.5 14 2 9.5 9 9"/></svg>',
    web: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>'
  };
  function socIcon(href, inner, label) { return '<a href="' + esc(href) + '" target="_blank" rel="noopener" style="text-decoration:none;text-align:center;width:60px;flex:0 0 auto;"><span style="width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto;border:1px solid var(--line);background:#fff;color:var(--ink);">' + inner + '</span><span style="display:block;font-size:12px;color:var(--muted);margin-top:7px;">' + label + '</span></a>'; }

  function render(b) {
    var name = b.business_name || "";
    var initial = (name.trim().charAt(0) || "O").toUpperCase();
    var cover = b.image_url || "";
    var gal = arr(b.gallery), prods = arr(b.products), faqs = arr(b.faq), branches = arr(b.branches);
    var rank = TIER[b.project] || 0, premium = rank >= 3;
    var logo = (rank >= 1 && b.logo_url) ? b.logo_url : "";
    var today = new Date().toISOString().slice(0, 10);
    var isFeat = !!b.featured && (!b.featured_start || String(b.featured_start) <= today) && (!b.featured_until || String(b.featured_until) >= today);
    var wa = b.whatsapp ? ("https://wa.me/" + String(b.whatsapp).replace(/[^0-9]/g, "")) : "";
    var tel = b.phone ? ("tel:" + String(b.phone).replace(/\s+/g, "")) : "";
    var map = mapsUrl(b);
    var waze = b.address ? ("https://waze.com/ul?q=" + encodeURIComponent(b.address) + "&navigate=yes") : "";
    var metaStr = [b.category, b.area || b.city, fmtDate(b.opening_date)].filter(Boolean).join(" · ");

    var html = '<div class="crumb"><a href="/">首页</a> / <a href="/explore.html">寻找商家</a> / <span>' + esc(name) + '</span></div>';

    if (premium) {
      var subbits = []; if (b.category) subbits.push(b.category); if (branches.length >= 2) subbits.push(branches.length + " 家分店");
      var slogan = (b.slogan || "").trim();
      var lead = teaser(b.short_description || b.brand_story, 54);
      var blogo = logo ? '<div class="brand-logo" style="background:#fff center/contain no-repeat;background-image:url(\'' + esc(logo) + '\');border:1px solid var(--line);"></div>' : '<div class="brand-logo">' + esc(initial) + '</div>';
      html += '<div class="brand-hero" style="display:block;padding:4px 0 28px;max-width:820px;"><div style="display:flex;align-items:center;gap:16px;">' + blogo + '<div style="min-width:0;"><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;"><h1 style="margin:0;line-height:1.15;">' + esc(name) + '</h1><span class="eyebrow" style="margin:0;flex:0 0 auto;">⭐ PREMIUM</span></div>' + (subbits.length ? '<p class="muted" style="margin:5px 0 0;font-size:14px;">' + esc(subbits.join(" · ")) + '</p>' : '') + '</div></div>' + (slogan ? '<p style="font-size:17px;font-weight:500;line-height:1.55;color:var(--ink);margin:16px 0 0;">' + esc(slogan) + '</p>' : (lead ? '<p class="lead" style="margin:16px 0 0;">' + esc(lead) + '</p>' : '')) + '<div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap;">' + (wa ? '<a class="btn btn-brand btn-lg" href="' + wa + '" target="_blank" rel="noopener">● WhatsApp</a>' : '') + (map ? '<a class="btn btn-outline btn-lg" href="' + esc(map) + '" target="_blank" rel="noopener">🧭 地图</a>' : '') + '</div></div>';
    }

    var imgs = [cover].concat(gal).filter(Boolean); var seen = {}, uimgs = []; imgs.forEach(function (u) { if (!seen[u]) { seen[u] = 1; uimgs.push(u); } }); uimgs = uimgs.slice(0, 9);
    var mainImg = uimgs[0] || cover || "";
    if (mainImg) html += '<div style="text-align:center;background:#f7f5f2;border-radius:14px;"><img id="bCover" alt="' + esc(name) + '" src="' + esc(mainImg) + '" style="display:block;width:auto;max-width:100%;max-height:560px;margin:0 auto;border-radius:14px;" /></div>';
    else html += '<div id="bCover" style="aspect-ratio:21/9;width:100%;border-radius:14px;background:#e7ddd4;"></div>';
    if (uimgs.length > 1) html += '<div id="bThumbs" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px;margin-top:10px;">' + uimgs.map(function (u) { return '<div class="th" data-u="' + esc(u) + '" style="aspect-ratio:4/3;border-radius:10px;background:#eee center/cover no-repeat;background-image:url(\'' + esc(u) + '\');cursor:pointer;border:2px solid transparent;"></div>'; }).join("") + '</div>';

    var offerTitle = (b.offer_title || "").trim();
    var offerActive = offerTitle && rank >= 2 && (!b.offer_until || String(b.offer_until) >= today);
    if (offerActive) {
      var claims = parseInt(b.offer_claims, 10) || 0;
      var offerWa = wa ? (wa + "?text=" + encodeURIComponent("你好，我想领取「" + offerTitle + "」优惠。")) : "";
      html += '<div id="offerCard" data-bid="' + b.id + '" style="margin:16px 0 4px;border:1.5px dashed var(--brand);background:var(--brand-soft);border-radius:16px;padding:18px 20px;"><div style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;"><div><div style="font-size:12px;font-weight:800;color:var(--brand);letter-spacing:.05em;">🎁 OpenToday 专属优惠</div><div style="font-size:21px;font-weight:800;color:var(--ink-strong);margin-top:5px;">' + esc(offerTitle) + '</div>' + (b.offer_desc ? '<div class="muted" style="font-size:14px;margin-top:5px;">' + esc(b.offer_desc) + '</div>' : '') + (b.offer_until ? '<div class="muted" style="font-size:12px;margin-top:7px;">有效期至 ' + esc(b.offer_until) + '</div>' : '') + '<div class="muted" style="font-size:12px;margin-top:6px;" id="offerCount">已 ' + claims + ' 人领取</div></div><button id="offerBtn" class="btn btn-brand btn-lg" style="white-space:nowrap;">领取优惠</button></div><div id="offerReveal" style="display:none;margin-top:14px;border-top:1px dashed var(--brand);padding-top:14px;"><div style="font-weight:700;color:var(--ink-strong);">✓ 已领取！到店出示此画面给店员即可。</div>' + (offerWa ? '<a class="btn btn-outline" style="margin-top:12px;" href="' + offerWa + '" target="_blank" rel="noopener">● WhatsApp 通知商家</a>' : '') + '</div></div>';
    }

    html += '<div class="detail"><div>';
    if (!premium) {
      var badges = '<span class="badge-inline b-verified">✓ 已刊登</span>'; if (isFeat) badges += ' <span class="badge-inline b-featured">★ 精选</span>';
      var nameLogo = logo ? '<img src="' + esc(logo) + '" alt="" style="width:46px;height:46px;border-radius:10px;object-fit:cover;border:1px solid var(--line);flex:0 0 auto;" />' : '';
      html += '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">' + nameLogo + '<h1 style="font-size:32px;margin:0;">' + esc(name) + '</h1>' + badges + '</div>';
      if (metaStr) html += '<p class="muted" style="margin-top:6px;">' + esc(metaStr) + '</p>';
    } else if (metaStr) { html += '<p class="muted" style="margin:0 0 4px;">' + esc(metaStr) + '</p>'; }

    var aboutPane = '';
    if (b.short_description) aboutPane += '<p style="margin-bottom:16px;line-height:1.7;">' + esc(b.short_description) + '</p>';
    if (b.hours) aboutPane += '<table class="hours">' + String(b.hours).split(/\n/).filter(Boolean).map(function (ln) { var p = ln.split("|"); return '<tr><td>' + esc((p[0] || "").trim()) + '</td><td>' + esc((p[1] || "").trim()) + '</td></tr>'; }).join("") + '</table>';
    if (b.address) aboutPane += '<div style="margin-top:16px;"><div class="info-row" style="border-top:none;padding-top:0;"><span class="k" style="min-width:52px;">地址</span><span>' + esc(b.address) + '</span></div><iframe title="地图" style="width:100%;height:300px;border:0;border-radius:12px;margin-top:12px;" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=' + encodeURIComponent(b.address) + '&z=16&output=embed"></iframe></div>';
    if (!aboutPane) aboutPane = '<p class="muted">暂无更多资料。</p>';

    var tabsArr = [{ id: "p-about", label: "关于我们", pane: aboutPane }];
    if (prods.length) tabsArr.push({ id: "p-products", label: "产品与服务", pane: '<div class="grid g-3" style="margin-top:4px;">' + prods.map(function (p) { return '<div class="card" style="padding:16px;"><b>' + esc(p.name || "") + '</b>' + (p.desc ? '<p class="muted" style="font-size:13px;margin-top:6px;">' + esc(p.desc) + '</p>' : '') + '</div>'; }).join("") + '</div>' });
    if (faqs.length) tabsArr.push({ id: "p-faq", label: "常见问题", pane: faqs.map(function (f, i) { return '<div class="faq' + (i === 0 ? " open" : "") + '"><q>' + esc(f.q || "") + ' <span class="pm">+</span></q><div class="a">' + esc(f.a || "") + '</div></div>'; }).join("") });
    html += '<div data-tabs style="margin-top:16px;"><div class="tabs">' + tabsArr.map(function (t, i) { return '<div class="tab' + (i === 0 ? " active" : "") + '" data-target="' + t.id + '">' + t.label + '</div>'; }).join("") + '</div>' + tabsArr.map(function (t, i) { return '<div class="tabpane' + (i === 0 ? " active" : "") + '" id="' + t.id + '">' + t.pane + '</div>'; }).join("") + '</div>';

    if (b.brand_story && rank >= 2) html += '<div style="margin-top:32px;"><span class="eyebrow">品牌故事</span><h2 style="margin:12px 0 10px;font-size:23px;">我们的故事</h2><p class="muted" style="line-height:1.8;">' + esc(b.brand_story) + '</p></div>';
    html += '</div>';

    html += '<aside><div class="contact-card" style="position:sticky;top:20px;">';
    if (wa) html += '<a class="btn btn-wa" href="' + wa + '" target="_blank" rel="noopener">● WhatsApp 联系</a>';
    if (tel) html += '<a class="btn btn-outline" href="' + tel + '">📞 电话</a>';
    if (map) html += '<a class="btn btn-outline" href="' + esc(map) + '" target="_blank" rel="noopener">🧭 查看路线</a>';
    if (waze) html += '<a class="btn btn-outline" href="' + waze + '" target="_blank" rel="noopener">🚗 Waze 导航</a>';
    html += '<div style="border-top:1px solid var(--line);margin:14px 0;"></div>';
    html += '<div class="info-row" style="border:none;padding-top:0;"><span class="k">分类</span><span>' + esc(b.category || "—") + '</span></div>';
    html += '<div class="info-row"><span class="k">地区</span><span>' + esc(b.area || b.city || "—") + '</span></div>';
    var soc = '';
    if (b.facebook_url) soc += socIcon(b.facebook_url, IC.fb, 'Facebook');
    if (b.instagram_url) soc += socIcon(b.instagram_url, IC.ig, 'Instagram');
    if (b.google_review_url) soc += socIcon(b.google_review_url, IC.gg, 'Google 评价');
    if (b.website_url) soc += socIcon(b.website_url, IC.web, '官网');
    if (soc) html += '<div style="margin-top:16px;"><div style="font-size:13px;color:var(--muted);margin-bottom:12px;">社交主页</div><div style="display:flex;gap:16px;flex-wrap:wrap;">' + soc + '</div></div>';
    html += '</div></aside></div>';

    if (branches.length) {
      html += '<section style="padding-top:8px;"><div class="sec-head"><h2>分店</h2><span class="muted" style="font-size:13px;">' + branches.length + ' 家分店，统一品牌管理</span></div><div class="grid g-3">' + branches.map(function (br, i) { var bi = gal.length ? ("background:#eee url('" + esc(gal[(i + 1) % gal.length]) + "') center/cover;") : "background:var(--surface);"; var braw = (br.maps && String(br.maps).trim()) || (br.address && String(br.address).trim()) || ""; var href = braw ? esc(/^https?:\/\//i.test(braw) ? braw : "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(braw)) : "#"; return '<a class="branch gold-accent" href="' + href + '" target="_blank" rel="noopener"><div class="bi" style="' + bi + '"></div><div class="bb"><b>' + esc(br.name || "") + '</b><div class="m">' + esc([br.area, br.address].filter(Boolean).join(" · ")) + '</div></div></a>'; }).join("") + '</div></section>';
    }
    return html;
  }

  function wireOffer(pageEl) {
    var card = pageEl.querySelector("#offerCard"); if (!card) return;
    var bid = card.getAttribute("data-bid"), key = "ot_claim_" + bid, btn = pageEl.querySelector("#offerBtn"), rev = pageEl.querySelector("#offerReveal");
    try { if (localStorage.getItem(key)) { if (btn) btn.style.display = "none"; if (rev) rev.style.display = "block"; } } catch (e) {}
    if (btn) btn.addEventListener("click", function () {
      if (rev) rev.style.display = "block"; btn.style.display = "none";
      try { if (localStorage.getItem(key)) return; localStorage.setItem(key, "1"); } catch (e) {}
      fetch(SB + "/rest/v1/rpc/claim_offer", { method: "POST", headers: { apikey: K, Authorization: "Bearer " + K, "Content-Type": "application/json" }, body: JSON.stringify({ bid: parseInt(bid, 10) }) }).then(function (r) { return r.json(); }).then(function (n) { var el = pageEl.querySelector("#offerCount"); if (el && typeof n === "number") el.textContent = "已 " + n + " 人领取"; }).catch(function () {});
    });
  }

  // 全局交互：Tabs / FAQ / 缩略图
  document.addEventListener("click", function (e) {
    var tab = e.target.closest && e.target.closest(".tab");
    if (tab) { var w = tab.closest("[data-tabs]"); if (w) { w.querySelectorAll(".tab").forEach(function (t) { t.classList.remove("active"); }); w.querySelectorAll(".tabpane").forEach(function (p) { p.classList.remove("active"); }); tab.classList.add("active"); var pane = w.querySelector("#" + tab.getAttribute("data-target")); if (pane) pane.classList.add("active"); } return; }
    var q = e.target.closest && e.target.closest(".faq q"); if (q) { q.parentElement.classList.toggle("open"); return; }
    var d = e.target.closest && e.target.closest(".th"); if (d) { var c = document.getElementById("bCover"); if (c && c.tagName === "IMG") { c.src = d.getAttribute("data-u"); } else if (c) { c.style.backgroundImage = "url('" + d.getAttribute("data-u") + "')"; } }
  });

  // 对外：按 slug 或 id 抓资料并渲染到 pageEl
  window.OT_view = function (opts) {
    var pageEl = opts.pageEl; if (!pageEl) return;
    var q = opts.by === "slug" ? ("slug=eq." + encodeURIComponent(opts.value)) : ("id=eq." + encodeURIComponent(opts.value));
    fetch(SB + "/rest/v1/public_customers?" + q + "&select=*", { headers: { apikey: K, Authorization: "Bearer " + K } })
      .then(function (r) { return r.json(); })
      .then(function (rows) {
        if (!rows || !rows.length) { pageEl.innerHTML = '<p class="muted" style="padding:60px 0;text-align:center;">找不到该商家，可能尚未刊登。<br><a href="/explore.html" style="color:var(--brand);">去探索其他商家 ›</a></p>'; return; }
        var b = rows[0];
        try{ var _tk=b.slug; if(_tk && !sessionStorage.getItem("otv_"+_tk)){ sessionStorage.setItem("otv_"+_tk,"1"); fetch("https://jumzzfvgkqsfeypbpgcq.supabase.co/rest/v1/rpc/bump_view",{method:"POST",headers:{apikey:"sb_publishable_QspxuW5zHogZs2d3Uyl4lA_LEHGjHSI",Authorization:"Bearer sb_publishable_QspxuW5zHogZs2d3Uyl4lA_LEHGjHSI","Content-Type":"application/json"},body:JSON.stringify({p_key:_tk})}).catch(function(){}); } }catch(e){}
        document.title = (b.business_name || "") + " — OpenToday｜今日开业";
        if (b.slug) { var cn = document.querySelector('link[rel="canonical"]'); if (cn) cn.href = "https://opentoday.my/business/" + b.slug + "/"; }
        pageEl.innerHTML = render(b);
        wireOffer(pageEl);
      })
      .catch(function () { pageEl.innerHTML = '<p class="muted" style="padding:60px 0;text-align:center;">加载失败，请稍后重试。</p>'; });
  };
})();
