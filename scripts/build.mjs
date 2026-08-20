// OpenToday 静态商家页生成器（方案 A+）— 采用旧版 business.html 的设计
// 读 Supabase 已刊登商家 → 生成 /business/{slug}/index.html（完整 HTML + JSON-LD + meta）+ sitemap.xml + id-slug-map.json
// 铁律：只用真实字段，空字段不生成，绝不编造。
// 排版严格照旧版：双栏 + 右侧固定联系卡 + Tabs + Waze + 分店。静态 HTML，爬虫可读。
// 用法：node scripts/build.mjs   （从 opentoday-site 目录跑）

import fs from "node:fs";
import path from "node:path";

const SB_URL = process.env.SUPABASE_URL || "https://jumzzfvgkqsfeypbpgcq.supabase.co";
const SB_KEY = process.env.SUPABASE_ANON_KEY || "sb_publishable_QspxuW5zHogZs2d3Uyl4lA_LEHGjHSI";
const SITE = "https://opentoday.my";
const ROOT = process.cwd();
const OUT_BUSINESS = path.join(ROOT, "business");
const H = { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY };

// ---------- helpers ----------
const esc = (s) => (s == null ? "" : String(s)).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const jstr = (o) => JSON.stringify(o).replace(/</g, "\\u003c");
const arr = (v) => { try { return Array.isArray(v) ? v : (v ? JSON.parse(v) : []); } catch { return []; } };
const nn = (v) => { const s = (v == null ? "" : String(v)).trim(); return s || null; };
const teaser = (s, n) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n).trim() + "…" : s; };

function slugify(name) {
  let s = String(name || "")
    .replace(/[一-鿿぀-ヿ　-〿＀-￯]/g, " ")
    .toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").replace(/-+/g, "-");
  return s.replace(/-(sdn|bhd|sdn-bhd|enterprise|trading|plt)$/g, "").replace(/-+$/g, "");
}

function schemaType(category, subcategory) {
  const t = ((category || "") + " " + (subcategory || "")).toLowerCase();
  const has = (...k) => k.some(x => t.includes(x));
  if (has("咖啡", "café", "cafe", "coffee", "kopi")) return "CafeOrCoffeeShop";
  if (has("面包", "烘焙", "bakery", "蛋糕", "cake")) return "Bakery";
  if (has("餐", "美食", "food", "restaurant", "lok lok", "火锅", "小吃", "饮食")) return "Restaurant";
  if (has("发型", "美发", "hair", "理发")) return "HairSalon";
  if (has("美容", "spa", "nail", "beauty", "美甲")) return "BeautySalon";
  if (has("健身房", "健身中心", "gym", "fitness")) return "HealthClub";
  if (has("pickleball", "羽毛球", "网球", "篮球", "足球", "球", "运动", "sport", "瑜伽", "yoga")) return "SportsActivityLocation";
  if (has("房贷", "贷款", "金融", "finance", "loan", "保险", "insurance")) return "FinancialService";
  if (has("汽车", "车", "auto", "motor", "garage", "轮胎")) return "AutomotiveBusiness";
  if (has("零售", "购物", "shop", "store", "便利", "超市", "retail")) return "Store";
  if (has("设计", "广告", "律师", "会计", "咨询", "professional", "服务")) return "ProfessionalService";
  return "LocalBusiness";
}

const DAY_MAP = { "周一": "Monday", "周二": "Tuesday", "周三": "Wednesday", "周四": "Thursday", "周五": "Friday", "周六": "Saturday", "周日": "Sunday" };
function parseHours(hoursText) {
  if (!hoursText) return { rows: [], spec: [] };
  const rows = [], spec = [];
  for (const line of String(hoursText).split(/\n/)) {
    const i = line.indexOf("|"); if (i < 0) continue;
    const day = line.slice(0, i).trim(), time = line.slice(i + 1).trim();
    rows.push([day, time]);
    const m = time.match(/(\d{1,2}:\d{2})\s*[–\-~]\s*(\d{1,2}:\d{2})/);
    if (!/休息|closed/i.test(time) && m && DAY_MAP[day]) spec.push({ "@type": "OpeningHoursSpecification", dayOfWeek: "https://schema.org/" + DAY_MAP[day], opens: m[1], closes: m[2] });
  }
  return { rows, spec };
}

