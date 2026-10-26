/* Wi-Fi Card — QR matrix from qrcode.js (Kazuhiko Arase, MIT); the card is drawn on a canvas, never uploaded. */
(function () {
  "use strict";
  var $ = S3.$, $$ = S3.$$;
  qrcode.stringToBytes = qrcode.stringToBytesFuncs["UTF-8"];

  var THEMES = [
    { id: "teal", name: "Teal", a: "#0e9f9a", ink: "#ffffff" },
    { id: "ink", name: "Ink", a: "#1d2530", ink: "#ffffff" },
    { id: "coral", name: "Coral", a: "#e2604a", ink: "#ffffff" },
    { id: "violet", name: "Violet", a: "#6650c8", ink: "#ffffff" },
    { id: "saver", name: "Ink saver (outline)", a: "#ffffff", ink: "#111111", line: true }
  ];
  var T = {
    en: { title: "Wi-Fi", scan: "Scan to join", net: "Network", pass: "Password", open: "Open network, no password", foot: "Point your phone camera at the code" },
    ar: { title: "واي فاي", scan: "امسح للاتصال", net: "الشبكة", pass: "كلمة المرور", open: "شبكة مفتوحة بدون كلمة مرور", foot: "وجّه كاميرا هاتفك نحو الرمز" }
  };
  var saved = S3.store("wifi.card") || {};
  var st = { lang: saved.lang || "both", theme: saved.theme || "teal", layout: saved.layout || "a4x4", showPass: saved.showPass !== false, qr: null };

  function wifiEsc(s) { return String(s).replace(/([\\;,:"])/g, "\\$1"); }
  function payload(ssid, pass, sec, hidden) {
    if (!ssid) return "";
    return "WIFI:T:" + sec + ";S:" + wifiEsc(ssid) + ";" + (sec !== "nopass" ? "P:" + wifiEsc(pass) + ";" : "") + (hidden ? "H:true;" : "") + ";";
  }
  function makeQR(text) { var q = qrcode(0, "M"); q.addData(text, "Byte"); q.make(); return q; }

  // ---------- drawing ----------
  var FONT = "Inter, 'Segoe UI', Tahoma, 'Noto Sans Arabic', 'Geeza Pro', sans-serif";
  function fit(ctx, text, weight, size, maxW) {
    var s = size;
    do { ctx.font = weight + " " + s + "px " + FONT; if (ctx.measureText(text).width <= maxW) break; s -= 2; } while (s > 18);
    if (ctx.measureText(text).width > maxW) { while (text.length > 1 && ctx.measureText(text + "…").width > maxW) text = text.slice(0, -1); text += "…"; }
    return text;
  }
  function line(ctx, text, y, weight, size, color, maxW, rtl) {
    ctx.direction = rtl ? "rtl" : "ltr";
    ctx.fillStyle = color; ctx.fillText(fit(ctx, text, weight, size, maxW), ctx.canvas.width / 2, y);
    ctx.direction = "ltr";
  }
  function isRtl(s) { return /[֐-ࣿ]/.test(s); }
  function wifiIcon(ctx, cx, cy, r, color) {
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineCap = "round"; ctx.lineWidth = r * 0.16;
    [1, 0.68, 0.36].forEach(function (k) { ctx.beginPath(); ctx.arc(cx, cy, r * k, Math.PI * 1.25, Math.PI * 1.75); ctx.stroke(); });
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.1, 0, Math.PI * 2); ctx.fill();
  }
  function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  function drawCard(cv, d) {
    var ctx = cv.getContext("2d"), W = cv.width, H = cv.height, th = THEMES.filter(function (t) { return t.id === d.theme; })[0] || THEMES[0];
    var en = d.lang !== "ar", ar = d.lang !== "en", maxW = W * 0.86, dark = "#14181d", grey = "#6b7380";
    function label(k) { return en && ar ? T.en[k] + "  ·  " + T.ar[k] : en ? T.en[k] : T.ar[k]; }
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H);
    // header band
    var band = H * 0.205;
    ctx.fillStyle = th.a; ctx.fillRect(0, 0, W, band);
    if (th.line) { ctx.fillStyle = "#111"; ctx.fillRect(0, band - 6, W, 6); ctx.lineWidth = 8; ctx.strokeStyle = "#111"; ctx.strokeRect(4, 4, W - 8, H - 8); }
    wifiIcon(ctx, W / 2, band * 0.54, band * 0.36, th.ink);
    var title = d.title || (en ? T.en.title : T.ar.title);
    line(ctx, title, band * 0.87, "800", 96, th.ink, maxW, isRtl(title));
    // scan line(s)
    if (en && ar) { line(ctx, T.en.scan, band + 102, "800", 68, dark, maxW); line(ctx, T.ar.scan, band + 182, "700", 58, dark, maxW, true); }
    else if (en) line(ctx, T.en.scan, band + 150, "800", 74, dark, maxW);
    else line(ctx, T.ar.scan, band + 150, "700", 70, dark, maxW, true);
    // QR
    var qs = W * 0.5, qx = (W - qs) / 2, qy = band + 266, box = 26;
    ctx.fillStyle = "#ffffff"; rrect(ctx, qx - box, qy - box, qs + 2 * box, qs + 2 * box, 36);
    ctx.lineWidth = 6; ctx.strokeStyle = th.line ? "#111" : th.a; ctx.stroke();
    if (d.qr) {
      var n = d.qr.getModuleCount(), m = 2, cell = qs / (n + 2 * m);
      ctx.fillStyle = "#000000"; ctx.beginPath();
      for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (d.qr.isDark(r, c)) {
        var x0 = Math.round(qx + (c + m) * cell), y0 = Math.round(qy + (r + m) * cell);
        ctx.rect(x0, y0, Math.round(qx + (c + m + 1) * cell) - x0, Math.round(qy + (r + m + 1) * cell) - y0);
      }
      ctx.fill();
    } else {
      ctx.fillStyle = "#eef0f3"; ctx.fillRect(qx, qy, qs, qs);
      line(ctx, en ? "Enter the network name" : "أدخل اسم الشبكة", qy + qs / 2, "600", 42, grey, qs * 0.9, !en);
    }
    // details
    var y = qy + qs + box + 78;
    line(ctx, label("net"), y, "600", 38, grey, maxW, !en);
    y += 70; line(ctx, d.ssid || "—", y, "800", 64, dark, maxW, isRtl(d.ssid));
    y += 80;
    if (d.sec === "nopass") line(ctx, label("open"), y + 24, "600", 40, grey, maxW, !en);
    else if (d.showPass) {
      line(ctx, label("pass"), y, "600", 38, grey, maxW, !en);
      y += 70; line(ctx, d.pass || "—", y, "800", 60, dark, maxW, isRtl(d.pass));
    }
    // footer
    ctx.fillStyle = th.line ? "#111" : th.a; ctx.fillRect(W * 0.4, H - 112, W * 0.2, 6);
    line(ctx, en ? T.en.foot : T.ar.foot, H - 56, "500", 32, grey, maxW, !en);
  }

  // ---------- UI ----------
  var cv = $("#card"), status = $("#status");
  function data() { return { ssid: $("#ssid").value, pass: $("#pass").value, sec: $("#sec").value, hidden: $("#hidden").checked, lang: st.lang, theme: st.theme, title: $("#title").value.trim(), showPass: st.showPass, qr: st.qr }; }
  function save() { S3.store("wifi.card", { lang: st.lang, theme: st.theme, layout: st.layout, showPass: st.showPass }); }
  function render() {
    var d = data(), p = payload(d.ssid, d.pass, d.sec, d.hidden);
    st.qr = null;
    if (p) { try { st.qr = makeQR(p); } catch (e) { st.qr = null; } }
    d.qr = st.qr;
    drawCard(cv, d);
    $("#pass").disabled = d.sec === "nopass";
    if (!d.ssid) { status.className = "chip"; status.textContent = "Enter the network name"; }
    else if (d.sec === "WPA" && d.pass && d.pass.length < 8) { status.className = "chip warn"; status.textContent = "WPA passwords are at least 8 characters"; }
    else if (d.sec !== "nopass" && !d.pass) { status.className = "chip warn"; status.textContent = "Password is empty"; }
    else { status.className = "chip ok"; status.textContent = "Ready to print"; }
  }
  var queue = S3.debounce(render, 80);
  ["#ssid", "#pass", "#title"].forEach(function (s) { $(s).addEventListener("input", queue); });
  ["#sec", "#hidden"].forEach(function (s) { $(s).addEventListener("change", render); });
  $("#reveal").addEventListener("click", function () {
    var show = $("#pass").type === "password"; $("#pass").type = show ? "text" : "password";
    this.textContent = show ? "Hide" : "Show"; this.setAttribute("aria-pressed", String(show));
  });
  $("#showPass").checked = st.showPass;
  $("#showPass").addEventListener("change", function (e) { st.showPass = e.target.checked; save(); render(); });
  $$("#lang button").forEach(function (b) {
    b.setAttribute("aria-pressed", String(b.dataset.v === st.lang));
    b.addEventListener("click", function () { st.lang = b.dataset.v; $$("#lang button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); }); save(); render(); });
  });
  THEMES.forEach(function (t) {
    var b = S3.h("button", { "class": "wc-sw" + (t.line ? " saver" : ""), "aria-label": t.name, title: t.name, "aria-pressed": String(t.id === st.theme), style: "--sw:" + t.a });
    b.addEventListener("click", function () { st.theme = t.id; $$("#themes button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); }); save(); render(); });
    $("#themes").appendChild(b);
  });
  $("#layout").value = st.layout;
  $("#layout").addEventListener("change", function (e) { st.layout = e.target.value; save(); });

  function ready() { if (!st.qr) { S3.toast("Enter the network name first", "error"); $("#ssid").focus(); return false; } return true; }
  $("#png").addEventListener("click", function () {
    if (!ready()) return;
    cv.toBlob(function (b) { S3.download(b, "wifi-card.png"); S3.done(); }, "image/png");
  });

  // Print: the canvas becomes <img> tiles on a sheet sized with @page for the chosen layout.
  var LAYOUTS = { a6: { page: "A6", n: 1, w: 105, h: 148 }, a4: { page: "A4", n: 1, w: 190, h: 269 }, a4x4: { page: "A4", n: 4, cols: 2, w: 100, h: 141.4 }, a4x9: { page: "A4", n: 9, cols: 3, w: 66, h: 93.3 } };
  $("#print").addEventListener("click", function () {
    if (!ready()) return;
    var L = LAYOUTS[st.layout], url = cv.toDataURL("image/png"), sheet = $("#sheet");
    sheet.innerHTML = ""; sheet.className = "sheet-" + st.layout;
    var grid = S3.h("div", { "class": "sheet-grid", style: "grid-template-columns:repeat(" + (L.cols || 1) + "," + L.w + "mm)" });
    for (var i = 0; i < L.n; i++) grid.appendChild(S3.h("img", { src: url, alt: "", style: "width:" + L.w + "mm;height:" + L.h + "mm" }));
    sheet.appendChild(grid);
    var pg = $("#pageStyle") || document.head.appendChild(S3.h("style", { id: "pageStyle" }));
    pg.textContent = "@page { size: " + L.page + " portrait; margin: 0; }";
    var imgs = $$("img", sheet);
    Promise.all(imgs.map(function (im) { return im.decode ? im.decode().catch(function () {}) : null; })).then(function () { window.print(); S3.done(); });
  });

  if (document.fonts && document.fonts.load) document.fonts.load("800 40px Inter").then(render, render);
  render();

  window.S3_DEMO = function () {
    $("#ssid").value = "S3eidat Café"; $("#pass").value = "coffee-is-free"; $("#title").value = "";
    render();
  };

  window.S3_SELFTEST = function () {
    var p = payload('My;Net"', "p:ss\\w,1", "WPA", true);
    var open = payload("Guest", "ignored", "nopass", false);
    var q = makeQR("WIFI:T:WPA;S:Home;P:12345678;;"); // 30 bytes at M -> version 3 (29 modules)
    var c = document.createElement("canvas"); c.width = 620; c.height = 877;
    drawCard(c, { ssid: "Home", pass: "12345678", sec: "WPA", lang: "both", theme: "coral", title: "", showPass: true, qr: q });
    var px = c.getContext("2d").getImageData(5, 5, 1, 1).data; // header band is the theme color
    return p === 'WIFI:T:WPA;S:My\\;Net\\";P:p\\:ss\\\\w\\,1;H:true;;' && open === "WIFI:T:nopass;S:Guest;;" &&
      q.getModuleCount() === 29 && px[0] === 0xe2 && px[1] === 0x60 && px[2] === 0x4a;
  };
})();
