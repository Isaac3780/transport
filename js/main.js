/* =========================================================
   CJS Lines — Design 1: Classic Corporate Navy
   Interactive engine: local data store, forms with reference
   numbers, live schedule board, admin dashboard, wizard,
   toasts, scroll reveals and small UI niceties.
   Demo only — data lives in this browser (localStorage).
   ========================================================= */

(function () {
  "use strict";

  /* ---------------------------------------------------------
     1. Tiny data store (localStorage)
     --------------------------------------------------------- */
  const LS_KEY = "cjslines_store_v1";
  const SESSION_KEY = "cjslines_admin_session";

  const seedSchedules = [
    { id: "s1", vessel: "CJS Starline 108", pol: "Singapore", pod: "Port Klang", etd: "2026-11-22", eta: "2026-11-23", closing: "2026-11-20", status: "booking" },
    { id: "s2", vessel: "CJS Starline 109", pol: "Singapore", pod: "Jakarta", etd: "2026-11-24", eta: "2026-11-27", closing: "2026-11-21", status: "closing" },
    { id: "s3", vessel: "CJS Orient 42", pol: "Singapore", pod: "Ho Chi Minh", etd: "2026-11-26", eta: "2026-11-28", closing: "2026-11-23", status: "booking" },
    { id: "s4", vessel: "CJS Malacca 15", pol: "Port Klang", pod: "Singapore", etd: "2026-11-18", eta: "2026-11-19", closing: "2026-11-16", status: "departed" },
    { id: "s5", vessel: "CJS Archipelago 7", pol: "Jakarta", pod: "Singapore", etd: "2026-11-19", eta: "2026-11-22", closing: "2026-11-17", status: "delayed" },
    { id: "s6", vessel: "CJS Mekong 31", pol: "Ho Chi Minh", pod: "Singapore", etd: "2026-11-25", eta: "2026-11-27", closing: "2026-11-22", status: "booking" },
    { id: "s7", vessel: "CJS Starline 110", pol: "Singapore", pod: "Port Klang", etd: "2026-11-29", eta: "2026-11-30", closing: "2026-11-26", status: "closing" },
    { id: "s8", vessel: "CJS Malacca 16", pol: "Port Klang", pod: "Jakarta", etd: "2026-11-30", eta: "2026-12-02", closing: "2026-11-27", status: "booking" }
  ];

  const Store = {
    data: null,
    load() {
      try {
        const raw = localStorage.getItem(LS_KEY);
        this.data = raw ? JSON.parse(raw) : null;
      } catch (e) {
        this.data = null;
      }
      if (!this.data || !this.data.schedules) {
        this.data = {
          enquiries: [],
          schedules: seedSchedules.slice(),
          documents: [],
          updatedAt: new Date().toISOString()
        };
        this.save();
      }
      return this.data;
    },
    save() {
      this.data.updatedAt = new Date().toISOString();
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(this.data));
      } catch (e) {
        /* storage full or blocked — demo continues in memory */
      }
    },
    addEnquiry(enq) {
      const seq = (this.data.enquiries.length + 1).toString().padStart(4, "0");
      enq.ref = "CJS-" + enq.type.slice(0, 1).toUpperCase() + "-2026-" + seq;
      enq.id = "e" + Date.now();
      enq.date = new Date().toISOString();
      enq.status = "new";
      this.data.enquiries.unshift(enq);
      this.save();
      return enq;
    },
    setEnquiryStatus(id, status) {
      const e = this.data.enquiries.find(x => x.id === id);
      if (e) { e.status = status; this.save(); }
    },
    deleteEnquiry(id) {
      this.data.enquiries = this.data.enquiries.filter(x => x.id !== id);
      this.save();
    },
    addSchedule(s) {
      s.id = "s" + Date.now();
      this.data.schedules.push(s);
      this.save();
      return s;
    },
    updateSchedule(id, patch) {
      const s = this.data.schedules.find(x => x.id === id);
      if (s) { Object.assign(s, patch); this.save(); }
    },
    deleteSchedule(id) {
      this.data.schedules = this.data.schedules.filter(x => x.id !== id);
      this.save();
    },
    addDocument(doc) {
      doc.id = "d" + Date.now();
      doc.date = new Date().toISOString();
      this.data.documents.unshift(doc);
      this.save();
      return doc;
    },
    deleteDocument(id) {
      this.data.documents = this.data.documents.filter(x => x.id !== id);
      this.save();
    }
  };

  /* ---------------------------------------------------------
     2. Helpers
     --------------------------------------------------------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function esc(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }

  function fmtDateTime(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return "—";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
      ", " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }

  const STATUS_LABEL = { booking: "Booking", closing: "Closing", departed: "Departed", delayed: "Delayed" };
  const ENQ_STATUS_LABEL = { new: "New", quoted: "Quoted", closed: "Closed" };
  const SERVICE_LABEL = {
    "sea-freight": "Sea Freight",
    "road-freight": "Road Freight",
    "export-freight": "Export Freight",
    "local-transport": "Local Transport",
    "storage-only": "Storage only",
    "storage-handling": "Storage + handling",
    "loading-unloading": "Loading / unloading",
    "full-warehousing": "Full warehousing",
    other: "Other"
  };

  /* ---------------------------------------------------------
     3. Toasts
     --------------------------------------------------------- */
  let toastWrap = null;
  function toast(message, kind) {
    if (!toastWrap) {
      toastWrap = document.createElement("div");
      toastWrap.className = "toast-wrap";
      toastWrap.setAttribute("aria-live", "polite");
      document.body.appendChild(toastWrap);
    }
    const el = document.createElement("div");
    el.className = "toast" + (kind === "err" ? " err" : "");
    el.innerHTML = '<i class="fa-solid ' + (kind === "err" ? "fa-circle-exclamation" : "fa-circle-check") + '"></i><span>' + esc(message) + "</span>";
    toastWrap.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => el.remove(), 350);
    }, 4200);
  }

  /* ---------------------------------------------------------
     4. Modal
     --------------------------------------------------------- */
  let modalEl = null;
  function openModal(title, bodyHTML, actionsHTML) {
    closeModal();
    modalEl = document.createElement("div");
    modalEl.className = "cjs-modal";
    modalEl.innerHTML =
      '<div class="cjs-modal-backdrop" data-close></div>' +
      '<div class="cjs-modal-card" role="dialog" aria-modal="true" aria-label="' + esc(title) + '">' +
      '<div class="cjs-modal-head"><h3>' + esc(title) + '</h3><button class="cjs-modal-x" data-close aria-label="Close">&times;</button></div>' +
      '<div class="cjs-modal-body">' + bodyHTML + "</div>" +
      (actionsHTML ? '<div class="cjs-modal-actions">' + actionsHTML + "</div>" : "") +
      "</div>";
    document.body.appendChild(modalEl);
    document.body.classList.add("modal-open");
    modalEl.addEventListener("click", e => {
      if (e.target.hasAttribute("data-close")) closeModal();
    });
    document.addEventListener("keydown", modalEsc);
    return modalEl;
  }
  function closeModal() {
    if (modalEl) { modalEl.remove(); modalEl = null; document.body.classList.remove("modal-open"); }
    document.removeEventListener("keydown", modalEsc);
  }
  function modalEsc(e) { if (e.key === "Escape") closeModal(); }

  /* ---------------------------------------------------------
     5. Global UI: sticky header, back-to-top, reveals
     --------------------------------------------------------- */
  function initGlobalUI() {
    const header = $(".site-header");
    if (header) {
      const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 10);
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }

    const topBtn = document.createElement("button");
    topBtn.className = "back-to-top";
    topBtn.setAttribute("aria-label", "Back to top");
    topBtn.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
    topBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    document.body.appendChild(topBtn);
    window.addEventListener("scroll", () => {
      topBtn.classList.toggle("show", window.scrollY > 500);
    }, { passive: true });

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(entries => {
        entries.forEach(en => {
          if (en.isIntersecting) { en.target.classList.add("revealed"); io.unobserve(en.target); }
        });
      }, { threshold: 0.12 });
      $$(".service-card, .value-card, .team-card, .about-row, .section-title, .form-card, .schedule-board, .dashboard-card").forEach(el => {
        el.classList.add("reveal");
        io.observe(el);
      });
    }
  }

  /* ---------------------------------------------------------
     6. Mobile menu (kept from v1)
     --------------------------------------------------------- */
  function initMobileMenu() {
    const toggle = $(".menu-toggle");
    const nav = $(".main-nav");
    if (!toggle || !nav) return;
    toggle.addEventListener("click", () => {
      nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", nav.classList.contains("open") ? "true" : "false");
    });
    $$("a", nav).forEach(link => link.addEventListener("click", () => {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }));
  }

  /* ---------------------------------------------------------
     7. Forms: validate, save to store, reference numbers
     --------------------------------------------------------- */
  function validateForm(form) {
    let valid = true;
    $$("[required]", form).forEach(field => {
      const bad = !field.value.trim() ||
        (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)) ;
      field.classList.toggle("invalid", bad);
      if (bad) valid = false;
    });
    if (!valid) {
      const first = $(".invalid", form);
      if (first) first.focus();
      toast("Please complete the highlighted fields.", "err");
    }
    return valid;
  }

  function collect(form) {
    const out = {};
    $$("input, select, textarea", form).forEach(f => {
      if (f.name && f.type !== "file") out[f.name] = f.value.trim();
    });
    return out;
  }

  function initForms() {
    const configs = [
      { sel: ".enquiry-form", type: "freight" },
      { sel: ".warehousing-form", type: "warehousing" },
      { sel: ".contact-form", type: "contact" },
      { sel: ".shipment-form", type: "shipment" }
    ];

    configs.forEach(cfg => {
      const form = $(cfg.sel);
      if (!form) return;

      // live invalid-clearing
      form.addEventListener("input", e => e.target.classList.remove("invalid"));

      // character counters on textareas
      $$("textarea", form).forEach(ta => {
        const counter = document.createElement("span");
        counter.className = "char-count";
        const update = () => { counter.textContent = ta.value.length + " characters"; };
        ta.addEventListener("input", update);
        ta.parentNode.appendChild(counter);
        update();
      });

      form.addEventListener("submit", e => {
        e.preventDefault();
        if (!validateForm(form)) return;

        const btn = $('button[type="submit"]', form);
        const original = btn ? btn.innerHTML : "";
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...'; }

        setTimeout(() => {
          const values = collect(form);
          values.type = cfg.type;
          if (form._photos) values.photos = form._photos.map(p => ({ name: p.name, size: p.size, data: p.data }));
          const saved = Store.addEnquiry(values);

          if (btn) { btn.disabled = false; btn.innerHTML = original; }
          form.reset();
          if (form._photos) {
            form._photos.length = 0;
            const pv = $("#ship-previews", form);
            if (pv) pv.innerHTML = "";
            const ow = $("#ship-other-wrap", form);
            const oi = $("#ship-packing-other", form);
            if (ow) ow.hidden = true;
            if (oi) { oi.required = false; oi.value = ""; }
          }
          $$(".char-count", form).forEach(c => { c.textContent = "0 characters"; });

          let success = $(".success-message", form);
          if (!success) {
            success = document.createElement("div");
            success.className = "success-message";
            form.appendChild(success);
          }
          success.innerHTML =
            '<i class="fa-solid fa-circle-check"></i> Thank you. Your enquiry reference is <strong>' + esc(saved.ref) +
            "</strong>. Our team will contact you within one business day.";
          success.style.display = "block";
          success.scrollIntoView({ behavior: "smooth", block: "center" });
          toast("Enquiry " + saved.ref + " saved.", "ok");
          setTimeout(() => { success.style.display = "none"; }, 10000);
        }, 700);
      });
    });

    // Pre-fill freight form from query string (e.g. from schedule board)
    const freight = $(".enquiry-form");
    if (freight && location.search) {
      const params = new URLSearchParams(location.search);
      const map = { service: "service", pol: "pol", pod: "pod", vessel: "cargo" };
      Object.keys(map).forEach(p => {
        if (!params.get(p)) return;
        const field = freight.querySelector('[name="' + map[p] + '"]');
        if (!field) return;
        if (field.tagName === "SELECT") {
          if ($$('option', field).some(o => o.value === params.get(p))) field.value = params.get(p);
        } else {
          field.value = params.get(p);
        }
      });
      if (params.get("vessel")) {
        const note = freight.querySelector('[name="message"]');
        if (note) note.value = "I would like to book space on " + params.get("vessel") + " (ETD " + (params.get("etd") || "") + ").";
      }
      if ([...params.keys()].length) toast("Details pre-filled from the sailing you selected.", "ok");
    }
  }

  /* ---------------------------------------------------------
     8. Freight live indicative estimator
     --------------------------------------------------------- */
  function initFreightEstimator() {
    const box = $("#quote-estimator");
    const form = $(".enquiry-form");
    if (!box || !form) return;

    const service = $("#enq-service");
    const weight = $("#enq-weight");
    const pol = $("#enq-pol");
    const pod = $("#enq-pod");

    function parseKg(str) {
      if (!str) return null;
      const m = str.replace(/,/g, "").match(/(\d+(\.\d+)?)\s*(kg|t|tonne|tons?|cbm)?/i);
      if (!m) return null;
      let v = parseFloat(m[1]);
      const unit = (m[3] || "kg").toLowerCase();
      if (unit.startsWith("t")) v *= 1000;
      if (unit === "cbm") v *= 333;
      return v > 0 ? v : null;
    }

    function update() {
      const svc = service ? service.value : "";
      const kg = weight ? parseKg(weight.value) : null;
      const from = pol ? pol.value.trim() : "";
      const to = pod ? pod.value.trim() : "";

      if (!svc && !kg && !from && !to) { box.classList.remove("active"); return; }
      box.classList.add("active");

      const lines = [];
      if (svc) lines.push(["Service", SERVICE_LABEL[svc] || svc]);
      if (from || to) lines.push(["Route", (from || "—") + " → " + (to || "—")]);
      if (kg) {
        lines.push(["Chargeable weight", kg >= 1000 ? (kg / 1000).toFixed(1) + " t" : kg.toFixed(0) + " kg"]);
        const mode = svc === "sea-freight" ? "LCL/FCL sea" : svc === "road-freight" ? "road" : svc === "export-freight" ? "export coordination" : "local delivery";
        lines.push(["Indicative mode", mode]);
        const cbm = (kg / 333).toFixed(1);
        lines.push(["Est. volume equivalent", "~" + cbm + " CBM"]);
      }
      box.innerHTML =
        '<h4><i class="fa-solid fa-calculator"></i> Indicative summary</h4>' +
        (lines.length
          ? "<dl>" + lines.map(l => "<dt>" + esc(l[0]) + "</dt><dd>" + esc(l[1]) + "</dd>").join("") + "</dl>"
          : "<p>Start filling the form and a summary builds here.</p>") +
        '<p class="est-note">Indicative only — final quotation confirmed by our team.</p>';
    }

    [service, weight, pol, pod].forEach(f => { if (f) f.addEventListener("input", update); });
    update();
  }

  /* ---------------------------------------------------------
     9. Warehousing space estimator (slider)
     --------------------------------------------------------- */
  function initWarehouseEstimator() {
    const box = $("#wh-estimator");
    if (!box) return;
    const slider = $("#wh-pallets");
    const weeks = $("#wh-weeks");
    const out = $("#wh-estimate-out");
    const pOut = $("#wh-pallets-out");
    const wOut = $("#wh-weeks-out");
    if (!slider || !out) return;

    function update() {
      const pallets = parseInt(slider.value, 10) || 0;
      const sqft = Math.round(pallets * 18 * 1.3); // pallet ~18 sq ft + aisle allowance
      const weeksV = weeks ? parseInt(weeks.value, 10) || 4 : 4;
      if (pOut) pOut.textContent = pallets;
      if (wOut) wOut.textContent = weeksV + " week" + (weeksV === 1 ? "" : "s");
      out.innerHTML =
        "<strong>" + pallets + " pallet" + (pallets === 1 ? "" : "s") + "</strong> ≈ <strong>" +
        sqft.toLocaleString() + " sq ft</strong> of storage, est. " + weeksV + " week" + (weeksV === 1 ? "" : "s") + " stay.";
    }
    slider.addEventListener("input", update);
    if (weeks) weeks.addEventListener("input", update);
    update();
  }

  /* ---------------------------------------------------------
     9b. Shipment details form — photo attachments & packing
     --------------------------------------------------------- */
  function initShipmentForm() {
    const form = $(".shipment-form");
    if (!form) return;

    const fileInput = $("#ship-photos", form);
    const previews = $("#ship-previews", form);
    const packing = $("#ship-packing", form);
    const otherWrap = $("#ship-other-wrap", form);
    const otherInput = $("#ship-packing-other", form);
    if (!fileInput || !previews) return;

    const MAX_PHOTOS = 3;
    const LIMIT_KB = 250 * 1024;
    let photos = [];
    form._photos = photos;

    function renderPhotos() {
      previews.innerHTML = photos.map((p, i) =>
        '<div class="photo-chip">' +
        (p.data ? '<img src="' + p.data + '" alt="Cargo photo preview" />' : '<i class="fa-solid fa-image"></i>') +
        '<span title="' + esc(p.name) + '">' + esc(p.name) + "</span>" +
        '<button type="button" data-i="' + i + '" aria-label="Remove photo"><i class="fa-solid fa-xmark"></i></button>' +
        "</div>"
      ).join("");
    }

    fileInput.addEventListener("change", () => {
      Array.from(fileInput.files).forEach(file => {
        if (photos.length >= MAX_PHOTOS) { toast("You can attach up to 3 photos.", "err"); return; }
        if (!file.type.startsWith("image/")) { toast("Only image files can be attached.", "err"); return; }
        const rec = { name: file.name, size: file.size, data: null };
        const push = () => { photos.push(rec); renderPhotos(); };
        if (file.size <= LIMIT_KB) {
          const reader = new FileReader();
          reader.onload = () => { rec.data = reader.result; push(); };
          reader.onerror = () => toast("Could not read " + file.name, "err");
          reader.readAsDataURL(file);
        } else {
          push();
          toast(file.name + " — over 250 KB, recorded by name only.", "ok");
        }
      });
      fileInput.value = "";
    });

    previews.addEventListener("click", e => {
      const btn = e.target.closest("button[data-i]");
      if (!btn) return;
      photos.splice(parseInt(btn.getAttribute("data-i"), 10), 1);
      renderPhotos();
    });

    if (packing && otherWrap && otherInput) {
      packing.addEventListener("change", () => {
        const showOther = packing.value === "other";
        otherWrap.hidden = !showOther;
        otherInput.required = showOther;
        if (!showOther) otherInput.value = "";
      });
    }
  }

  /* ---------------------------------------------------------
     10. Shipping schedule board (rendered from store)
     --------------------------------------------------------- */
  function initScheduleBoard() {
    const board = $(".schedule-board");
    const tbody = board ? $(".schedule-table tbody", board) : null;
    if (!board || !tbody || !$("#pol-filter")) return;

    const toolbar = $(".schedule-toolbar", board);
    // extra controls
    const controls = document.createElement("div");
    controls.className = "schedule-controls";
    controls.innerHTML =
      '<input type="search" id="sch-search" placeholder="Search vessel or destination..." aria-label="Search schedule" />' +
      '<select id="status-filter" aria-label="Filter by status">' +
      '<option value="">All statuses</option><option value="booking">Booking</option>' +
      '<option value="closing">Closing</option><option value="departed">Departed</option>' +
      '<option value="delayed">Delayed</option></select>' +
      '<button type="button" class="btn btn-navy btn-small" id="sch-sort"><i class="fa-solid fa-arrow-down-short-wide"></i> Sort by ETD</button>';
    toolbar.appendChild(controls);

    const stamp = document.createElement("p");
    stamp.className = "schedule-updated";
    board.appendChild(stamp);

    const polSel = $("#pol-filter");
    const statusSel = $("#status-filter");
    const search = $("#sch-search");
    let sortAsc = true;

    function render() {
      const pol = polSel.value;
      const status = statusSel.value;
      const q = (search.value || "").toLowerCase();

      let rows = Store.data.schedules.slice();
      if (pol) rows = rows.filter(r => r.pol === pol);
      if (status) rows = rows.filter(r => r.status === status);
      if (q) rows = rows.filter(r => (r.vessel + " " + r.pod + " " + r.pol).toLowerCase().includes(q));
      rows.sort((a, b) => sortAsc ? a.etd.localeCompare(b.etd) : b.etd.localeCompare(a.etd));

      if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--grey);padding:28px;">No sailings match your filters.</td></tr>';
      } else {
        tbody.innerHTML = rows.map(r =>
          '<tr class="schedule-row" data-id="' + esc(r.id) + '" data-pol="' + esc(r.pol) + '" data-status="' + esc(r.status) + '" tabindex="0">' +
          "<td><strong>" + esc(r.vessel) + "</strong></td>" +
          "<td>" + esc(r.pol) + "</td><td>" + esc(r.pod) + "</td>" +
          "<td>" + fmtDate(r.etd) + "</td><td>" + fmtDate(r.eta) + "</td><td>" + fmtDate(r.closing) + "</td>" +
          '<td><span class="status status-' + esc(r.status) + '">' + (STATUS_LABEL[r.status] || r.status) + "</span></td>" +
          "</tr>"
        ).join("");
      }

      // counts over POL+status filtered set (ignoring search)
      let counted = Store.data.schedules.slice();
      if (pol) counted = counted.filter(r => r.pol === pol);
      if (status) counted = counted.filter(r => r.status === status);
      const counts = { booking: 0, closing: 0, departed: 0, delayed: 0 };
      counted.forEach(r => { if (counts[r.status] != null) counts[r.status]++; });
      Object.keys(counts).forEach(k => {
        const el = $("#count-" + k);
        if (el) el.textContent = counts[k];
      });

      stamp.innerHTML = '<i class="fa-solid fa-clock-rotate-left"></i> Board last updated ' + fmtDateTime(Store.data.updatedAt) + " · click a sailing for details";
    }

    [polSel, statusSel].forEach(el => el.addEventListener("change", render));
    search.addEventListener("input", render);
    $("#sch-sort").addEventListener("click", () => { sortAsc = !sortAsc; render(); toast("Sorted by ETD " + (sortAsc ? "(soonest first)" : "(latest first)")); });

    // row click → detail modal with enquiry shortcut
    tbody.addEventListener("click", e => {
      const tr = e.target.closest(".schedule-row");
      if (tr) showSailing(tr.getAttribute("data-id"));
    });
    tbody.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        const tr = e.target.closest(".schedule-row");
        if (tr) showSailing(tr.getAttribute("data-id"));
      }
    });

    function showSailing(id) {
      const r = Store.data.schedules.find(x => x.id === id);
      if (!r) return;
      const body =
        '<table class="modal-table"><tbody>' +
        "<tr><th>Vessel / Service</th><td>" + esc(r.vessel) + "</td></tr>" +
        "<tr><th>Port of Loading</th><td>" + esc(r.pol) + "</td></tr>" +
        "<tr><th>Port of Discharge</th><td>" + esc(r.pod) + "</td></tr>" +
        "<tr><th>ETD</th><td>" + fmtDate(r.etd) + "</td></tr>" +
        "<tr><th>ETA</th><td>" + fmtDate(r.eta) + "</td></tr>" +
        "<tr><th>Cargo closing</th><td>" + fmtDate(r.closing) + "</td></tr>" +
        '<tr><th>Status</th><td><span class="status status-' + esc(r.status) + '">' + (STATUS_LABEL[r.status] || r.status) + "</span></td></tr>" +
        "</tbody></table>" +
        '<p class="est-note">Schedules are indicative and subject to change. Contact us for confirmed space.</p>';
      const href = "freight-enquiry.html?service=sea-freight&pol=" + encodeURIComponent(r.pol) +
        "&pod=" + encodeURIComponent(r.pod) + "&vessel=" + encodeURIComponent(r.vessel) + "&etd=" + encodeURIComponent(fmtDate(r.etd));
      const modal = openModal(r.vessel, body, '<a class="btn btn-primary" href="' + href + '"><i class="fa-solid fa-file-invoice-dollar"></i> Enquire about this sailing</a>');
      modal.querySelector(".cjs-modal-actions").insertAdjacentHTML("beforeend", '<button class="btn btn-navy" data-close>Close</button>');
    }

    render();
  }

  /* ---------------------------------------------------------
     11. Services wizard
     --------------------------------------------------------- */
  function initWizard() {
    const host = $("#service-wizard");
    if (!host) return;

    const steps = [
      {
        q: "Where is your cargo moving?",
        opts: [
          { v: "intl-sea", label: "Overseas by sea" },
          { v: "regional-road", label: "Cross-border by road" },
          { v: "export", label: "Exporting from Singapore" },
          { v: "local", label: "Within Singapore" },
          { v: "store", label: "Nowhere yet — I need storage" }
        ]
      },
      {
        q: "How big is the shipment?",
        opts: [
          { v: "small", label: "A few cartons" },
          { v: "pallets", label: "Pallets" },
          { v: "container", label: "Full container / truckload" },
          { v: "unsure", label: "Not sure yet" }
        ]
      },
      {
        q: "What matters most right now?",
        opts: [
          { v: "cost", label: "Keeping cost down" },
          { v: "speed", label: "Speed" },
          { v: "handholding", label: "Someone to handle paperwork" },
          { v: "unsure", label: "Not sure — advise me" }
        ]
      }
    ];

    let answers = [];

    function renderStep(i) {
      const s = steps[i];
      host.innerHTML =
        '<div class="wizard-progress">' + steps.map((_, k) => '<span class="' + (k <= i ? "on" : "") + '"></span>').join("") + "</div>" +
        "<h3>" + esc(s.q) + "</h3>" +
        '<div class="wizard-opts">' + s.opts.map(o => '<button type="button" class="wizard-opt" data-v="' + esc(o.v) + '">' + esc(o.label) + "</button>").join("") + "</div>" +
        (i > 0 ? '<button type="button" class="wizard-back"><i class="fa-solid fa-arrow-left"></i> Back</button>' : "");
      $$(".wizard-opt", host).forEach(btn => btn.addEventListener("click", () => {
        answers[i] = btn.getAttribute("data-v");
        if (i + 1 < steps.length) renderStep(i + 1);
        else renderResult();
      }));
      const back = $(".wizard-back", host);
      if (back) back.addEventListener("click", () => renderStep(i - 1));
    }

    function renderResult() {
      const [where, size, priority] = answers;
      let service = "sea-freight";
      let why = "Sea freight gives you the best balance of cost and capacity for overseas cargo.";
      if (where === "regional-road") { service = "road-freight"; why = "Cross-border road freight is the practical choice for regional, time-sensitive deliveries."; }
      if (where === "export") { service = "export-freight"; why = "Our export team handles bookings, documentation and compliance for you."; }
      if (where === "local") { service = "local-transport"; why = "Local transport covers collections and deliveries anywhere in Singapore."; }
      if (where === "store") { service = "warehousing"; why = "Warehousing gives you secure space with handling and loading support."; }
      if (priority === "handholding" && where !== "store") { service = "export-freight"; why = "Export freight includes documentation and coordination handled end-to-end by our team."; }
      if (priority === "speed" && where === "intl-sea") { why = "Sea freight with priority booking and pre-cleared documentation keeps transit as tight as possible."; }
      if (size === "container") why += " Full-load options apply to your volume.";
      if (size === "small") why += " Consolidation (LCL/LTL) keeps small shipments affordable.";

      const href = service === "warehousing" ? "warehousing.html" : "freight-enquiry.html?service=" + service;
      host.innerHTML =
        '<div class="wizard-result">' +
        '<i class="fa-solid fa-wand-magic-sparkles"></i>' +
        "<h3>We'd start with " + esc(SERVICE_LABEL[service] || (service === "warehousing" ? "Warehousing" : service)) + "</h3>" +
        "<p>" + esc(why) + "</p>" +
        '<a class="btn btn-primary" href="' + href + '">Start an enquiry <i class="fa-solid fa-arrow-right"></i></a> ' +
        '<button type="button" class="btn btn-navy wizard-restart">Start over</button>' +
        "</div>";
      $(".wizard-restart", host).addEventListener("click", () => { answers = []; renderStep(0); });
    }

    renderStep(0);
  }

  /* ---------------------------------------------------------
     12. Home counters
     --------------------------------------------------------- */
  function initCounters() {
    const strip = $("#home-counters");
    if (!strip) return;
    const items = [
      { n: 4, label: "People in our Singapore team" },
      { n: 5, label: "Core logistics services" },
      { n: 4, label: "Values we work by" },
      { n: 1, label: "Business day to reply" }
    ];
    strip.innerHTML = items.map(i => '<div class="counter"><div class="num" data-n="' + i.n + '">0</div><div class="lbl">' + esc(i.label) + "</div></div>").join("");
    const nums = $$(".num", strip);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animate = () => nums.forEach(el => {
      const target = parseInt(el.getAttribute("data-n"), 10);
      if (reduce) { el.textContent = target; return; }
      let cur = 0;
      const step = Math.max(1, Math.round(target / 24));
      const t = setInterval(() => {
        cur += step;
        if (cur >= target) { cur = target; clearInterval(t); }
        el.textContent = cur;
      }, 45);
    });
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(en => { if (en[0].isIntersecting) { animate(); io.disconnect(); } }, { threshold: 0.4 });
      io.observe(strip);
    } else animate();
  }

  /* ---------------------------------------------------------
     13. Admin: session, dashboard, tabs, CRUD
     --------------------------------------------------------- */
  function initAdmin() {
    const loginForm = $(".admin-login-form");
    if (!loginForm) return;

    const loginView = $(".admin-login-view");
    const dashboard = $(".admin-dashboard");
    const errorBox = $(".admin-error");

    function isLoggedIn() { return sessionStorage.getItem(SESSION_KEY) === "1"; }

    function showDashboard() {
      loginView.style.display = "none";
      dashboard.style.display = "block";
      document.title = "Admin Dashboard — CJS Lines";
      buildDashboard();
    }
    function showLogin() {
      dashboard.style.display = "none";
      loginView.style.display = "flex";
      document.title = "Admin Login — CJS Lines";
    }

    loginForm.addEventListener("submit", e => {
      e.preventDefault();
      const u = $("#admin-user").value.trim();
      const p = $("#admin-pass").value.trim();
      if (u === "admin" && p === "admin123") {
        sessionStorage.setItem(SESSION_KEY, "1");
        errorBox.style.display = "none";
        toast("Welcome back, " + u + ".", "ok");
        showDashboard();
      } else {
        errorBox.style.display = "block";
        errorBox.textContent = "Invalid username or password. Try admin / admin123.";
      }
    });

    const logout = $(".admin-logout");
    if (logout) logout.addEventListener("click", () => {
      sessionStorage.removeItem(SESSION_KEY);
      loginForm.reset();
      showLogin();
      toast("Logged out.", "ok");
    });

    if (isLoggedIn()) showDashboard();

    /* ---------- dashboard body ---------- */
    function buildDashboard() {
      const wrap = $(".admin-body");
      if (!wrap) return;

      let tab = "enquiries";

      function stats() {
        const enq = Store.data.enquiries;
        const fresh = enq.filter(e => e.status === "new").length;
        const quoted = enq.filter(e => e.status === "quoted").length;
        const active = Store.data.schedules.filter(s => s.status === "booking" || s.status === "closing").length;
        return [
          { label: "New enquiries", n: fresh },
          { label: "Pending quotes", n: quoted },
          { label: "Active sailings", n: active },
          { label: "Documents", n: Store.data.documents.length }
        ];
      }

      function render() {
        const s = stats();
        wrap.innerHTML =
          '<div class="dashboard-cards">' + s.map(c => '<div class="dashboard-card"><h3>' + esc(c.label) + '</h3><div class="number">' + c.n + "</div></div>").join("") + "</div>" +
          '<div class="admin-tabs" role="tablist">' +
          '<button class="admin-tab' + (tab === "enquiries" ? " on" : "") + '" data-tab="enquiries"><i class="fa-solid fa-inbox"></i> Enquiries</button>' +
          '<button class="admin-tab' + (tab === "schedules" ? " on" : "") + '" data-tab="schedules"><i class="fa-solid fa-calendar-days"></i> Schedules</button>' +
          '<button class="admin-tab' + (tab === "documents" ? " on" : "") + '" data-tab="documents"><i class="fa-solid fa-folder-open"></i> Documents</button>' +
          "</div>" +
          '<div class="admin-panel" id="admin-panel"></div>';

        $$(".admin-tab", wrap).forEach(b => b.addEventListener("click", () => { tab = b.getAttribute("data-tab"); render(); }));
        const panel = $("#admin-panel", wrap);
        if (tab === "enquiries") renderEnquiries(panel);
        if (tab === "schedules") renderSchedules(panel);
        if (tab === "documents") renderDocuments(panel);
      }

      /* ----- enquiries tab ----- */
      function renderEnquiries(panel) {
        const list = Store.data.enquiries;
        panel.innerHTML =
          '<div class="schedule-board"><div class="schedule-toolbar">' +
          '<strong><i class="fa-solid fa-inbox"></i> All enquiries (' + list.length + ")</strong>" +
          '<div class="schedule-controls">' +
          '<select id="enq-filter"><option value="">All statuses</option><option value="new">New</option><option value="quoted">Quoted</option><option value="closed">Closed</option></select>' +
          '<button class="btn btn-navy btn-small" id="enq-csv"><i class="fa-solid fa-file-csv"></i> Export CSV</button>' +
          "</div></div>" +
          '<div style="overflow-x:auto"><table class="schedule-table"><thead><tr><th>Ref</th><th>Date</th><th>Customer</th><th>Type</th><th>Summary</th><th>Status</th><th></th></tr></thead><tbody id="enq-rows"></tbody></table></div></div>';

        const tbody = $("#enq-rows", panel);
        const filter = $("#enq-filter", panel);

        function draw() {
          const f = filter.value;
          const rows = list.filter(e => !f || e.status === f);
          if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--grey);padding:26px;">No enquiries yet. Submit one from the Freight, Warehousing or Contact page and it will appear here.</td></tr>';
            return;
          }
          tbody.innerHTML = rows.map(e =>
            "<tr>" +
            "<td><strong>" + esc(e.ref) + "</strong></td>" +
            "<td>" + fmtDateTime(e.date) + "</td>" +
            "<td>" + esc(e.name || "—") + "<br><span style='font-size:.8rem;color:var(--grey)'>" + esc(e.email || "") + "</span></td>" +
            "<td>" + esc(e.type) + "</td>" +
            "<td>" + esc(summary(e)) + "</td>" +
            '<td><select class="status-select" data-id="' + esc(e.id) + '">' +
            Object.keys(ENQ_STATUS_LABEL).map(k => '<option value="' + k + '"' + (e.status === k ? " selected" : "") + ">" + ENQ_STATUS_LABEL[k] + "</option>").join("") +
            "</select></td>" +
            '<td style="white-space:nowrap"><button class="icon-btn" data-view="' + esc(e.id) + '" title="View"><i class="fa-solid fa-eye"></i></button> ' +
            '<button class="icon-btn danger" data-del="' + esc(e.id) + '" title="Delete"><i class="fa-solid fa-trash"></i></button></td>' +
            "</tr>"
          ).join("");
        }

        function summary(e) {
          if (e.type === "freight") return (SERVICE_LABEL[e.service] || e.service || "") + " " + (e.pol || "") + (e.pod ? " → " + e.pod : "");
          if (e.type === "warehousing") return (SERVICE_LABEL[e.service] || e.service || "") + (e.space ? ", " + e.space : "");
          if (e.type === "shipment") return (e.loadingPort || "—") + " → " + (e.dischargePort || "—") + (e.cargo ? " · " + String(e.cargo).slice(0, 24) : "");
          return e.subject || e.message ? String(e.subject || e.message).slice(0, 40) : "Message";
        }

        filter.addEventListener("change", draw);

        $("#enq-csv", panel).addEventListener("click", () => {
          const head = ["ref", "date", "type", "status", "name", "company", "email", "phone", "service", "route", "cargo", "measurement", "readiness", "packing", "photos", "details"];
          const lines = [head.join(",")].concat(list.map(e => [
            e.ref, e.date, e.type, e.status, e.name, e.company, e.email, e.phone,
            e.service || "",
            e.type === "shipment"
              ? (e.loadingPort || "") + "->" + (e.dischargePort || "")
              : (e.pol || "") + (e.pod ? "->" + e.pod : ""),
            e.cargo || "",
            e.type === "shipment" ? [e.length, e.width, e.height, e.cbm, e.weight].filter(v => v).join(" x ") : "",
            e.type === "shipment" ? [e.readyDate, e.targetEtd].filter(v => v).join(" / ") : "",
            e.type === "shipment" ? (e.packing === "other" ? e.packingOther : e.packing) || "" : "",
            Array.isArray(e.photos) ? e.photos.map(p => p.name).join("; ") : "",
            (e.message || e.dimensions || e.handling || "")
          ].map(v => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"').join(",")));
          const blob = new Blob([lines.join("\n")], { type: "text/csv" });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "cjs-enquiries.csv";
          a.click();
          URL.revokeObjectURL(a.href);
          toast("CSV exported.", "ok");
        });

        tbody.addEventListener("change", e => {
          const sel = e.target.closest(".status-select");
          if (sel) {
            Store.setEnquiryStatus(sel.getAttribute("data-id"), sel.value);
            toast("Status updated.", "ok");
            render();
          }
        });
        tbody.addEventListener("click", e => {
          const view = e.target.closest("[data-view]");
          const del = e.target.closest("[data-del]");
          if (view) {
            const enq = Store.data.enquiries.find(x => x.id === view.getAttribute("data-view"));
            if (!enq) return;
            const rows = Object.keys(enq)
              .filter(k => !["id"].includes(k))
              .map(k => {
                let v = enq[k];
                if (k === "photos" && Array.isArray(v)) v = v.length ? v.map(p => p.name).join(", ") : "None";
                if (typeof v === "string" && v.startsWith("data:")) v = "[image data]";
                return "<tr><th>" + esc(k) + "</th><td>" + esc(v) + "</td></tr>";
              }).join("");
            openModal("Enquiry " + enq.ref, '<div style="overflow-x:auto"><table class="modal-table"><tbody>' + rows + "</tbody></table></div>",
              '<button class="btn btn-navy" data-close>Close</button>');
          }
          if (del) {
            if (confirm("Delete this enquiry permanently?")) {
              Store.deleteEnquiry(del.getAttribute("data-del"));
              toast("Enquiry deleted.", "ok");
              render();
            }
          }
        });

        draw();
      }

      /* ----- schedules tab ----- */
      function renderSchedules(panel) {
        panel.innerHTML =
          '<div class="schedule-board"><div class="schedule-toolbar"><strong><i class="fa-solid fa-calendar-days"></i> Sailing schedule management</strong>' +
          '<button class="btn btn-primary btn-small" id="sch-add"><i class="fa-solid fa-plus"></i> Add sailing</button></div>' +
          '<div style="overflow-x:auto"><table class="schedule-table"><thead><tr><th>Vessel</th><th>POL</th><th>POD</th><th>ETD</th><th>ETA</th><th>Closing</th><th>Status</th><th></th></tr></thead><tbody id="sch-rows"></tbody></table></div></div>';

        const tbody = $("#sch-rows", panel);

        function draw() {
          tbody.innerHTML = Store.data.schedules.map(s =>
            "<tr>" +
            "<td><strong>" + esc(s.vessel) + "</strong></td>" +
            "<td>" + esc(s.pol) + "</td><td>" + esc(s.pod) + "</td>" +
            '<td><input type="date" class="cell-input" data-id="' + esc(s.id) + '" data-f="etd" value="' + esc(s.etd) + '"></td>' +
            '<td><input type="date" class="cell-input" data-id="' + esc(s.id) + '" data-f="eta" value="' + esc(s.eta) + '"></td>' +
            '<td><input type="date" class="cell-input" data-id="' + esc(s.id) + '" data-f="closing" value="' + esc(s.closing) + '"></td>' +
            '<td><select class="status-select" data-id="' + esc(s.id) + '" data-f="status">' +
            Object.keys(STATUS_LABEL).map(k => '<option value="' + k + '"' + (s.status === k ? " selected" : "") + ">" + STATUS_LABEL[k] + "</option>").join("") +
            "</select></td>" +
            '<td><button class="icon-btn danger" data-del="' + esc(s.id) + '" title="Delete"><i class="fa-solid fa-trash"></i></button></td>' +
            "</tr>"
          ).join("");
        }

        tbody.addEventListener("change", e => {
          const el = e.target.closest("[data-id]");
          if (!el) return;
          Store.updateSchedule(el.getAttribute("data-id"), { [el.getAttribute("data-f")]: el.value });
          toast("Schedule updated — public board refreshed.", "ok");
        });
        tbody.addEventListener("click", e => {
          const del = e.target.closest("[data-del]");
          if (del && confirm("Remove this sailing from the public board?")) {
            Store.deleteSchedule(del.getAttribute("data-del"));
            toast("Sailing removed.", "ok");
            draw();
            render();
          }
        });

        $("#sch-add", panel).addEventListener("click", () => {
          const modal = openModal("Add sailing",
            '<div class="modal-form">' +
            ['<label>Vessel / service<input id="nf-vessel" placeholder="CJS Starline 111"></label>',
              '<label>POL<input id="nf-pol" placeholder="Singapore"></label>',
              '<label>POD<input id="nf-pod" placeholder="Port Klang"></label>',
              '<label>ETD<input type="date" id="nf-etd"></label>',
              '<label>ETA<input type="date" id="nf-eta"></label>',
              '<label>Closing<input type="date" id="nf-closing"></label>',
              '<label>Status<select id="nf-status">' + Object.keys(STATUS_LABEL).map(k => '<option value="' + k + '">' + STATUS_LABEL[k] + "</option>").join("") + "</select></label>"].join("") +
            "</div>",
            '<button class="btn btn-primary" id="nf-save">Save sailing</button><button class="btn btn-navy" data-close>Cancel</button>');
          $("#nf-save", modal).addEventListener("click", () => {
            const v = $("#nf-vessel", modal).value.trim();
            const pol = $("#nf-pol", modal).value.trim();
            const pod = $("#nf-pod", modal).value.trim();
            if (!v || !pol || !pod) { toast("Vessel, POL and POD are required.", "err"); return; }
            Store.addSchedule({
              vessel: v, pol: pol, pod: pod,
              etd: $("#nf-etd", modal).value || new Date().toISOString().slice(0, 10),
              eta: $("#nf-eta", modal).value || new Date().toISOString().slice(0, 10),
              closing: $("#nf-closing", modal).value || new Date().toISOString().slice(0, 10),
              status: $("#nf-status", modal).value
            });
            closeModal();
            toast("Sailing added to the public board.", "ok");
            draw(); render();
          });
        });

        draw();
      }

      /* ----- documents tab ----- */
      function renderDocuments(panel) {
        panel.innerHTML =
          '<div class="schedule-board"><div class="schedule-toolbar"><strong><i class="fa-solid fa-folder-open"></i> Documents</strong>' +
          '<label class="btn btn-primary btn-small" style="cursor:pointer"><i class="fa-solid fa-upload"></i> Upload<input type="file" id="doc-upload" multiple hidden></label></div>' +
          '<div style="overflow-x:auto"><table class="schedule-table"><thead><tr><th>Name</th><th>Size</th><th>Uploaded</th><th></th></tr></thead><tbody id="doc-rows"></tbody></table></div>' +
          '<p class="form-note" style="padding:12px 18px 4px;">Demo storage: files under 400 KB are kept in this browser so they can be re-downloaded; larger files are recorded by name only.</p></div>';

        const tbody = $("#doc-rows", panel);

        function draw() {
          const docs = Store.data.documents;
          if (!docs.length) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--grey);padding:26px;">No documents uploaded yet.</td></tr>';
            return;
          }
          tbody.innerHTML = docs.map(d =>
            "<tr><td><i class='fa-solid fa-file-lines' style='color:var(--navy)'></i> " + esc(d.name) + "</td>" +
            "<td>" + (d.size / 1024).toFixed(1) + " KB</td><td>" + fmtDateTime(d.date) + "</td>" +
            '<td style="white-space:nowrap">' +
            (d.data ? '<button class="icon-btn" data-dl="' + esc(d.id) + '" title="Download"><i class="fa-solid fa-download"></i></button> ' : "") +
            '<button class="icon-btn danger" data-del="' + esc(d.id) + '" title="Delete"><i class="fa-solid fa-trash"></i></button></td></tr>'
          ).join("");
        }

        $("#doc-upload", panel).addEventListener("change", e => {
          Array.from(e.target.files).forEach(file => {
            const record = { name: file.name, size: file.size, data: null };
            if (file.size <= 400 * 1024) {
              const reader = new FileReader();
              reader.onload = () => { record.data = reader.result; Store.addDocument(record); draw(); };
              reader.readAsDataURL(file);
            } else {
              Store.addDocument(record);
              draw();
            }
          });
          toast("Document(s) uploaded.", "ok");
          e.target.value = "";
        });

        tbody.addEventListener("click", e => {
          const dl = e.target.closest("[data-dl]");
          const del = e.target.closest("[data-del]");
          if (dl) {
            const d = Store.data.documents.find(x => x.id === dl.getAttribute("data-dl"));
            if (d && d.data) {
              const a = document.createElement("a");
              a.href = d.data; a.download = d.name; a.click();
            }
          }
          if (del && confirm("Delete this document?")) {
            Store.deleteDocument(del.getAttribute("data-del"));
            toast("Document deleted.", "ok");
            draw(); render();
          }
        });

        draw();
      }

      render();
    }
  }

  /* ---------------------------------------------------------
     Boot
     --------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", function () {
    Store.load();
    initGlobalUI();
    initMobileMenu();
    initForms();
    initFreightEstimator();
    initWarehouseEstimator();
    initShipmentForm();
    initScheduleBoard();
    initWizard();
    initCounters();
    initAdmin();
  });
})();
