const STORAGE_KEY = 'bricknbath_quotation_v1';

/* ---------- Default state ---------- */
const defaultState = {
  cust: {
    name: '', mobile: '', email: '', address: '', sto: '', note: '', rate: 0,
    quoteNo: '', date: new Date().toISOString().slice(0, 10)
  },
  bath: { no: '1', length: '', width: '', height: '' },
  extraSqft: [],
  packages: [
    { key: 'aura', name: 'Aura Package', price: 156489 },
    { key: 'prestige', name: 'Prestige Package', price: 119900 },
    { key: 'elite', name: 'Elite Package', price: 2548145 },
    { key: 'signature', name: 'Signature Package', price: 8655544 },
  ],
  selectedPackage: null,

  addons: [
    { key: "glass", name: "Glass Partition", qty: 0, rate: 0, unit: "Per Sq. Ft.", prefix: "Starting from" },
    { key: "shower", name: "Shower Enclosure", qty: 0, rate: 0, unit: "Each", prefix: "Starting from" },
    { key: "rain", name: "Rain Shower", qty: 0, rate: 0, unit: "Each", prefix: "" },
    { key: "niche", name: "Niche Shelf", qty: 0, rate: 0, unit: "Each", prefix: "Starting from" },
    { key: "cistern", name: "Concealed Cistern Upgrade", qty: 0, rate: 0, unit: "Each", prefix: "" },
    { key: "designer", name: "Designer Accessories", qty: 0, rate: 0, unit: "Each", prefix: "Starting from" },
    { key: "vanity", name: "Vanity Cabinet Upgrade", qty: 0, rate: 0, unit: "Each", prefix: "" },
    { key: "premiumcp", name: "Premium CP Fittings", qty: 0, rate: 0, unit: "Each", prefix: "Starting from" },
    { key: "smartwc", name: "Smart WC", qty: 0, rate: 0, unit: "Each", prefix: "Starting from" },
    { key: "storage", name: "More Storage Options", qty: 0, rate: 0, unit: "Per Unit", prefix: "Starting from" },
    { key: "tiles", name: "Premium Tile Upgrade", qty: 0, rate: 0, unit: "Per Sq. Ft.", prefix: "Starting from" },
    { key: "geyser", name: "Geyser Installation", qty: 0, rate: 0, unit: "Each", prefix: "" },
    { key: "led", name: "LED Smart Mirror", qty: 0, rate: 0, unit: "Each", prefix: "Starting from" },
    { key: "ceiling", name: "False Ceiling", qty: 0, rate: 0, unit: "Each", prefix: "Starting from" }
  ]
};

let state = loadState() || JSON.parse(JSON.stringify(defaultState));

/* ==========================================================
   MIGRATE OLDER SAVED STATE
   Earlier versions stored Extra Sq.ft. as a single object
   ({ particular, qty, unit, rate }) instead of an array. If a
   browser still has that shape saved in localStorage, convert
   it into the new array format so nothing crashes or gets lost.
   ========================================================== */
function migrateState() {
  if (!Array.isArray(state.extraSqft)) {
    const old = state.extraSqft;
    if (old && (old.particular || old.qty || old.rate)) {
      state.extraSqft = [{
        key: 'extra_' + Date.now(),
        particular: old.particular || '',
        qty: old.qty || '',
        unit: old.unit || 'Per Sq. Ft.',
        rate: old.rate || ''
      }];
    } else {
      state.extraSqft = [];
    }
  }
  if (!Array.isArray(state.addons)) {
    state.addons = JSON.parse(JSON.stringify(defaultState.addons));
  }
}
migrateState();

/* counter to keep newly added custom-addon keys unique within a session */
let customAddonCounter = 0;
/* counter to keep newly added Extra Sq.ft. row keys unique within a session */
let extraSqftCounter = 0;

/* ---------- Helpers ---------- */
function formatINR(num) {
  const n = Number(num) || 0;
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}
function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => t.classList.remove('show'), 2200);
}
function el(id) { return document.getElementById(id); }

