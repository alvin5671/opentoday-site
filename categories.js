// OpenToday 共用清单：商家分类（大类 + 子类）与地区（大区 + 小区）。
// 所有页面读这一份，要增删只改这个文件。
(function () {
  // ===== 商家分类 =====
  window.OT_CATS = {
    "餐饮美食": ["中餐", "马来餐", "印度餐", "西餐", "日韩料理", "火锅烧烤", "素食", "咖啡馆", "甜品烘焙", "饮料奶茶", "酒吧夜生活"],
    "美容美发": ["剪发染烫", "男士理发", "美甲美睫", "美容护肤", "按摩SPA", "纹绣"],
    "健康医疗": ["诊所", "牙科", "中医", "眼科", "药房", "体检"],
    "运动健身": ["健身房", "私教", "瑜伽", "拳击", "球类场地", "游泳"],
    "零售购物": ["服装时尚", "超市杂货", "家居家具", "母婴用品", "手机数码", "精品礼品"],
    "生活服务": ["维修服务", "清洁", "洗衣", "搬家", "摄影", "宠物服务"],
    "汽车服务": ["保养维修", "洗车镀膜", "轮胎", "音响改装", "二手车"],
    "教育培训": ["补习", "语言", "音乐", "美术", "编程", "幼儿启蒙"],
    "专业服务": ["房贷", "保险", "会计报税", "律师", "商标注册", "设计广告", "IT网络", "房产中介"],
    "休闲娱乐": ["旅游住宿", "KTV", "游戏电竞", "桌游", "亲子乐园"],
    "其他": []
  };

  // ===== 地区：大区 -> 小区 =====
  window.OT_REGIONS = {
    "Johor Bahru": ["Mount Austin", "Austin Heights", "Adda Heights", "Setia Tropika", "Setia Indah", "Johor Jaya", "Taman Daya", "Taman Molek", "Taman Pelangi", "Taman Century", "Taman Sentosa", "Permas Jaya", "Tebrau", "Bandar Dato Onn", "Larkin", "Tampoi", "Danga Bay", "Bandar Baru Uda", "Skudai", "Perling", "Sutera Utama", "Kempas", "Ulu Tiram", "JB 市区 / CIQ"],
    "Iskandar Puteri": ["Bukit Indah", "Eco Botanic", "Horizon Hills", "Puteri Harbour", "Medini", "Gelang Patah", "Nusa Bestari", "Taman Universiti", "Sunway Iskandar", "EduCity"],
    "Pasir Gudang": ["Pasir Gudang 市区", "Masai", "Seri Alam", "Cahaya Baru", "Kong Kong"],
    "Kulai": ["Kulai 市区", "Senai", "Bandar Putra", "Indahpura", "Saleng"],
    "Kota Tinggi": ["Kota Tinggi 市区", "Desaru", "Bandar Penawar", "Sedili"],
    "Kluang": ["Kluang 市区", "Bandar Tenggara", "Layang-Layang", "Kahang"],
    "Batu Pahat": ["Batu Pahat 市区", "Parit Raja", "Yong Peng", "Ayer Hitam", "Sri Gading", "Senggarang"],
    "Muar": ["Muar 市区", "Bakri", "Pagoh", "Parit Jawa", "Panchor"],
    "Tangkak": ["Tangkak 市区", "Bukit Gambir", "Sagil", "Grisek"],
    "Segamat": ["Segamat 市区", "Labis", "Chaah", "Buloh Kasap", "Gemas"],
    "Pontian": ["Pontian 市区", "Benut", "Kukup", "Pekan Nanas", "Ayer Baloi"],
    "Mersing": ["Mersing 市区", "Endau", "Jemaluang", "Tenggaroh"]
  };

  var OTHER = "__other";

  function fill(sel, list, placeholder, withOther) {
    sel.innerHTML = '<option value="">' + (placeholder || "请选择") + "</option>" +
      list.map(function (x) { return "<option>" + x + "</option>"; }).join("") +
      (withOther ? '<option value="' + OTHER + '">其他（自己填）</option>' : "");
  }

  window.OT_SUBS = function (cat) { return (window.OT_CATS[cat] || []).slice(); };

  // 大类 select
  window.OT_fillCats = function (sel, placeholder) {
    if (sel) fill(sel, Object.keys(window.OT_CATS), placeholder, false);
  };

  // 子类 select 跟着大类联动；返回 refresh(已有值)
  window.OT_bindSub = function (catSel, subSel, placeholder) {
    if (!catSel || !subSel) return function () {};
    function refresh(keep) {
      var subs = window.OT_SUBS(catSel.value);
      fill(subSel, subs, placeholder || "请选择（可留空）", false);
      subSel.disabled = subs.length === 0;
      if (keep && subs.indexOf(keep) > -1) subSel.value = keep;
    }
    catSel.addEventListener("change", function () { refresh(""); });
    return refresh;
  };

  // 大区 select
  window.OT_fillRegions = function (sel, placeholder) {
    if (sel) fill(sel, Object.keys(window.OT_REGIONS), placeholder, false);
  };

  // 小区 select 跟着大区联动，另有「其他」文字框；返回 refresh(已有小区值)
  window.OT_bindArea = function (regionSel, areaSel, otherInput, placeholder) {
    if (!regionSel || !areaSel) return function () {};
    function syncOther() {
      var isOther = areaSel.value === OTHER;
      if (otherInput) {
        otherInput.style.display = isOther ? "" : "none";
        if (!isOther) otherInput.value = "";
      }
    }
    function refresh(keep) {
      var list = window.OT_REGIONS[regionSel.value] || [];
      fill(areaSel, list, placeholder || "请选择（可留空）", list.length > 0);
      areaSel.disabled = list.length === 0;
      if (keep) {
        if (list.indexOf(keep) > -1) areaSel.value = keep;
        else if (list.length) { areaSel.value = OTHER; }
      }
      syncOther();
      if (keep && areaSel.value === OTHER && otherInput) otherInput.value = keep;
    }
    regionSel.addEventListener("change", function () { refresh(""); });
    areaSel.addEventListener("change", syncOther);
    return refresh;
  };

  // 取最终小区值（选了「其他」就用文字框内容）
  window.OT_areaValue = function (areaSel, otherInput) {
    if (!areaSel) return "";
    if (areaSel.value === OTHER) return otherInput ? otherInput.value.trim() : "";
    return areaSel.value;
  };
})();
