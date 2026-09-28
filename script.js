/* =============================================================
   HARI PRAPAN — SITE SCRIPTS
   1. Phone menu   2. Show all updates   3. Photo sliders
   4. Course tabs  5. Teaching (Google Sheet)
   ============================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. Phone menu ---------- */
  const menuButton = document.querySelector(".menu-button");
  const sidebar = document.querySelector(".sidebar");
  const scrim = document.querySelector(".scrim");

  function setMenu(open) {
    document.body.classList.toggle("nav-open", open);
    if (menuButton) menuButton.setAttribute("aria-expanded", String(open));
    if (open && sidebar) {
      const first = sidebar.querySelector("a");
      if (first) first.focus({ preventScroll: true });
    }
  }

  if (menuButton) {
    menuButton.addEventListener("click", () =>
      setMenu(!document.body.classList.contains("nav-open")));
  }
  if (scrim) scrim.addEventListener("click", () => setMenu(false));
  if (sidebar) sidebar.querySelectorAll("a").forEach(a =>
    a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && document.body.classList.contains("nav-open")) {
      setMenu(false);
      if (menuButton) menuButton.focus();
    }
  });
  window.matchMedia("(min-width: 1080px)").addEventListener("change", e => {
    if (e.matches) setMenu(false);
  });

  /* ---------- 2. Show all updates ---------- */
  document.querySelectorAll(".show-more").forEach(button => {
    const list = document.getElementById(button.dataset.target);
    if (!list || !list.querySelector(".is-extra")) { button.remove(); return; }
    button.addEventListener("click", () => {
      const expanded = list.classList.toggle("is-expanded");
      button.textContent = expanded ? button.dataset.less : button.dataset.more;
      button.setAttribute("aria-expanded", String(expanded));
      if (!expanded) list.closest("section").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    });
  });

  /* ---------- 3. Photo sliders (Education) ---------- */
  document.querySelectorAll(".slider").forEach((slider, offset) => {
    const slides = [...slider.querySelectorAll(".slide")];
    const dotBox = slider.querySelector(".slider-dots");
    if (slides.length <= 1 || !dotBox) return;
    let current = 0, timer;

    const dots = slides.map((_, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", "Show photo " + (i + 1));
      if (i === 0) b.classList.add("is-active");
      b.addEventListener("click", () => { show(i); start(); });
      dotBox.appendChild(b);
      return b;
    });

    function show(i) {
      slides[current].classList.remove("is-active");
      dots[current].classList.remove("is-active");
      current = i;
      slides[current].classList.add("is-active");
      dots[current].classList.add("is-active");
    }
    function start() {
      clearInterval(timer);
      if (reduceMotion) return;
      timer = setInterval(() => show((current + 1) % slides.length), 6000);
    }
    slider.addEventListener("mouseenter", () => clearInterval(timer));
    slider.addEventListener("mouseleave", start);
    setTimeout(start, offset * 900);
  });

  /* ---------- 4. Course tabs ---------- */
  const tabs = [...document.querySelectorAll('.tab-list [role="tab"]')];
  function selectTab(tab, focus) {
    tabs.forEach(t => {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute("aria-controls"));
      if (panel) panel.classList.toggle("is-active", on);
    });
    if (focus) tab.focus();
    tab.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => selectTab(tab));
    tab.addEventListener("keydown", e => {
      const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
      if (e.key in keys) {
        e.preventDefault();
        selectTab(tabs[(i + keys[e.key] + tabs.length) % tabs.length], true);
      }
    });
  });

  /* ---------- 5. Teaching (Google Sheet) ---------- */
  loadTeaching();
});


/* Sheet columns expected: date, course, role, institution.
   The sheet link lives in index.html (data-sheet on #teaching-list). */

function escapeHTML(value) {
  return String(value || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function parseCSV(csv) {
  const rows = [];
  let row = [], value = "", insideQuotes = false;
  for (let i = 0; i < csv.length; i++) {
    const char = csv[i], next = csv[i + 1];
    if (char === '"' && insideQuotes && next === '"') { value += '"'; i++; }
    else if (char === '"') { insideQuotes = !insideQuotes; }
    else if (char === "," && !insideQuotes) { row.push(value.trim()); value = ""; }
    else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && next === "\n") i++;
      row.push(value.trim());
      if (row.some(cell => cell !== "")) rows.push(row);
      row = []; value = "";
    }
    else { value += char; }
  }
  if (value !== "" || row.length > 0) {
    row.push(value.trim());
    if (row.some(cell => cell !== "")) rows.push(row);
  }
  return rows;
}

function csvToObjects(rows) {
  if (rows.length < 2) return [];
  const headers = rows[0].map(h => h.trim().toLowerCase());
  return rows.slice(1).map(row => {
    const o = {};
    headers.forEach((h, i) => { o[h] = row[i] || ""; });
    return o;
  });
}

function teachingRow(date, title, text, status) {
  const div = document.createElement("div");
  div.className = "teaching-row" + (status ? " is-status" : "");
  div.innerHTML = `
    <span class="teaching-date">${date}</span>
    <div>
      <h3>${title}</h3>
      <p>${text}</p>
    </div>`;
  return div;
}

async function loadTeaching() {
  const container = document.getElementById("teaching-list");
  if (!container) return;
  const url = container.dataset.sheet;
  try {
    const response = await fetch(url + "&cache=" + Date.now());
    if (!response.ok) throw new Error("Unable to fetch Google Sheet.");
    const teaching = csvToObjects(parseCSV(await response.text()));
    container.innerHTML = "";
    if (teaching.length === 0) {
      container.appendChild(teachingRow("—", "No teaching entries yet",
        "Teaching information will appear here automatically.", true));
      return;
    }
    teaching.forEach(item => {
      if (!item.date && !item.course && !item.role && !item.institution) return;
      container.appendChild(teachingRow(
        escapeHTML(item.date),
        escapeHTML(item.course),
        `${escapeHTML(item.role)} · ${escapeHTML(item.institution)}`));
    });
  } catch (error) {
    console.error("Teaching section error:", error);
    container.innerHTML = "";
    container.appendChild(teachingRow("—", "Unable to load teaching information",
      "Please try again later.", true));
  }
}