function renderPackageForm() {

  const wrap = el('packageList');

  if (!wrap) return;

  wrap.innerHTML = '';

  state.packages.forEach(pkg => {

    const isSelected =
      state.selectedPackage === pkg.key;

    const row = document.createElement('label');

    row.className =
      'package-option' +
      (isSelected ? ' selected' : '');

    row.innerHTML = `

      <input
        type="radio"
        name="pkgRadio"
        value="${pkg.key}"
        ${isSelected ? 'checked' : ''}
      >

      <span class="pkg-name">
        ${pkg.name}
      </span>

      <input
        type="number"
        class="pkg-price-input"
        data-key="${pkg.key}"
        value="${pkg.price} "
        min="0"
        step="1"
      >

    `;

    wrap.appendChild(row);
  });
  // Package select
  wrap
    .querySelectorAll('input[name="pkgRadio"]')
    .forEach(radio => {

      radio.addEventListener('change', function () {

        state.selectedPackage = this.value;

        renderPackageForm();

        syncPreview();
      });

    });
  // Package price change
  wrap
    .querySelectorAll('.pkg-price-input')
    .forEach(input => {

      input.addEventListener('input', function () {

        const key = this.dataset.key;

        const pkg = state.packages.find(
          p => p.key === key
        );

        if (!pkg) return;

        pkg.price =
          parseFloat(this.value) || 0;

        syncPreview();
      });

    });
}

const ADDON_UNIT_OPTIONS = ["Each", "Per Unit", "Per Sq. Ft."];