function mapsUrl(b) {
  const g = nn(b.google_maps_url);
  if (g && /^https?:\/\//i.test(g)) return g;
  const q = nn(b.address) || g;
  return q ? "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q) : null;
}

function fmtDate(d) {
  const m = String(d || "").match(/^(\d{4})-(\d{2})-(\d{2})/); if (!m) return "";
  const y = +m[1], mo = +m[2], da = +m[3], now = new Date();
  if ((now - new Date(y, mo - 1, da)) / 864e5 > 400) return "";
  if (y !== now.getFullYear()) return y + "年" + mo + "月" + da + "日开业";
  return mo + "月" + da + "日开业";
}

// 线条社交图标（联系卡内）
const IC = {
  fb: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>',
  ig: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>',
  gg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15 9 22 9.5 16.5 14 18.5 21 12 17 5.5 21 7.5 14 2 9.5 9 9"/></svg>',
  web: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>'
};
const socIcon = (href, inner, label) => `<a href="${esc(href)}" target="_blank" rel="noopener" style="text-decoration:none;text-align:center;width:60px;flex:0 0 auto;"><span style="width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto;border:1px solid var(--line);background:#fff;color:var(--ink);">${inner}</span><span style="display:block;font-size:12px;color:var(--muted);margin-top:7px;">${label}</span></a>`;

const TIER = { "Free Listing": 0, "Opening Profile": 1, "Launch Boost": 2, "Premium Brand Launch": 3 };

// ---------- 数据 ----------
async function fetchPublished() {
  const url = SB_URL + "/rest/v1/customers?listing_status=eq." + encodeURIComponent("已刊登") +
    "&select=id,slug,business_name,name,category,subcategory,opening_type,opening_date,short_description,brand_story,address,area,city,hours,phone,whatsapp,website_url,google_maps_url,facebook_url,instagram_url,google_review_url,faq,products,image_url,gallery,slogan,logo_url,project,offer_title,offer_desc,offer_until,offer_claims,branches,featured,featured_start,featured_until,show_today,feature_tier,created_at&order=id.desc";
  const r = await fetch(url, { headers: H });
  if (!r.ok) throw new Error("fetch failed " + r.status);
  return r.json();
}
async function patchSlug(id, slug) {
  await fetch(SB_URL + "/rest/v1/customers?id=eq." + id, { method: "PATCH", headers: { ...H, "Content-Type": "application/json" }, body: JSON.stringify({ slug }) });
}
async function ensureSlugs(list) {
  const used = new Set(list.map(b => nn(b.slug)).filter(Boolean));
  for (const b of list) {
    if (nn(b.slug)) continue;
    let base = slugify(b.business_name || b.name) || ("biz-" + b.id), s = base, i = 2;
    while (used.has(s)) s = base + "-" + (i++);
    used.add(s); b.slug = s; await patchSlug(b.id, s);
    console.log("  ↳ 自动补 slug: id=" + b.id + " → " + s);
  }
}

// ---------- 渲染（旧版 business.html 设计）----------
function renderPage(b) {
  const name = b.business_name || b.name || "";
  const nameE = esc(name);
  const initial = esc(((name.trim().charAt(0)) || "O").toUpperCase());
  const slug = b.slug;
  const cover = nn(b.image_url) || "";
  const gal = arr(b.gallery).filter(Boolean);
  const prods = arr(b.products).filter(p => nn(p && p.name));
  const faqs = arr(b.faq).filter(f => nn(f && f.q));
  const branches = arr(b.branches).filter(x => nn(x && x.name));
  const rank = TIER[b.project] || 0;
  const premium = rank >= 3;
  const logo = (rank >= 1 && nn(b.logo_url)) ? b.logo_url : null;
  const today = new Date().toISOString().slice(0, 10);
  const isFeat = !!b.featured && (!nn(b.featured_start) || String(b.featured_start) <= today) && (!nn(b.featured_until) || String(b.featured_until) >= today);
  const wa = nn(b.whatsapp) ? "https://wa.me/" + String(b.whatsapp).replace(/[^0-9]/g, "") : "";
  const tel = nn(b.phone) ? "tel:" + String(b.phone).replace(/\s+/g, "") : "";
  const map = mapsUrl(b);
  const waze = nn(b.address) ? "https://waze.com/ul?q=" + encodeURIComponent(b.address) + "&navigate=yes" : "";
  const cat = nn(b.category), sub = nn(b.subcategory), loc = nn(b.area) || nn(b.city);
  const metaStr = [cat, loc, fmtDate(b.opening_date)].filter(Boolean).join(" · ");
  const slogan = nn(b.slogan);
  const canonical = `${SITE}/business/${slug}/`;
  const descRaw = nn(b.short_description) || nn(b.brand_story) || [name, sub || cat, loc].filter(Boolean).join("｜");
  const metaDesc = esc(descRaw.replace(/\s+/g, " ").slice(0, 155));
  const { rows: hourRows, spec: hourSpec } = parseHours(b.hours);

  // 优惠券
  const offerTitle = nn(b.offer_title);
  const offerActive = offerTitle && rank >= 2 && (!nn(b.offer_until) || String(b.offer_until) >= today);
  const offerClaims = parseInt(b.offer_claims, 10) || 0;
  const offerWa = wa ? (wa + "?text=" + encodeURIComponent("你好，我想领取「" + offerTitle + "」优惠。")) : "";

  // JSON-LD
  const ld = { "@context": "https://schema.org", "@type": schemaType(cat, sub), name, url: canonical };
  if (cover) ld.image = cover;
  if (nn(descRaw)) ld.description = descRaw;
  if (nn(b.phone)) ld.telephone = b.phone;
  if (nn(b.address)) ld.address = { "@type": "PostalAddress", streetAddress: b.address, addressLocality: nn(b.city) || nn(b.area) || undefined, addressRegion: "Johor", addressCountry: "MY" };
  if (hourSpec.length) ld.openingHoursSpecification = hourSpec;
  const same = [b.facebook_url, b.instagram_url, b.google_review_url, b.website_url].map(nn).filter(Boolean);
  if (same.length) ld.sameAs = same;
  if (map) ld.hasMap = map;
  if (nn(b.opening_date)) ld.foundingDate = b.opening_date;
  const faqLd = faqs.length ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: nn(f.a) || "" } })) } : null;

  // ===== 内容（旧版结构）=====
  let html = `<div class="crumb"><a href="/">首页</a> / <a href="/explore.html">寻找商家</a> / <span>${nameE}</span></div>`;

  // Premium 品牌 Banner
  if (premium) {
    const subbits = []; if (cat) subbits.push(cat); if (branches.length >= 2) subbits.push(branches.length + " 家分店");
    const lead = teaser(nn(b.short_description) || nn(b.brand_story), 54);
    const blogo = logo ? `<div class="brand-logo" style="background:#fff center/contain no-repeat;background-image:url('${esc(logo)}');border:1px solid var(--line);"></div>` : `<div class="brand-logo">${initial}</div>`;
    html += `<div class="brand-hero" style="display:block;padding:4px 0 28px;max-width:820px;">`
      + `<div style="display:flex;align-items:center;gap:16px;">${blogo}<div style="min-width:0;"><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;"><h1 style="margin:0;line-height:1.15;">${nameE}</h1><span class="eyebrow" style="margin:0;flex:0 0 auto;">⭐ PREMIUM</span></div>${subbits.length ? `<p class="muted" style="margin:5px 0 0;font-size:14px;">${esc(subbits.join(" · "))}</p>` : ""}</div></div>`
      + (slogan ? `<p style="font-size:17px;font-weight:500;line-height:1.55;color:var(--ink);margin:16px 0 0;">${esc(slogan)}</p>` : (lead ? `<p class="lead" style="margin:16px 0 0;">${esc(lead)}</p>` : ""))
      + `<div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap;">${wa ? `<a class="btn btn-brand btn-lg" href="${esc(wa)}" target="_blank" rel="noopener">● WhatsApp</a>` : ""}${map ? `<a class="btn btn-outline btn-lg" href="${esc(map)}" target="_blank" rel="noopener">🧭 地图</a>` : ""}</div></div>`;
  }

  // 大封面 + 缩略图
  const imgs = [cover].concat(gal).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).slice(0, 9);
  const mainImg = imgs[0] || cover || "";
  if (mainImg) html += `<div style="text-align:center;background:#f7f5f2;border-radius:14px;"><img id="bCover" alt="${nameE}" src="${esc(mainImg)}" style="display:block;width:auto;max-width:100%;max-height:560px;margin:0 auto;border-radius:14px;" /></div>`;
  else html += `<div id="bCover" style="aspect-ratio:21/9;width:100%;border-radius:14px;background:#e7ddd4;"></div>`;
  if (imgs.length > 1) html += `<div id="bThumbs" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px;margin-top:10px;">${imgs.map(u => `<div class="th" data-u="${esc(u)}" style="aspect-ratio:4/3;border-radius:10px;background:#eee center/cover no-repeat;background-image:url('${esc(u)}');cursor:pointer;border:2px solid transparent;"></div>`).join("")}</div>`;

  // 优惠券
  if (offerActive) {
    html += `<div id="offerCard" data-bid="${b.id}" style="margin:16px 0 4px;border:1.5px dashed var(--brand);background:var(--brand-soft);border-radius:16px;padding:18px 20px;"><div style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;"><div><div style="font-size:12px;font-weight:800;color:var(--brand);letter-spacing:.05em;">🎁 OpenToday 专属优惠</div><div style="font-size:21px;font-weight:800;color:var(--ink-strong);margin-top:5px;">${esc(offerTitle)}</div>${nn(b.offer_desc) ? `<div class="muted" style="font-size:14px;margin-top:5px;">${esc(b.offer_desc)}</div>` : ""}${nn(b.offer_until) ? `<div class="muted" style="font-size:12px;margin-top:7px;">有效期至 ${esc(b.offer_until)}</div>` : ""}<div class="muted" style="font-size:12px;margin-top:6px;" id="offerCount">已 ${offerClaims} 人领取</div></div><button id="offerBtn" class="btn btn-brand btn-lg" style="white-space:nowrap;">领取优惠</button></div><div id="offerReveal" style="display:none;margin-top:14px;border-top:1px dashed var(--brand);padding-top:14px;"><div style="font-weight:700;color:var(--ink-strong);">✓ 已领取！到店出示此画面给店员即可。</div>${offerWa ? `<a class="btn btn-outline" style="margin-top:12px;" href="${esc(offerWa)}" target="_blank" rel="noopener">● WhatsApp 通知商家</a>` : ""}</div></div>`;
  }

  // ===== Detail 双栏 =====
  html += `<div class="detail"><div>`;
  if (!premium) {
    let badges = `<span class="badge-inline b-verified">✓ 已刊登</span>`;
    if (isFeat) badges += ` <span class="badge-inline b-featured">★ 精选</span>`;
    const nameLogo = logo ? `<img src="${esc(logo)}" alt="" style="width:46px;height:46px;border-radius:10px;object-fit:cover;border:1px solid var(--line);flex:0 0 auto;" />` : "";
    html += `<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">${nameLogo}<h1 style="font-size:32px;margin:0;">${nameE}</h1>${badges}</div>`;
    if (metaStr) html += `<p class="muted" style="margin-top:6px;">${esc(metaStr)}</p>`;
  } else if (metaStr) {
    html += `<p class="muted" style="margin:0 0 4px;">${esc(metaStr)}</p>`;
  }

  // Tabs
  let aboutPane = "";
  if (nn(b.short_description)) aboutPane += `<p style="margin-bottom:16px;line-height:1.7;">${esc(b.short_description)}</p>`;
  if (hourRows.length) aboutPane += `<table class="hours">${hourRows.map(([d, t]) => `<tr><td>${esc(d)}</td><td>${esc(t)}</td></tr>`).join("")}</table>`;
  if (nn(b.address)) aboutPane += `<div style="margin-top:16px;"><div class="info-row" style="border-top:none;padding-top:0;"><span class="k" style="min-width:52px;">地址</span><span>${esc(b.address)}</span></div><iframe title="地图" style="width:100%;height:300px;border:0;border-radius:12px;margin-top:12px;" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=${encodeURIComponent(b.address)}&z=16&output=embed"></iframe></div>`;
  if (!aboutPane) aboutPane = `<p class="muted">暂无更多资料。</p>`;

  const tabsArr = [{ id: "p-about", label: "关于我们", pane: aboutPane }];
  if (prods.length) tabsArr.push({ id: "p-products", label: "产品与服务", pane: `<div class="grid g-3" style="margin-top:4px;">${prods.map(p => `<div class="card" style="padding:16px;"><b>${esc(p.name || "")}</b>${nn(p.desc) ? `<p class="muted" style="font-size:13px;margin-top:6px;">${esc(p.desc)}</p>` : ""}</div>`).join("")}</div>` });
  if (faqs.length) tabsArr.push({ id: "p-faq", label: "常见问题", pane: faqs.map((f, i) => `<div class="faq${i === 0 ? " open" : ""}"><q>${esc(f.q || "")} <span class="pm">+</span></q><div class="a">${esc(nn(f.a) || "")}</div></div>`).join("") });

  html += `<div data-tabs style="margin-top:16px;"><div class="tabs">${tabsArr.map((t, i) => `<div class="tab${i === 0 ? " active" : ""}" data-target="${t.id}">${t.label}</div>`).join("")}</div>${tabsArr.map((t, i) => `<div class="tabpane${i === 0 ? " active" : ""}" id="${t.id}">${t.pane}</div>`).join("")}</div>`;

  // 品牌故事（Launch/Premium）
  if (nn(b.brand_story) && rank >= 2) html += `<div style="margin-top:32px;"><span class="eyebrow">品牌故事</span><h2 style="margin:12px 0 10px;font-size:23px;">我们的故事</h2><p class="muted" style="line-height:1.8;">${esc(b.brand_story)}</p></div>`;

  html += `</div>`; // end left col

  // Aside 联系卡
  html += `<aside><div class="contact-card" style="position:sticky;top:20px;">`;
  if (wa) html += `<a class="btn btn-wa" href="${esc(wa)}" target="_blank" rel="noopener">● WhatsApp 联系</a>`;
  if (tel) html += `<a class="btn btn-outline" href="${esc(tel)}">📞 电话</a>`;
  if (map) html += `<a class="btn btn-outline" href="${esc(map)}" target="_blank" rel="noopener">🧭 查看路线</a>`;
  if (waze) html += `<a class="btn btn-outline" href="${esc(waze)}" target="_blank" rel="noopener">🚗 Waze 导航</a>`;
  html += `<div style="border-top:1px solid var(--line);margin:14px 0;"></div>`;
  html += `<div class="info-row" style="border:none;padding-top:0;"><span class="k">分类</span><span>${esc(cat || "—")}</span></div>`;
  html += `<div class="info-row"><span class="k">地区</span><span>${esc(loc || "—")}</span></div>`;
  let soc = "";
  if (nn(b.facebook_url)) soc += socIcon(b.facebook_url, IC.fb, "Facebook");
  if (nn(b.instagram_url)) soc += socIcon(b.instagram_url, IC.ig, "Instagram");
  if (nn(b.google_review_url)) soc += socIcon(b.google_review_url, IC.gg, "Google 评价");
  if (nn(b.website_url)) soc += socIcon(b.website_url, IC.web, "官网");
  if (soc) html += `<div style="margin-top:16px;"><div style="font-size:13px;color:var(--muted);margin-bottom:12px;">社交主页</div><div style="display:flex;gap:16px;flex-wrap:wrap;">${soc}</div></div>`;
  html += `</div></aside>`;
  html += `</div>`; // end detail

  // 分店（Premium）
  if (branches.length) {
    html += `<section style="padding-top:8px;"><div class="sec-head"><h2>分店</h2><span class="muted" style="font-size:13px;">${branches.length} 家分店，统一品牌管理</span></div><div class="grid g-3">${branches.map((br, i) => {
      const bi = gal.length ? `background:#eee url('${esc(gal[(i + 1) % gal.length])}') center/cover;` : `background:var(--surface);`;
      const braw = nn(br.maps) || nn(br.address) || ""; const href = braw ? esc(/^https?:\/\//i.test(braw) ? braw : "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(braw)) : "#";
      return `<a class="branch gold-accent" href="${href}" target="_blank" rel="noopener"><div class="bi" style="${bi}"></div><div class="bb"><b>${esc(br.name || "")}</b><div class="m">${esc([nn(br.area), nn(br.address)].filter(Boolean).join(" · "))}</div></div></a>`;
    }).join("")}</div></section>`;
  }

  // ===== 页面外壳 =====
  return `<!DOCTYPE html>
