const STORAGE_KEY = 'bricknbath_quotation_v1';

/* ---------- Default state ---------- */
const defaultState = {
  cust: {
    name: '', mobile: '', email: '', address: '', sto: '', note: '',
    quoteNo: '', date: new Date().toISOString().slice(0, 10)
  },
  bath: { no: '1', length: '', width: '', height: '' },
  packages: [
    { key: 'aura', name: 'Aura Package', price: 156489 },
    { key: 'prestige', name: 'Prestige Package', price: 119900 },
    { key: 'elite', name: 'Elite Package', price: 2548145 },
    { key: 'signature', name: 'Signature Package', price: 8655544 },
  ],
  selectedPackage: 'prestige',

  addons: [
    { key: "glass", name: "Glass Partition", qty: 0, rate: 0, unit: "Per Sq. Ft." , prefix: "Starting from"},
    { key: "shower", name: "Shower Enclosure", qty: 0, rate: 0, unit: "Each" , prefix: "Starting from"},
    { key: "rain", name: "Rain Shower", qty: 0, rate: 0, unit: "Each" , prefix: ""},
    { key: "niche", name: "Niche Shelf", qty: 0, rate: 0, unit: "Each" , prefix: "Starting from"},
    { key: "cistern", name: "Concealed Cistern Upgrade", qty: 0, rate: 0, unit: "Each" , prefix: ""},
    { key: "designer", name: "Designer Accessories", qty: 0, rate: 0, unit: "Each" , prefix: "Starting from"},
    { key: "vanity", name: "Vanity Cabinet Upgrade", qty: 0, rate: 0, unit: "Each" , prefix: ""},
    { key: "premiumcp", name: "Premium CP Fittings", qty: 0, rate: 0, unit: "Each" , prefix: "Starting from"},
    { key: "smartwc", name: "Smart WC", qty: 0, rate: 0, unit: "Each" , prefix: "Starting from"},
    { key: "storage", name: "More Storage Options", qty: 0, rate: 0, unit: "Per Unit" , prefix: "Starting from"},
    { key: "tiles", name: "Premium Tile Upgrade", qty: 0, rate: 0, unit: "Per Sq. Ft." , prefix: "Starting from"},
    { key: "geyser", name: "Geyser Installation", qty: 0, rate: 0, unit: "Each" , prefix: ""},
    { key: "led", name: "LED Smart Mirror", qty: 0, rate: 0, unit: "Each" , prefix: "Starting from"},
    { key: "ceiling", name: "False Ceiling", qty: 0, rate: 0, unit: "Each" , prefix: "Starting from"}
  ]
};

let state = loadState() || JSON.parse(JSON.stringify(defaultState));

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
  const wrap = el("packageList");
  wrap.innerHTML = "";

  state.packages.forEach((pkg) => {
    const isSelected = state.selectedPackage === pkg.key;

    const row = document.createElement("label");
    row.className = "package-option" + (isSelected ? " selected" : "");

    row.innerHTML = `
      <input
        type="radio"
        name="pkgRadio"
        value="${pkg.key}"
        data-key="${pkg.key}"
        ${isSelected ? "checked" : ""}
      />

      <span class="pkg-name">
        ${pkg.name}
      </span>

      <input
        type="number"bindSimpleFields
        class="pkg-price-input"
        data-key="${pkg.key}"
        value="${pkg.price}"
      />
    `;

    wrap.appendChild(row);
  });

  document.querySelectorAll('input[name="pkgRadio"]').forEach((radio) => {
    radio.addEventListener("change", function () {
      state.selectedPackage = this.value;
      renderPackageForm();
      syncPreview();
    });
  });

  document.querySelectorAll(".pkg-price-input").forEach((input) => {
    input.addEventListener("input", function () {
      const pkg = state.packages.find((p) => p.key === this.dataset.key);
      pkg.price = Number(this.value) || 0;
      syncPreview();
    });
  });
}

const ADDON_UNIT_OPTIONS = ["Each", "Per Unit", "Per Sq. Ft."];