function renderAddonForm() {
  const wrap = el('addonList');
  wrap.innerHTML = '';

  const unitOptionsHtml = ADDON_UNIT_OPTIONS.map(opt =>
    `<option value="${opt}">${opt}</option>`
  ).join('');

  state.addons.forEach(addon => {
    const amount = (addon.qty || 0) * (addon.rate || 0);

    if (addon.custom) {
      // ---- CUSTOM (user-added) row ----
      // Built as its own self-contained card with forced (!important)
      // inline styling, so it always renders correctly and stays clickable
      // no matter what style.css / patch.css define for .addon-row.
      const row = document.createElement('div');
      row.className = 'addon-row-custom';
      row.setAttribute(
        'style',
        'display:flex !important; flex-wrap:wrap !important; align-items:center !important; ' +
        'gap:8px !important; width:100% !important; background:#F9FAFB !important; ' +
        'border:1px solid #D1D5DB !important; border-radius:10px !important; ' +
        'padding:10px !important; margin-bottom:8px !important; box-sizing:border-box !important;'
      );

      row.innerHTML = `
        <input
          type="text"
          class="addon-name-input"
          data-key="${addon.key}"
          placeholder="New add-on name"
          value="${(addon.name || '').replace(/"/g, '&quot;')}"
          style="flex:1 1 160px !important; min-width:140px !important; color:#111827 !important; background:#ffffff !important; border:1px solid #D1D5DB !important; border-radius:8px !important; padding:7px 9px !important; font-size:13px !important; font-family:inherit !important;"
        />

        <input
          type="number"
          min="0"
          class="addon-qty"
          data-key="${addon.key}"
          placeholder="Qty"
          value="${addon.qty}"
          style="width:60px !important; color:#111827 !important; background:#ffffff !important; border:1px solid #D1D5DB !important; border-radius:8px !important; padding:7px 6px !important; font-size:13px !important;"
        />

        <select
          class="addon-prefix"
          data-key="${addon.key}"
          style="width:120px !important; color:#111827 !important; background:#ffffff !important; border:1px solid #D1D5DB !important; border-radius:8px !important; padding:7px 6px !important; font-size:13px !important;"
        >
          <option value="" ${addon.prefix === '' ? 'selected' : ''}>Select</option>
          <option value="Starting from" ${addon.prefix === 'Starting from' ? 'selected' : ''}>Starting from</option>
        </select>

        <input
          type="number"
          min="0"
          class="addon-rate"
          data-key="${addon.key}"
          placeholder="Rate (₹)"
          value="${addon.rate}"
          style="width:90px !important; color:#111827 !important; background:#ffffff !important; border:1px solid #D1D5DB !important; border-radius:8px !important; padding:7px 6px !important; font-size:13px !important;"
        />

        <select
          class="addon-unit"
          data-key="${addon.key}"
          style="width:110px !important; color:#111827 !important; background:#ffffff !important; border:1px solid #D1D5DB !important; border-radius:8px !important; padding:7px 6px !important; font-size:13px !important;"
        >
          ${unitOptionsHtml}
        </select>

        <span
          class="addon-amount"
          data-amount="${addon.key}"
          style="min-width:80px !important; text-align:right !important; color:#0C5C36 !important; font-weight:600 !important; font-size:13px !important;"
        >${formatINR(amount)}</span>

        <button
          type="button"
          class="addon-remove"
          data-key="${addon.key}"
          title="Remove this add-on"
          style="flex:0 0 auto !important; width:28px !important; height:28px !important; display:flex !important; align-items:center !important; justify-content:center !important; background:#FEE2E2 !important; color:#DC2626 !important; border:1px solid #FCA5A5 !important; border-radius:8px !important; font-weight:800 !important; font-size:15px !important; line-height:1 !important; cursor:pointer !important; z-index:5 !important; position:relative !important;"
        >✕</button>
      `;

      // Correctly select the currently-set unit
      const unitSel = row.querySelector('.addon-unit');
      if (unitSel) unitSel.value = addon.unit || 'Each';

      wrap.appendChild(row);
    } else {
      // ---- BUILT-IN row: unchanged original layout ----
      const row = document.createElement('div');
      row.className = 'addon-row';

      row.innerHTML = `
        <span class="addon-name">${addon.name}</span>

        <input
          type="number"
          min="0"
          class="addon-qty"
          data-key="${addon.key}"
          data-label="Qty"
          value="${addon.qty}"
        />

        <select class="addon-prefix" data-key="${addon.key}" data-label="Prefix">
          <option value="">Select</option>
          <option value="Starting from"
              ${addon.prefix === "Starting from" ? "selected" : ""}>
              Starting from
          </option>
        </select>

        <input
          type="number"
          min="0"
          class="addon-rate"
          data-key="${addon.key}"
          data-label="Rate (₹)"
          value="${addon.rate}"
        />

        <select
          class="addon-unit"
          data-key="${addon.key}"
        >
          ${unitOptionsHtml}
        </select>

        <span class="addon-amount" data-amount="${addon.key}">
          ${formatINR(amount)}
        </span>
      `;

      const unitSel = row.querySelector('.addon-unit');
      if (unitSel) unitSel.value = addon.unit;

      wrap.appendChild(row);
    }
  });

  wrap.querySelectorAll('.addon-name-input').forEach(inp => {
    inp.addEventListener('input', e => {
      const addon = state.addons.find(a => a.key === e.target.dataset.key);
      if (!addon) return;
      addon.name = e.target.value;
      syncPreview();
    });
  });

  wrap.querySelectorAll('.addon-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const key = btn.dataset.key;
      state.addons = state.addons.filter(a => a.key !== key);
      renderAddonForm();
      syncPreview();
    });
  });

  wrap.querySelectorAll('.addon-qty').forEach(inp => {
    inp.addEventListener('input', e => {
      const addon = state.addons.find(a => a.key === e.target.dataset.key);
      addon.qty = parseFloat(e.target.value) || 0;
      updateAddonAmount(addon);
      syncPreview();
    });
  });

  wrap.querySelectorAll('.addon-prefix').forEach((item) => {
    item.addEventListener('change', function () {
      const addon = state.addons.find(a => a.key === this.dataset.key);
      addon.prefix = this.value;
      syncPreview();
    });
  });

  wrap.querySelectorAll('.addon-rate').forEach(inp => {
    inp.addEventListener('input', e => {
      const addon = state.addons.find(a => a.key === e.target.dataset.key);
      addon.rate = parseFloat(e.target.value) || 0;
      updateAddonAmount(addon);
      syncPreview();
    });
  });
  wrap.querySelectorAll('.addon-unit').forEach(sel => {
    sel.addEventListener('change', e => {
      const addon = state.addons.find(a => a.key === e.target.dataset.key);
      addon.unit = e.target.value;
      syncPreview();
    });
  });
}

function updateAddonAmount(addon) {
  const span = document.querySelector(`[data-amount="${addon.key}"]`);
  if (span) span.textContent = formatINR((addon.qty || 0) * (addon.rate || 0));
}

/* ==========================================================
   ADD CUSTOM ADD-ON
   ========================================================== */