<html lang="zh-Hans-MY">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${nameE} — ${esc(sub || cat || "商家")}${loc ? " · " + esc(loc) : ""}｜OpenToday 今日开业</title>
<meta name="description" content="${metaDesc}">
<link rel="canonical" href="${canonical}">
<meta name="robots" content="index,follow">
<meta property="og:type" content="business.business">
<meta property="og:site_name" content="OpenToday 今日开业">
<meta property="og:title" content="${nameE}">
<meta property="og:description" content="${metaDesc}">
<meta property="og:url" content="${canonical}">
${cover ? `<meta property="og:image" content="${esc(cover)}">` : ""}
<meta name="twitter:card" content="${cover ? "summary_large_image" : "summary"}">
<meta name="twitter:title" content="${nameE}">
<meta name="twitter:description" content="${metaDesc}">
${cover ? `<meta name="twitter:image" content="${esc(cover)}">` : ""}
<link rel="icon" type="image/png" href="/favicon.png">
<link rel="stylesheet" href="/style.css">
<link rel="stylesheet" href="/demo.css">
<style>
  #page .brand-logo{background:var(--ink-strong);color:#fff;flex:0 0 auto;}
  @media(max-width:560px){ #page .brand-hero h1{font-size:26px;} #page .brand-logo{width:52px;height:52px;font-size:21px;} }
  #page .branch.gold-accent{border-top-color:var(--brand);}
  #page #bThumbs .th:hover{border-color:var(--brand)!important;}
</style>
<script type="application/ld+json">${jstr(ld)}</script>
${faqLd ? `<script type="application/ld+json">${jstr(faqLd)}</script>` : ""}
</head>
<body>
<header class="site"><div class="container nav">
  <a class="logo" href="/"><img src="/logo.png" alt="OpenToday" style="width:34px;height:34px;display:block;"><span><span class="logo-name">OpenToday</span> <span class="logo-zh">今日开业</span></span></a>
  <nav class="nav-links"><a href="/">首页</a><a href="/explore.html">寻找商家</a><a href="/pricing.html">为商家服务</a><a href="/about.html">关于我们</a></nav>
  <div class="nav-cta"><a class="btn btn-brand" href="/submit.html">免费提交</a><a class="btn btn-dark" href="https://wa.me/601175938168" target="_blank" rel="noopener">● WhatsApp</a></div>
</div></header>

<main>
  <div class="container" id="page">${html}</div>
</main>

<footer class="site"><div class="container"><div class="foot-bottom" style="border-top:1px solid var(--line);padding-top:20px;">
  <span>© ${new Date().getFullYear()} OpenToday｜今日开业 · 专注 Johor</span>
  <span><a href="/submit.html">免费登记你的商家</a></span>
</div></div></footer>

<script>
document.addEventListener("click",function(e){
  var tab=e.target.closest(".tab");
  if(tab){ var w=tab.closest("[data-tabs]"); if(w){ w.querySelectorAll(".tab").forEach(function(t){t.classList.remove("active");}); w.querySelectorAll(".tabpane").forEach(function(p){p.classList.remove("active");}); tab.classList.add("active"); var pane=w.querySelector("#"+tab.getAttribute("data-target")); if(pane)pane.classList.add("active"); } return; }
  var q=e.target.closest(".faq q"); if(q){ q.parentElement.classList.toggle("open"); return; }
  var d=e.target.closest(".th"); if(d){ var c=document.getElementById("bCover"); if(c&&c.tagName==="IMG"){ c.src=d.getAttribute("data-u"); } else if(c){ c.style.backgroundImage="url('"+d.getAttribute("data-u")+"')"; } return; }
});
(function(){
  var card=document.getElementById("offerCard"); if(!card) return;
  var SB="https://jumzzfvgkqsfeypbpgcq.supabase.co", K="sb_publishable_QspxuW5zHogZs2d3Uyl4lA_LEHGjHSI";
  var bid=card.getAttribute("data-bid"), key="ot_claim_"+bid, btn=document.getElementById("offerBtn"), rev=document.getElementById("offerReveal");
  try{ if(localStorage.getItem(key)){ if(btn)btn.style.display="none"; if(rev)rev.style.display="block"; } }catch(e){}
  if(btn) btn.addEventListener("click",function(){
    if(rev)rev.style.display="block"; btn.style.display="none";
    try{ if(localStorage.getItem(key)) return; localStorage.setItem(key,"1"); }catch(e){}
    fetch(SB+"/rest/v1/rpc/claim_offer",{method:"POST",headers:{apikey:K,Authorization:"Bearer "+K,"Content-Type":"application/json"},body:JSON.stringify({bid:parseInt(bid,10)})}).then(function(r){return r.json();}).then(function(n){ var el=document.getElementById("offerCount"); if(el&&typeof n==="number") el.textContent="已 "+n+" 人领取"; }).catch(function(){});
  });
})();
(function(){
  var k=${JSON.stringify(b.slug || "")};
  try{ if(!k||sessionStorage.getItem("otv_"+k)) return; sessionStorage.setItem("otv_"+k,"1"); }catch(e){}
  fetch("https://jumzzfvgkqsfeypbpgcq.supabase.co/rest/v1/rpc/bump_view",{method:"POST",headers:{apikey:"sb_publishable_QspxuW5zHogZs2d3Uyl4lA_LEHGjHSI",Authorization:"Bearer sb_publishable_QspxuW5zHogZs2d3Uyl4lA_LEHGjHSI","Content-Type":"application/json"},body:JSON.stringify({p_key:k})}).catch(function(){});
})();
</script>
</body>
</html>`;
}

// ---------- 首页 / 探索页 卡片注入（爬虫可读）----------
// 卡片标记严格照 index.html / explore.html 里的 card()/tierCard()，JS 加载后仍会用实时数据覆盖。
const COLORS_HOME = ["#e7ddd4", "#d9ccc0", "#d9e0dc", "#e6e2d6", "#e9dfd0"];
const COLORS_EXPLORE = ["#e7ddd4", "#d9ccc0", "#d9e0dc", "#e6e2d6", "#e9dfd0", "#dfe3ea"];

const cardHref = (b) => b.slug ? ("/business/" + b.slug + "/") : ("business.html?id=" + b.id);
const cardMeta = (b) => [nn(b.subcategory) || nn(b.category), nn(b.area) || nn(b.city)].filter(Boolean).join(" · ");
const cardBg = (b, i, colors) => nn(b.image_url) ? ("background:#eee url('" + b.image_url + "') center/cover;") : ("background:" + colors[i % colors.length] + ";");

function homeCard(b, i) {
  const bg = cardBg(b, i, COLORS_HOME);
  const badge = b._feat ? '<span class="badge" style="background:#F59E0B;color:#fff;">⭐ 精选</span>' : '<span class="badge badge-new">NEW</span>';
  const dt = fmtDate(b.opening_date);
  return '<a class="biz" href="' + cardHref(b) + '"><div class="biz-img" style="' + bg + '">' + badge + '</div><div class="biz-body"><b>' + esc(b.business_name) + '</b><div class="meta">' + esc(cardMeta(b)) + '</div>' + (dt ? '<div class="date">' + esc(dt) + '</div>' : '') + '</div></a>';
}
function homeTierCard(b, i, tier) {
  const bg = cardBg(b, i, COLORS_HOME);
  const dt = fmtDate(b.opening_date);
  const hot = tier === "spotlight";
  const frame = hot
    ? 'border:1px solid rgba(249,115,22,.55);box-shadow:0 8px 24px rgba(249,115,22,.18);'
    : 'border:1px solid rgba(249,115,22,.3);box-shadow:0 6px 20px rgba(249,115,22,.12);';
  const badge = hot
    ? '<span class="badge" style="background:#F97316;color:#fff;">🔥 本周焦点</span>'
    : '<span class="badge" style="background:#F59E0B;color:#fff;">⭐ 精选</span>';
  return '<a class="biz" href="' + cardHref(b) + '" style="' + frame + '"><div class="biz-img" style="' + bg + '">' + badge + '</div><div class="biz-body"><b>' + esc(b.business_name) + '</b><div class="meta">' + esc(cardMeta(b)) + '</div>' + (dt ? '<div class="date">' + esc(dt) + '</div>' : '') + '</div></a>';
}
function exploreCard(b, i) {
  const bg = cardBg(b, i, COLORS_EXPLORE);
  const badge = b._feat ? '<span class="badge" style="background:#F59E0B;color:#fff;">⭐ 精选</span>' : '<span class="badge badge-open">已刊登</span>';
  return '<a class="biz" href="' + cardHref(b) + '"><div class="biz-img" style="' + bg + '">' + badge + '</div><div class="biz-body"><b>' + esc(b.business_name) + '</b><div class="meta">' + esc(cardMeta(b)) + '</div></div></a>';
}

// 开业日期新→旧（空值排最后），与前端 order=opening_date.desc 对齐
const byOpeningDesc = (a, c) => String(c.opening_date || "").localeCompare(String(a.opening_date || ""));
function markFeat(rows) {
  const today = new Date().toISOString().slice(0, 10);
  rows.forEach(b => {
    b._feat = !!b.featured && (!nn(b.featured_start) || String(b.featured_start) <= today) && (!nn(b.featured_until) || String(b.featured_until) >= today);
    b._tier = b._feat ? (b.feature_tier === "spotlight" ? "spotlight" : "featured") : "";
  });
  return rows;
}

// 替换 <!--OT:marker-->…<!--/OT:marker--> 之间的内容（用函数替换，避开 $ 转义坑）
function replaceMarker(src, marker, content) {
  const re = new RegExp("(<!--OT:" + marker + "-->)[\\s\\S]*?(<!--/OT:" + marker + "-->)");
  return re.test(src) ? src.replace(re, (m, a, b) => a + content + b) : src;
}
function replaceNum(src, id, val) {
  return src.replace(new RegExp('(id="' + id + '">)[^<]*(<)'), (m, a, b) => a + val + b);
}

function buildHomeAndExplore(list) {
  // ---- 首页 index.html ----
  const home = markFeat(list.slice().sort(byOpeningDesc));
  const w = (b) => b._tier === "spotlight" ? 2 : (b._tier === "featured" ? 1 : 0);
  home.sort((a, c) => w(c) - w(a)); // 稳定排序：焦点/精选靠前
  const spotlight = home.filter(b => b._tier === "spotlight").slice(0, 5);
  const featured = home.filter(b => b._tier === "featured").slice(0, 5);
  const others = home.filter(b => !b._feat);
  const todayList = others.filter(b => b.show_today).slice(0, 10);
  const areas = {}; home.forEach(b => { const a = nn(b.area) || nn(b.city); if (a) areas[a] = 1; });

  const idxPath = path.join(ROOT, "index.html");
  if (fs.existsSync(idxPath)) {
    let s = fs.readFileSync(idxPath, "utf8");
    s = replaceMarker(s, "today", todayList.length ? todayList.map((b, i) => homeCard(b, i)).join("") : '<p class="muted">加载中…</p>');
    s = replaceMarker(s, "spotlight", spotlight.map((b, i) => homeTierCard(b, i, "spotlight")).join(""));
    s = replaceMarker(s, "featured", featured.map((b, i) => homeTierCard(b, i, "featured")).join(""));
    s = replaceNum(s, "statBiz", home.length);
    s = replaceNum(s, "statArea", Object.keys(areas).length || "–");
    fs.writeFileSync(idxPath, s, "utf8");
    console.log("  ✓ index.html 注入：今日" + todayList.length + " 焦点" + spotlight.length + " 精选" + featured.length);
  }

  // ---- 探索页 explore.html ----
  const exp = markFeat(list.slice().sort(byOpeningDesc));
  exp.sort((a, c) => (c._feat ? 1 : 0) - (a._feat ? 1 : 0)); // 精选靠前
  const expPath = path.join(ROOT, "explore.html");
  if (fs.existsSync(expPath)) {
    let s = fs.readFileSync(expPath, "utf8");
    s = replaceMarker(s, "explore", exp.length ? exp.map((b, i) => exploreCard(b, i)).join("") : '<p class="muted" style="padding:20px 0;">加载中…</p>');
    s = replaceNum(s, "bizCount", exp.length);
    fs.writeFileSync(expPath, s, "utf8");
    console.log("  ✓ explore.html 注入：" + exp.length + " 家");
  }
}

// ---------- sitemap / map ----------
function buildSitemap(list) {
  const staticPages = ["/", "/explore.html", "/pricing.html", "/about.html", "/submit.html"];
  const urls = [
    ...staticPages.map(p => `  <url><loc>${SITE}${p}</loc></url>`),
    ...list.map(b => { const lm = (b.created_at || "").slice(0, 10); return `  <url><loc>${SITE}/business/${b.slug}/</loc>${lm ? `<lastmod>${lm}</lastmod>` : ""}</url>`; })
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

// ---------- main ----------
async function main() {
  console.log("抓取已刊登商家…");
  const list = await fetchPublished();
  console.log("已刊登：" + list.length + " 家");
  await ensureSlugs(list);
  fs.mkdirSync(OUT_BUSINESS, { recursive: true });
  const idSlug = {};
  for (const b of list) {
    const dir = path.join(OUT_BUSINESS, b.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), renderPage(b), "utf8");
    idSlug[b.id] = b.slug;
    console.log("  ✓ /business/" + b.slug + "/  (" + (b.business_name || b.name) + ")");
  }
  buildHomeAndExplore(list);
  fs.writeFileSync(path.join(ROOT, "sitemap.xml"), buildSitemap(list), "utf8");
  fs.writeFileSync(path.join(ROOT, "id-slug-map.json"), JSON.stringify(idSlug), "utf8");
  console.log(`\n完成：${list.length} 页 + 首页/探索页注入 + sitemap.xml + id-slug-map.json`);
}
main().catch(e => { console.error("生成失败：", e); process.exit(1); });
