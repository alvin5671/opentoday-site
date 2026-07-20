// OpenToday 分类表：10 个大类 + 子类。所有页面共用这一份。
// 用法：window.OT_CATS 取大类->子类；OT_SUBS(大类) 取子类数组。
(function () {
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

  window.OT_SUBS = function (cat) {
    return (window.OT_CATS[cat] || []).slice();
  };

  // 把 <select> 填成大类清单
  window.OT_fillCats = function (sel, placeholder) {
    if (!sel) return;
    sel.innerHTML = '<option value="">' + (placeholder || "请选择") + "</option>" +
      Object.keys(window.OT_CATS).map(function (c) { return "<option>" + c + "</option>"; }).join("");
  };

  // 把子类 <select> 跟着大类联动；没有子类时自动禁用
  window.OT_bindSub = function (catSel, subSel, placeholder) {
    if (!catSel || !subSel) return;
    function refresh(keep) {
      var subs = window.OT_SUBS(catSel.value);
      subSel.innerHTML = '<option value="">' + (placeholder || "请选择（可留空）") + "</option>" +
        subs.map(function (s) { return "<option>" + s + "</option>"; }).join("");
      subSel.disabled = subs.length === 0;
      if (keep && subs.indexOf(keep) > -1) subSel.value = keep;
    }
    catSel.addEventListener("change", function () { refresh(""); });
    return refresh;
  };
})();