function addCustomAddon() {
  const newAddon = {
    key: 'custom_' + Date.now() + '_' + (customAddonCounter++),
    name: '',
    qty: 0,
    rate: 0,
    unit: 'Each',
    prefix: '',
    custom: true
  };
  state.addons.push(newAddon);
  renderAddonForm();
  syncPreview();

  // Focus the new row's name input so the user can start typing right away
  requestAnimationFrame(() => {
    const inputs = document.querySelectorAll('.addon-name-input');
    const last = inputs[inputs.length - 1];
    if (last) last.focus();
  });
}

/* ==========================================================
   EXTRA SQ.FT. — dynamic, multi-row list
   ========================================================== */
function addExtraSqftRow() {
  state.extraSqft.push({
    key: 'extra_' + Date.now() + '_' + (extraSqftCounter++),
    particular: '',
    qty: '',
    unit: 'Per Sq. Ft.',
    rate: ''
  });
  renderExtraSqftForm();
  syncPreview();

  requestAnimationFrame(() => {
    const inputs = document.querySelectorAll('.extra-particular-input');
    const last = inputs[inputs.length - 1];
    if (last) last.focus();
  });
}

function renderExtraSqftForm() {
  const wrap = el('extraSqftList');
  if (!wrap) return;
  wrap.innerHTML = '';

  state.extraSqft.forEach(row => {
    const rowEl = document.createElement('div');
    rowEl.className = 'extra-sqft-row';
    rowEl.setAttribute(
      'style',
      'display:flex !important; flex-wrap:wrap !important; align-items:center !important; ' +
      'gap:8px !important; width:100% !important; background:#F9FAFB !important; ' +
      'border:1px solid #D1D5DB !important; border-radius:10px !important; ' +
      'padding:10px !important; margin-bottom:8px !important; box-sizing:border-box !important;'
    );

    rowEl.innerHTML = `
      <input
        type="text"
        class="extra-particular-input"
        data-key="${row.key}"
        placeholder="Particular (e.g. Extra Height Charges)"
        value="${(row.particular || '').replace(/"/g, '&quot;')}"
        style="flex:1 1 160px !important; min-width:140px !important; color:#111827 !important; background:#ffffff !important; border:1px solid #D1D5DB !important; border-radius:8px !important; padding:7px 9px !important; font-size:13px !important; font-family:inherit !important;"
      />

      <input
        type="number"
        min="0"
        step="0.01"
        class="extra-qty-input"
        data-key="${row.key}"
        placeholder="Qty"
        value="${row.qty}"
        style="width:70px !important; color:#111827 !important; background:#ffffff !important; border:1px solid #D1D5DB !important; border-radius:8px !important; padding:7px 6px !important; font-size:13px !important;"
      />

      <select
        class="extra-unit-input"
        data-key="${row.key}"
        style="width:120px !important; color:#111827 !important; background:#ffffff !important; border:1px solid #D1D5DB !important; border-radius:8px !important; padding:7px 6px !important; font-size:13px !important;"
      >
        <option value="Per Sq. Ft.">Per Sq. Ft.</option>
        <option value="Each">Each</option>
        <option value="Per Unit">Per Unit</option>
      </select>

      <input
        type="number"
        min="0"
        step="1"
        class="extra-rate-input"
        data-key="${row.key}"
        placeholder="Rate (₹)"
        value="${row.rate}"
        style="width:90px !important; color:#111827 !important; background:#ffffff !important; border:1px solid #D1D5DB !important; border-radius:8px !important; padding:7px 6px !important; font-size:13px !important;"
      />

      <span
        class="extra-amount"
        data-amount="${row.key}"
        style="min-width:80px !important; text-align:right !important; color:#0C5C36 !important; font-weight:600 !important; font-size:13px !important;"
      >${formatINR((parseFloat(row.qty) || 0) * (parseFloat(row.rate) || 0))}</span>

      <button
        type="button"
        class="extra-remove"
        data-key="${row.key}"
        title="Remove this row"
        style="flex:0 0 auto !important; width:28px !important; height:28px !important; display:flex !important; align-items:center !important; justify-content:center !important; background:#FEE2E2 !important; color:#DC2626 !important; border:1px solid #FCA5A5 !important; border-radius:8px !important; font-weight:800 !important; font-size:15px !important; line-height:1 !important; cursor:pointer !important; z-index:5 !important; position:relative !important;"
      >✕</button>
    `;

    const unitSel = rowEl.querySelector('.extra-unit-input');
    if (unitSel) unitSel.value = row.unit || 'Per Sq. Ft.';

    wrap.appendChild(rowEl);
  });

  wrap.querySelectorAll('.extra-particular-input').forEach(inp => {
    inp.addEventListener('input', e => {
      const row = state.extraSqft.find(r => r.key === e.target.dataset.key);
      if (!row) return;
      row.particular = e.target.value;
      syncPreview();
    });
  });

  wrap.querySelectorAll('.extra-qty-input').forEach(inp => {
    inp.addEventListener('input', e => {
      const row = state.extraSqft.find(r => r.key === e.target.dataset.key);
      if (!row) return;
      row.qty = e.target.value;
      updateExtraAmount(row);
      syncPreview();
    });
  });

  wrap.querySelectorAll('.extra-unit-input').forEach(sel => {
    sel.addEventListener('change', e => {
      const row = state.extraSqft.find(r => r.key === e.target.dataset.key);
      if (!row) return;
      row.unit = e.target.value;
      syncPreview();
    });
  });

  wrap.querySelectorAll('.extra-rate-input').forEach(inp => {
    inp.addEventListener('input', e => {
      const row = state.extraSqft.find(r => r.key === e.target.dataset.key);
      if (!row) return;
      row.rate = e.target.value;
      updateExtraAmount(row);
      syncPreview();
    });
  });

  wrap.querySelectorAll('.extra-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const key = btn.dataset.key;
      state.extraSqft = state.extraSqft.filter(r => r.key !== key);
      renderExtraSqftForm();
      syncPreview();
    });
  });
}