function renderAddonForm() {
  const wrap = el('addonList');
  wrap.innerHTML = '';

  state.addons.forEach(addon => {
    const amount = (addon.qty || 0) * (addon.rate || 0);
    const row = document.createElement('div');
    row.className = 'addon-row';

    const unitOptionsHtml = ADDON_UNIT_OPTIONS.map(opt =>
      `<option value="${opt}" ${addon.unit === opt ? "selected" : ""}>${opt}</option>`
    ).join('');

    row.innerHTML = `
      <span class="addon-name">${addon.name}</span>

      <input
        type="number"
        min="0"
        class="addon-qty"
        data-key="${addon.key}"
        value="${addon.qty}"
      />

       <select class="addon-prefix" data-key="${addon.key}">
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
    wrap.appendChild(row);
  });

  wrap.querySelectorAll('.addon-qty').forEach(inp => {
    inp.addEventListener('input', e => {
      const addon = state.addons.find(a => a.key === e.target.dataset.key);
      addon.qty = parseFloat(e.target.value) || 0;
      updateAddonAmount(addon);
      syncPreview();
    });
  });

  wrap.querySelectorAll(".addon-prefix").forEach((item) => {

    item.addEventListener("change", function () {

        const addon = state.addons.find(
            a => a.key === this.dataset.key
        );

        addon.prefix = this.value;

        syncPreview();
    });

});
 document.querySelectorAll(".addon-prefix").forEach((item) => {

    item.addEventListener("change", function () {

        const addon = state.addons.find(
            a => a.key === this.dataset.key
        );

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
    ['bathHeight', 'bath', 'height'],
  ];
  map.forEach(([id, group, key]) => {
    const input = el(id);
    input.value = state[group][key];
    input.addEventListener('input', () => {
      state[group][key] = input.value;
      if (group === 'bath') updateArea();
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
  return state.packages.find(p => p.key === state.selectedPackage) || { name: '—', price: 0 };
}
function getAddonTotal() {
  return state.addons.reduce((sum, a) => sum + (a.qty || 0) * (a.rate || 0), 0);
}
function getGrandTotal() {
  return getSelectedPackage().price + getAddonTotal();
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

  // Package table
  const pkgBody = el("pv-packageRows");
  pkgBody.innerHTML = "";

  state.packages.forEach((pkg) => {
    const isSelected = pkg.key === state.selectedPackage;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${pkg.name}</td>
      <td>${isSelected ? formatINR(pkg.price) : "—"}</td>
      <td>${isSelected ? "✓" : ""}</td>
    `;

    pkgBody.appendChild(tr);
  });

  // Add-on table
  const addonBody = el("pv-addonRows");
  addonBody.innerHTML = "";

  state.addons.forEach((addon) => {
    const amount = (addon.qty || 0) * (addon.rate || 0);
    const isSelected = addon.qty > 0;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${addon.name}</td>

      <td class="text-center">
        ${isSelected ? addon.qty : "-"}
      </td>
      <td class="text-right">
    ${
        isSelected
            ? `${addon.prefix} ${formatINR(addon.rate)}/- ${addon.unit}`
            : "-"
    }
     </td> 
      <td class="text-right">
       ${isSelected ? `${formatINR(amount)} /-*` : "-"  }
      </td>
    `;

    addonBody.appendChild(tr);
  });

  // Totals
  const pkgPrice = getSelectedPackage().price;
  const addonTotal = getAddonTotal();
  const grandTotal = getGrandTotal();
  el('pv-packagePrice').textContent = formatINR(pkgPrice);
  el('pv-addonTotal').textContent = formatINR(addonTotal);
  el('pv-grandTotal').textContent = formatINR(grandTotal);

  // Payment terms
  el('pv-pay1').textContent = formatINR(grandTotal * 0.20);
  el('pv-pay2').textContent = formatINR(grandTotal * 0.40);
  el('pv-pay3').textContent = formatINR(grandTotal * 0.30);
  el('pv-pay4').textContent = formatINR(grandTotal * 0.10);
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
  syncPreview();
}

document.addEventListener('DOMContentLoaded', init);
