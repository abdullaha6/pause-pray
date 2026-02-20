(() => {
  const districts = [
    "Ampara", "Anuradhapura", "Badulla", "Batticaloa", "Colombo",
    "Dehiaththakandiya", "Galle", "Gampaha", "Hambantota", "Jaffna", "Kalutara",
    "Kandy", "Kegalle", "Kilinochchi", "Kurunegala", "Mannar",
    "Matale", "Matara", "Monaragala", "Mullaitivu", "Nallur", "Nuwara Eliya",
    "Padiyatalawa", "Polonnaruwa", "Puttalam", "Ratnapura", "Trincomalee", "Vavuniya"
  ];

  const sizePresets = {
    ios: [
      { id: "1170x2532", w: 1170, h: 2532, label: "iPhone (1170 × 2532)" },
      { id: "1290x2796", w: 1290, h: 2796, label: "iPhone Pro Max (1290 × 2796)" },
      { id: "2048x2732", w: 2048, h: 2732, label: "iPad (2048 × 2732)" }
    ],
    android: [
      { id: "1440x3200", w: 1440, h: 3200, label: "Android QHD (1440 × 3200)" },
      { id: "1080x2400", w: 1080, h: 2400, label: "Android FHD+ (1080 × 2400)" }
    ]
  };

  // Dummy prayer times, independent of district, used only to build UI and rendering.
  const dummyTimes = () => ({
    fajr: "05:07",
    sunrise: "06:27",
    dhuhr: "12:22",
    asr: "15:44",
    maghrib: "18:17",
    isha: "19:28"
  });

  const els = {
    os: document.getElementById("os"),
    district: document.getElementById("district"),
    size: document.getElementById("size"),
    generate: document.getElementById("generate"),
    download: document.getElementById("download"),
    copyLink: document.getElementById("copyLink"),
    status: document.getElementById("status"),
    canvas: document.getElementById("canvas"),
    previewMeta: document.getElementById("previewMeta")
  };

  let lastObjectUrl = null;

  function setStatus(msg) {
    els.status.textContent = msg || "";
  }

  function isoTodayInColombo() {
    // Good enough for UI. JSON wiring later can use exact key lookup.
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function formatDisplayDate(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString("en-LK", { year: "numeric", month: "long", day: "2-digit" });
  }

  function populateDistricts() {
    els.district.innerHTML = districts
      .map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)
      .join("");
    els.district.value = "Colombo";
  }

  function populateSizes() {
    const os = els.os.value;
    const list = sizePresets[os] || [];
    els.size.innerHTML = list
      .map((s) => `<option value="${s.id}">${escapeHtml(s.label)}</option>`)
      .join("");
    els.size.value = list[0]?.id || "";
    applyCanvasSize();
  }

  function applyCanvasSize() {
    const os = els.os.value;
    const preset = (sizePresets[os] || []).find((p) => p.id === els.size.value);
    if (!preset) return;

    els.canvas.width = preset.w;
    els.canvas.height = preset.h;

    els.previewMeta.textContent = `${preset.w}×${preset.h}`;
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function drawWallpaper({ district, dateIso, times }) {
    const c = els.canvas;
    const ctx = c.getContext("2d");

    const W = c.width;
    const H = c.height;

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(0, 0, W, H);

    // Subtle top gradient
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "rgba(255,255,255,0.06)");
    g.addColorStop(1, "rgba(255,255,255,0.00)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Layout
    const pad = Math.round(W * 0.08);
    const cardW = W - pad * 2;
    const cardH = Math.round(H * 0.46);
    const cardX = pad;
    const cardY = Math.round(H * 0.18);

    // Card
    roundRect(ctx, cardX, cardY, cardW, cardH, Math.round(W * 0.03));
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fill();
    ctx.lineWidth = Math.max(2, Math.round(W * 0.002));
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.stroke();

    // Header
    const title = "Pause & Pray";
    const subtitle = `${district} • ${formatDisplayDate(dateIso)}`;

    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = `700 ${Math.round(W * 0.06)}px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif`;
    ctx.fillText(title, cardX + pad, cardY + pad + Math.round(W * 0.02));

    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = `500 ${Math.round(W * 0.033)}px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif`;
    ctx.fillText(subtitle, cardX + pad, cardY + pad + Math.round(W * 0.08));

    // Table
    const rows = [
      ["Fajr", times.fajr],
      ["Sunrise", times.sunrise],
      ["Dhuhr", times.dhuhr],
      ["Asr", times.asr],
      ["Maghrib", times.maghrib],
      ["Isha", times.isha]
    ];

    const tableX = cardX + pad;
    const tableY = cardY + pad + Math.round(W * 0.14);
    const rowH = Math.round(W * 0.075);

    ctx.font = `600 ${Math.round(W * 0.040)}px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif`;

    for (let i = 0; i < rows.length; i++) {
      const y = tableY + i * rowH;

      // Row divider (skip first)
      if (i > 0) {
        ctx.strokeStyle = "rgba(255,255,255,0.10)";
        ctx.lineWidth = Math.max(1, Math.round(W * 0.0015));
        ctx.beginPath();
        ctx.moveTo(tableX, y - Math.round(rowH * 0.45));
        ctx.lineTo(tableX + cardW - pad * 2, y - Math.round(rowH * 0.45));
        ctx.stroke();
      }

      // Label
      ctx.fillStyle = "rgba(255,255,255,0.80)";
      ctx.fillText(rows[i][0], tableX, y);

      // Time (right aligned)
      const timeText = rows[i][1];
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      const timeW = ctx.measureText(timeText).width;
      ctx.fillText(timeText, tableX + (cardW - pad * 2) - timeW, y);
    }

    // Footer note
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = `500 ${Math.round(W * 0.028)}px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif`;
    ctx.fillText("Times are local (Asia/Colombo)", cardX + pad, cardY + cardH - pad);
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.max(8, r);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  async function canvasToBlob(canvas) {
    if (canvas.toBlob) {
      return new Promise((resolve) => canvas.toBlob(resolve, "image/png", 1.0));
    }
    // Fallback for older browsers
    const dataUrl = canvas.toDataURL("image/png");
    const res = await fetch(dataUrl);
    return await res.blob();
  }

  async function generate() {
    applyCanvasSize();

    const os = els.os.value;
    const district = els.district.value;
    const dateIso = isoTodayInColombo();
    const times = dummyTimes();

    drawWallpaper({ district, dateIso, times });

    const blob = await canvasToBlob(els.canvas);
    if (!blob) {
      setStatus("Failed to generate image.");
      return;
    }

    if (lastObjectUrl) URL.revokeObjectURL(lastObjectUrl);
    lastObjectUrl = URL.createObjectURL(blob);

    const fileName = `pause-pray-${district.toLowerCase().replaceAll(" ", "-")}-${dateIso}-${os}.png`;

    els.download.href = lastObjectUrl;
    els.download.download = fileName;
    els.download.classList.remove("disabled");

    els.copyLink.disabled = false;

    setStatus(`Ready: ${fileName}`);
  }

  async function copyDownloadLink() {
    if (!lastObjectUrl) return;
    try {
      await navigator.clipboard.writeText(lastObjectUrl);
      setStatus("Copied download link.");
    } catch {
      setStatus("Copy failed (browser restriction).");
    }
  }

  function init() {
    populateDistricts();
    populateSizes();
    applyCanvasSize();

    els.os.addEventListener("change", () => {
      populateSizes();
      setStatus("");
      els.download.classList.add("disabled");
      els.copyLink.disabled = true;
    });

    els.size.addEventListener("change", () => {
      applyCanvasSize();
      setStatus("");
      els.download.classList.add("disabled");
      els.copyLink.disabled = true;
    });

    els.district.addEventListener("change", () => {
      setStatus("");
      els.download.classList.add("disabled");
      els.copyLink.disabled = true;
    });

    els.generate.addEventListener("click", () => {
      setStatus("Generating...");
      generate().catch(() => setStatus("Failed to generate image."));
    });

    els.copyLink.addEventListener("click", () => {
      copyDownloadLink().catch(() => {});
    });

    // First render so the preview is not blank
    setStatus("Generating...");
    generate().catch(() => setStatus("Failed to generate image."));
  }

  init();
})();