function updateExtraAmount(row) {
  const span = document.querySelector(`.extra-amount[data-amount="${row.key}"]`);
  if (span) span.textContent = formatINR((parseFloat(row.qty) || 0) * (parseFloat(row.rate) || 0));
}

/* ==========================================================
   BIND SIMPLE FIELDS (customer + bathroom)
   ========================================================== */
function bindSimpleFields() {
  const map = [
    ['custName', 'cust', 'name'],
    ['custMobile', 'cust', 'mobile'],
    ['custEmail', 'cust', 'email'],
    ['custAddress', 'cust', 'address'],
    ['custSTO', 'cust', 'sto'],
    ['quoteNo', 'cust', 'quoteNo'],
    ['quoteDate', 'cust', 'date'],
    ['quotationNote', 'cust', 'note'],

    ['bathNo', 'bath', 'no'],
    ['bathLength', 'bath', 'length'],
    ['bathWidth', 'bath', 'width'],
    ['bathHeight', 'bath', 'height']
  ];
  map.forEach(([id, group, key]) => {

    const input = el(id);

    if (!input) return;

    input.value = state[group]?.[key] || '';

    input.addEventListener('input', () => {

      state[group][key] = input.value;

      if (group === 'bath') {
        updateArea();
      }

      syncPreview();
    });

  });
  updateArea();
}


function updateArea() {
  const l = parseFloat(state.bath.length) || 0;
  const w = parseFloat(state.bath.width) || 0;
  const area = (l * w).toFixed(1).replace(/\.0$/, '');
  el('bathArea').value = area;
  state.bath.area = area;
}

/* ==========================================================
   CALCULATIONS
   ========================================================== */
function getSelectedPackage() {
  if (!state.selectedPackage) return null;
  return state.packages.find(p => p.key === state.selectedPackage) || null;
}
function getAddonTotal() {
  return state.addons.reduce((sum, a) => sum + (a.qty || 0) * (a.rate || 0), 0);
}
function getExtraSqftTotal() {
  return (state.extraSqft || []).reduce((sum, row) => {
    const qty = parseFloat(row.qty) || 0;
    const rate = parseFloat(row.rate) || 0;
    return sum + qty * rate;
  }, 0);
}
// grand total — package price is included ONLY when a package is selected
function getGrandTotal() {

  const selectedPkg = getSelectedPackage();

  const packagePrice =
    selectedPkg ? (selectedPkg.price || 0) : 0;

  const addonTotal =
    getAddonTotal();

  const extraSqftTotal =
    getExtraSqftTotal();

  return (
    packagePrice +
    addonTotal +
    extraSqftTotal
  );
}

/* ==========================================================
   SYNC LIVE PREVIEW
   ========================================================== */
function syncPreview() {
  // Customer info
  el('pv-custName').textContent = state.cust.name || '—';
  el('pv-custMobile').textContent = state.cust.mobile || '—';
  el('pv-custEmail').textContent = state.cust.email || '—';
  el('pv-custAddress').textContent = state.cust.address || '—';
  el('pv-custSTO').textContent = state.cust.sto || '—';
  el('pv-quoteNo').textContent = state.cust.quoteNo || '—';
  el('pv-quoteDate').textContent = formatDate(state.cust.date);

  const noteBox = el('quotationNotePreview');
  const noteText = el('pv-quotationNote');

  if (state.cust.note && state.cust.note.trim() !== '') {
    noteText.textContent = state.cust.note;
    noteBox.style.display = 'block';
  } else {
    noteText.textContent = '';
    noteBox.style.display = 'none';
  }

  // Bathroom details
  el('pv-bathNo').textContent = state.bath.no || '1';
  el('pv-bathLength').textContent = state.bath.length || '0';
  el('pv-bathWidth').textContent = state.bath.width || '0';
  el('pv-bathHeight').textContent = state.bath.height || '0';
  el('pv-bathArea').textContent = state.bath.area || '0';

  /* ================= PACKAGE TABLE (dynamic) =================
     Nothing shows in the quotation until the user actually selects
     a package in the form. Once selected, only that one package's
     row appears here — the whole section is hidden otherwise. */
  const pkgSection = el('pv-packageSection');
  const pkgBody = el("pv-packageRows");
  const selectedPkg = getSelectedPackage();

  pkgBody.innerHTML = "";

  if (!selectedPkg) {
    // No package chosen yet — hide the entire section in the preview
    if (pkgSection) pkgSection.style.display = 'none';
  } else {
    // A package is chosen — show the section with ALL packages listed,
    // but only the selected one has its price filled in; the rest stay blank.
    if (pkgSection) pkgSection.style.display = '';

    state.packages.forEach((pkg) => {
      const isSelected = pkg.key === state.selectedPackage;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${pkg.name}</td>
        <td>${isSelected ? formatINR(pkg.price) + " (Incd. GST)" : "—"}</td>
        <td class="pkg-check">${isSelected ? "✓" : "—"}</td>
      `;
      pkgBody.appendChild(tr);
    });
  }

  // Add-on table — only show rows the user has actually filled in
  // (Qty > 0). Untouched add-ons are skipped entirely, not shown as "-".
  const addonBody = el("pv-addonRows");
  addonBody.innerHTML = "";

  const filledAddons = state.addons.filter(a => (a.qty || 0) > 0);
  const addonSection = el('pv-addonSection');
  if (addonSection) addonSection.style.display = filledAddons.length > 0 ? '' : 'none';

  filledAddons.forEach((addon) => {
    const amount = (addon.qty || 0) * (addon.rate || 0);
    const displayName = (addon.name && addon.name.trim() !== '')
      ? addon.name
      : (addon.custom ? 'Custom Add-on' : addon.name);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${displayName}</td>

      <td class="text-center">
        ${addon.qty}
      </td>
      <td class="text-right">
        ${addon.prefix} ${formatINR(addon.rate)}/- ${addon.unit}
      </td>
      <td class="text-right">
        ${formatINR(amount)} /-*
      </td>
    `;

    addonBody.appendChild(tr);
  });

  // ================= TOTALS =================
  // Package price only counts toward the grand total when a package
  // is actually selected — otherwise it contributes ₹0.
  // Add-on total already includes custom add-ons since getAddonTotal()
  // sums across the full state.addons array.

  const pkgPrice = selectedPkg ? (selectedPkg.price || 0) : 0;

  const addonTotal = getAddonTotal();

  const extraSqftTotal = getExtraSqftTotal();

  const grandTotal = pkgPrice + addonTotal + extraSqftTotal;

  el('pv-packagePrice').textContent = formatINR(pkgPrice);
  el('pv-addonTotal').textContent = formatINR(addonTotal);
  el('pv-grandTotal').textContent = formatINR(grandTotal) + " (Incd. GST)";

  // ================= EXTRA SQ.FT. =================
  // Only rows the user actually filled in (Qty > 0 and Rate > 0) appear here.

  const extraTable = el('pv-extraSqftTable');
  const extraTotalRow = el('pv-extraSqftTotalRow');
  const extraBody = el('pv-extraSqftRows');

  const filledExtraRows = (state.extraSqft || []).filter(row => {
    const qty = parseFloat(row.qty) || 0;
    const rate = parseFloat(row.rate) || 0;
    return qty > 0 && rate > 0;
  });

  if (extraBody) extraBody.innerHTML = '';

  if (filledExtraRows.length > 0) {

    if (extraTable) extraTable.style.display = 'table';
    if (extraTotalRow) extraTotalRow.style.display = 'table-row';

    filledExtraRows.forEach(row => {
      const qty = parseFloat(row.qty) || 0;
      const rate = parseFloat(row.rate) || 0;
      const amount = qty * rate;
      const particular = (row.particular || '').trim() || 'Extra Sq.ft.';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${particular}</td>
        <td class="text-center">${qty}</td>
        <td class="text-center">${row.unit || 'Per Sq. Ft.'}</td>
        <td class="text-right">${formatINR(rate)}</td>
        <td class="text-right font-semibold">${formatINR(amount)}</td>
      `;
      if (extraBody) extraBody.appendChild(tr);
    });

    el('pv-extraSqftTotal').textContent = formatINR(extraSqftTotal);

  } else {
    if (extraTable) extraTable.style.display = 'none';
    if (extraTotalRow) extraTotalRow.style.display = 'none';
  }

  // ================= PAYMENT TERMS =================
  // Only show payment terms once a package has been selected.

  const paymentSection = el('pv-paymentSection');

  if (!selectedPkg) {
    if (paymentSection) paymentSection.style.display = 'none';
  } else {
    if (paymentSection) paymentSection.style.display = '';

    el('pv-pay1').textContent = formatINR(grandTotal * 0.20);
    el('pv-pay2').textContent = formatINR(grandTotal * 0.40);
    el('pv-pay3').textContent = formatINR(grandTotal * 0.30);
    el('pv-pay4').textContent = formatINR(grandTotal * 0.10);
  }
}

/* ==========================================================
   SAVE / LOAD (localStorage)
   ========================================================== */
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

/* ==========================================================
   ACTION BUTTONS
   ========================================================== */
el('btnSave').addEventListener('click', () => {
  saveState();
  showToast('Quotation saved locally ✓');
});

el('btnPreview').addEventListener('click', () => {
  syncPreview();
  document.querySelector('.preview-wrapper').scrollIntoView({ behavior: 'smooth', block: 'start' });
  showToast('Preview refreshed');
});

el('btnPrint').addEventListener('click', () => {
  window.print();
});

el('btnReset').addEventListener('click', () => {
  if (!confirm('Reset the entire form? This cannot be undone.')) return;
  localStorage.removeItem(STORAGE_KEY);
  state = JSON.parse(JSON.stringify(defaultState));
  init();
  showToast('Form reset');
});

el('btnAddAddon').addEventListener('click', addCustomAddon);
el('btnAddExtraSqft').addEventListener('click', addExtraSqftRow);

el('btnPdf').addEventListener('click', async () => {
  const btn = el('btnPdf');
  const originalHTML = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = 'Generating PDF…';

  try {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pages = document.querySelectorAll('.sheet-page');

    for (let i = 0; i < pages.length; i++) {
      const canvas = await html2canvas(pages[i], {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);
    }

    const fileName = `BricknBath_Quotation_${(state.cust.name || 'Customer').replace(/\s+/g, '_')}.pdf`;
    pdf.save(fileName);
    showToast('PDF downloaded ✓');
  } catch (err) {
    console.error(err);
    showToast('PDF generation failed');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHTML;
  }
});

function init() {
  bindSimpleFields();
  renderPackageForm();
  renderAddonForm();
  renderExtraSqftForm();
  syncPreview();
}

document.addEventListener('DOMContentLoaded', init);