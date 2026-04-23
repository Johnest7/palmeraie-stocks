/**
 * app.js
 */

const user = getCurrentUser();
if (!user) {
  window.location.href = 'login.html';
}

document.getElementById('sidebarUserName').textContent = user.name;
document.getElementById('sidebarUserRole').textContent = user.role === 'admin' ? 'Administrateur' : 'Gérant';

if (user.role !== 'admin') {
  document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
}

const sidebar   = document.getElementById('sidebar');
const overlay   = document.getElementById('overlay');
const btnToggle = document.getElementById('btnToggle');

function toggleSidebar() {
  sidebar.classList.toggle('collapsed');
  btnToggle.textContent = sidebar.classList.contains('collapsed') ? '▶' : '◀';
}
function openSidebar() {
  sidebar.classList.add('mobile-open');
  overlay.classList.add('visible');
}
function closeSidebar() {
  sidebar.classList.remove('mobile-open');
  overlay.classList.remove('visible');
}

const dateEl = document.getElementById('topbarDate');
if (dateEl) {
  dateEl.textContent = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

let toastTimer;
function showToast(msg, type = 'success') {
  let toast = document.getElementById('appToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'appToast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = `toast ${type} visible`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 3000);
}

const pages = {
  dashboard:    { title: 'Tableau de bord',        render: renderDashboard },
  shopping:     { title: 'Nouveau Shopping',        render: renderShopping  },
  endofday:     { title: 'Fin de Journée',          render: renderEndOfDay  },
  losses:       { title: 'Journal des Pertes',      render: renderLosses    },
  history:      { title: 'Historique',              render: renderHistory   },
  products:     { title: 'Produits',                render: renderProducts  },
  reports:      { title: 'Rapports',                render: renderReports   },
  analytics:    { title: 'Analytics',               render: renderAnalytics    },
  intelligence: { title: 'Intelligence IA',         render: renderIntelligence },
  monthly:      { title: 'Comparaison mensuelle',   render: renderMonthlyComparison },
  dishes:       { title: 'Plats & Recettes',        render: renderDishes },
};

async function navigateTo(pageKey) {
  const page = pages[pageKey];
  if (!page) return;
  document.querySelectorAll('.nav-item').forEach(el =>
    el.classList.toggle('active', el.dataset.page === pageKey)
  );
  document.getElementById('topbarTitle').textContent = page.title;
  document.getElementById('pageContent').innerHTML =
    `<div class="loading-state"><i class="fa-solid fa-spinner fa-spin"></i> Chargement...</div>`;
  closeSidebar();
  await page.render();
}

document.querySelectorAll('.nav-item[data-page]').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    navigateTo(item.dataset.page);
  });
});

function setContent(html) {
  document.getElementById('pageContent').innerHTML = html;
}

// ============================================================
//  PAGE: DASHBOARD
// ============================================================
async function renderDashboard() {
  try {
    const stats = await api.get('/reports/dashboard');
    const alertsHtml = stats.alerts.length === 0
      ? '<p style="color:var(--color-text-muted);font-size:13px;">Aucune alerte — tous les stocks sont OK ✅</p>'
      : stats.alerts.map(a => `
          <div class="alert-item ${a.status === 'out' ? 'danger' : ''}">
            <i class="fa-solid ${a.status === 'out' ? 'fa-circle-xmark' : 'fa-triangle-exclamation'}"></i>
            <span class="alert-text"><span>${a.product_name}</span> — ${a.status === 'out' ? 'rupture de stock' : `seuil bas (${a.current_stock} ${a.unit})`}</span>
          </div>`).join('');

    let movementsHtml = '<p style="color:var(--color-text-muted);font-size:13px;">Connectez-vous en tant qu\'administrateur pour voir les mouvements.</p>';
    if (user.role === 'admin') {
      try {
        const history = await api.get('/reports/history');
        const recent = history.slice(0, 6);
        movementsHtml = recent.length === 0
          ? '<p style="color:var(--color-text-muted);font-size:13px;">Aucun mouvement enregistré.</p>'
          : `<table class="data-table"><thead><tr><th>Produit</th><th>Type</th><th>Qté</th><th>Par</th></tr></thead><tbody>
              ${recent.map(m => `<tr><td>${m.product}</td><td><span class="badge badge-${m.type === 'entry' ? 'entry' : m.type === 'exit' ? 'exit' : 'loss'}">${m.type === 'entry' ? 'Entrée' : m.type === 'exit' ? 'Sortie' : 'Perte'}</span></td><td>${m.quantity} ${m.unit}</td><td>${m.manager}</td></tr>`).join('')}
            </tbody></table>`;
      } catch(e) {}
    }

    setContent(`
      <p class="section-title">Aperçu du stock</p>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon green"><i class="fa-solid fa-box"></i></div><div class="stat-info"><span class="stat-value">${stats.total_products}</span><span class="stat-label">Produits en stock</span></div></div>
        <div class="stat-card"><div class="stat-icon yellow"><i class="fa-solid fa-triangle-exclamation"></i></div><div class="stat-info"><span class="stat-value">${stats.low_stock_count}</span><span class="stat-label">Stocks faibles</span></div></div>
        <div class="stat-card"><div class="stat-icon red"><i class="fa-solid fa-ban"></i></div><div class="stat-info"><span class="stat-value">${stats.out_of_stock_count}</span><span class="stat-label">Ruptures de stock</span></div></div>
        <div class="stat-card"><div class="stat-icon blue"><i class="fa-solid fa-cart-shopping"></i></div><div class="stat-info"><span class="stat-value">${stats.shopping_sessions_this_month}</span><span class="stat-label">Achats ce mois</span></div></div>
      </div>
      <div class="dashboard-grid">
        <div class="card"><h2><i class="fa-solid fa-bell" style="color:var(--color-warning);margin-right:8px;"></i>Alertes stock</h2><br><div class="alert-list">${alertsHtml}</div></div>
        <div class="card"><h2><i class="fa-solid fa-clock-rotate-left" style="color:var(--color-info);margin-right:8px;"></i>Derniers mouvements</h2><br>${movementsHtml}</div>
      </div>
    `);
  } catch (e) {
    setContent(`<div class="card"><p style="color:var(--color-danger);">Erreur: ${e.message}</p></div>`);
  }
}

// ============================================================
//  PAGE: NOUVEAU SHOPPING
// ============================================================
async function renderShopping() {
  try {
    const products = await api.get('/products');
    const productOptions = products.map(p =>
      `<option value="${p.id}" data-unit="${p.unit}" data-price="${p.selling_price}">${p.name} (${p.unit})</option>`
    ).join('');
    window._shoppingProductOptions = productOptions;

    setContent(`
      <div class="card">
        <h2><i class="fa-solid fa-cart-plus" style="color:var(--color-accent);margin-right:8px;"></i>Nouvelle session d'achat</h2>
        <p style="margin-top:4px;">Enregistrez tous les articles achetés lors de cette session.</p>
      </div>
      <div class="card">
        <div class="form-row">
          <div class="form-group"><label>Notes (optionnel)</label><input type="text" class="form-control" id="shoppingNotes" placeholder="ex: Marché Tilène"></div>
          <div class="form-group"><label>Photo du reçu (optionnel)</label><input type="file" class="form-control" id="receiptPhoto" accept="image/*" capture="environment" onchange="previewPhoto(this)"><div class="photo-preview" id="photoPreview"></div></div>
        </div>
        <hr style="border:none;border-top:1px solid var(--color-border);margin:16px 0;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <h3 style="font-size:14px;font-weight:700;">Articles achetés</h3>
          <button class="btn btn-outline btn-sm" onclick="addShoppingItem()"><i class="fa-solid fa-plus"></i> Ajouter un article</button>
        </div>
        <div class="table-wrap">
          <table class="items-table" id="shoppingItemsTable">
            <thead><tr><th style="width:38%">Produit</th><th style="width:18%">Quantité</th><th style="width:22%">Prix unitaire (FCFA)</th><th style="width:14%">Sous-total</th><th style="width:8%"></th></tr></thead>
            <tbody id="shoppingItemsBody"><tr id="emptyShoppingRow"><td colspan="5" style="text-align:center;color:var(--color-text-muted);padding:20px;">Cliquez sur "Ajouter un article" pour commencer</td></tr></tbody>
          </table>
        </div>
        <hr style="border:none;border-top:1px solid var(--color-border);margin:16px 0;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <h3 style="font-size:14px;font-weight:700;">Autres dépenses <span style="font-size:12px;font-weight:400;color:var(--color-text-muted);">(optionnel)</span></h3>
          <button class="btn btn-outline btn-sm" onclick="addOtherExpense()"><i class="fa-solid fa-plus"></i> Ajouter une dépense</button>
        </div>
        <div class="table-wrap">
          <table class="items-table">
            <thead><tr><th style="width:55%">Justification / Description</th><th style="width:33%">Montant (FCFA)</th><th style="width:12%"></th></tr></thead>
            <tbody id="otherExpensesBody"><tr id="emptyExpenseRow"><td colspan="3" style="text-align:center;color:var(--color-text-muted);padding:12px;">Aucune autre dépense</td></tr></tbody>
          </table>
        </div>
        <hr style="border:none;border-top:1px solid var(--color-border);margin:16px 0;">
        <div style="display:flex;justify-content:flex-end;margin-bottom:20px;">
          <div style="background:var(--color-accent-light);border-radius:10px;padding:14px 24px;text-align:right;min-width:240px;">
            <div style="font-size:12px;color:var(--color-text-muted);margin-bottom:4px;">TOTAL AUTOMATIQUE</div>
            <div id="shoppingTotalDisplay" style="font-size:24px;font-weight:700;color:var(--color-accent);">0 FCFA</div>
            <div style="font-size:11px;color:var(--color-text-muted);margin-top:2px;" id="totalBreakdown"></div>
          </div>
        </div>
        <div style="display:flex;gap:12px;justify-content:flex-end;">
          <button class="btn btn-outline" onclick="navigateTo('dashboard')">Annuler</button>
          <button class="btn btn-primary" onclick="submitShopping()"><i class="fa-solid fa-floppy-disk"></i> Enregistrer la session</button>
        </div>
      </div>
    `);
    addShoppingItem();
  } catch (e) {
    setContent(`<div class="card"><p style="color:var(--color-danger);">Erreur: ${e.message}</p></div>`);
  }
}

function addShoppingItem() {
  const body = document.getElementById('shoppingItemsBody');
  const empty = document.getElementById('emptyShoppingRow');
  if (empty) empty.remove();
  const productOptions = window._shoppingProductOptions || '';
  const row = document.createElement('tr');
  row.className = 'shopping-item-row';
  row.innerHTML = `
    <td><select class="form-control item-product" onchange="updateUnit(this); updateShoppingTotal();"><option value="">-- Sélectionner --</option>${productOptions}</select></td>
    <td><div style="display:flex;align-items:center;gap:6px;"><input type="number" class="form-control item-qty" placeholder="0" min="0" step="0.1" style="width:80px;" oninput="updateShoppingTotal()"><span class="item-unit-label" style="font-size:12px;color:var(--color-text-muted);white-space:nowrap;"></span></div></td>
    <td><input type="number" class="form-control item-price" placeholder="0" min="0" oninput="updateShoppingTotal()"></td>
    <td style="font-weight:600;color:var(--color-accent);" class="item-subtotal">0</td>
    <td><button class="btn-remove-item" onclick="this.closest('tr').remove(); updateShoppingTotal();"><i class="fa-solid fa-trash"></i></button></td>
  `;
  body.appendChild(row);
  updateShoppingTotal();
}

function addOtherExpense() {
  const body = document.getElementById('otherExpensesBody');
  const empty = document.getElementById('emptyExpenseRow');
  if (empty) empty.remove();
  const row = document.createElement('tr');
  row.className = 'expense-row';
  row.innerHTML = `
    <td><input type="text" class="form-control expense-name" placeholder="ex: Transport, Carton, Main d'oeuvre..." required></td>
    <td><input type="number" class="form-control expense-amount" placeholder="0" min="0" oninput="updateShoppingTotal()"></td>
    <td><button class="btn-remove-item" onclick="this.closest('tr').remove(); updateShoppingTotal();"><i class="fa-solid fa-trash"></i></button></td>
  `;
  body.appendChild(row);
  updateShoppingTotal();
}

function updateShoppingTotal() {
  let itemsTotal = 0, expensesTotal = 0;
  document.querySelectorAll('.shopping-item-row').forEach(row => {
    const qty = parseFloat(row.querySelector('.item-qty')?.value) || 0;
    const price = parseFloat(row.querySelector('.item-price')?.value) || 0;
    const subtotal = qty * price;
    const subtotalEl = row.querySelector('.item-subtotal');
    if (subtotalEl) subtotalEl.textContent = new Intl.NumberFormat('fr-FR').format(subtotal);
    itemsTotal += subtotal;
  });
  document.querySelectorAll('.expense-row').forEach(row => {
    expensesTotal += parseFloat(row.querySelector('.expense-amount')?.value) || 0;
  });
  const total = itemsTotal + expensesTotal;
  const display = document.getElementById('shoppingTotalDisplay');
  const breakdown = document.getElementById('totalBreakdown');
  if (display) display.textContent = new Intl.NumberFormat('fr-FR').format(total) + ' FCFA';
  if (breakdown && expensesTotal > 0) {
    breakdown.textContent = `Articles: ${new Intl.NumberFormat('fr-FR').format(itemsTotal)} + Autres: ${new Intl.NumberFormat('fr-FR').format(expensesTotal)}`;
  } else if (breakdown) {
    breakdown.textContent = '';
  }
}

function updateUnit(select) {
  const opt = select.options[select.selectedIndex];
  select.closest('tr').querySelector('.item-unit-label').textContent = opt.dataset.unit || '';
}

function previewPhoto(input) {
  const preview = document.getElementById('photoPreview');
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = e => { preview.innerHTML = `<img src="${e.target.result}" alt="Aperçu reçu">`; };
    reader.readAsDataURL(input.files[0]);
  }
}

async function submitShopping() {
  const notes = document.getElementById('shoppingNotes')?.value.trim() || '';
  const photoInput = document.getElementById('receiptPhoto');
  const rows = document.querySelectorAll('.shopping-item-row');
  const items = [];
  let valid = true;
  rows.forEach(row => {
    const productId = parseInt(row.querySelector('.item-product').value);
    const qty = parseFloat(row.querySelector('.item-qty').value);
    const price = parseFloat(row.querySelector('.item-price').value) || 0;
    if (!productId || isNaN(qty) || qty <= 0) { valid = false; return; }
    items.push({ product_id: productId, quantity: qty, unit_price: price });
  });
  if (items.length === 0) { showToast('Ajoutez au moins un article.', 'error'); return; }
  if (!valid) { showToast('Vérifiez que tous les articles ont un produit et une quantité.', 'error'); return; }

  const expenseRows = document.querySelectorAll('.expense-row');
  let expensesTotal = 0;
  const expenseDetails = [];
  expenseRows.forEach(row => {
    const name = row.querySelector('.expense-name').value.trim();
    const amount = parseFloat(row.querySelector('.expense-amount').value) || 0;
    if (name && amount > 0) { expensesTotal += amount; expenseDetails.push(`${name}: ${new Intl.NumberFormat('fr-FR').format(amount)} FCFA`); }
  });

  let itemsTotal = 0;
  items.forEach(i => { itemsTotal += i.quantity * i.unit_price; });
  const totalCost = itemsTotal + expensesTotal;
  const fullNotes = [notes, expenseDetails.length > 0 ? `Autres dépenses: ${expenseDetails.join(', ')}` : ''].filter(Boolean).join(' | ');

  const formData = new FormData();
  formData.append('total_cost', totalCost);
  formData.append('items', JSON.stringify(items));
  if (fullNotes) formData.append('notes', fullNotes);
  if (photoInput.files[0]) formData.append('receipt_photo', photoInput.files[0]);

  try {
    await api.postForm('/shopping', formData);
    showToast('Session d\'achat enregistrée avec succès !');
    navigateTo('dashboard');
  } catch (e) {
    showToast(`Erreur: ${e.message}`, 'error');
  }
}

// ============================================================
//  PAGE: FIN DE JOURNÉE
// ============================================================
async function renderEndOfDay() {
  try {
    const products = await api.get('/products');
    const inStock = products.filter(p => p.current_stock > 0);

    if (inStock.length === 0) {
      setContent(`<div class="card"><div class="empty-state"><i class="fa-solid fa-box-open"></i><p>Aucun produit en stock. Commencez par enregistrer un shopping.</p></div></div>`);
      return;
    }

    const byCategory = {};
    inStock.forEach(p => {
      if (!byCategory[p.category]) byCategory[p.category] = [];
      byCategory[p.category].push(p);
    });

    const categorySections = Object.entries(byCategory).map(([cat, prods]) => `
      <div class="eod-category" data-category="${cat}">
        <div class="eod-category-title"><i class="fa-solid fa-tag"></i> ${cat}<span style="font-size:11px;color:var(--color-text-muted);margin-left:8px;">${prods.length} produit${prods.length>1?'s':''}</span></div>
        <div class="eod-cards-grid">
          ${prods.map(p => {
            const pct = Math.min((p.current_stock / (p.alert_threshold * 3)) * 100, 100);
            const barColor = p.current_stock <= 0 ? 'var(--color-danger)' : p.current_stock <= p.alert_threshold ? 'var(--color-warning)' : 'var(--color-accent)';
            return `
            <div class="eod-card" id="eod-card-${p.id}" data-name="${p.name.toLowerCase()}" data-category="${cat.toLowerCase()}">
              <div class="eod-card-header"><span class="eod-product-name">${p.name}</span><span class="eod-stock-badge">${p.current_stock} ${p.unit}</span></div>
              <div class="eod-stock-bar"><div style="background:${barColor};height:100%;width:${pct}%;border-radius:99px;transition:width 0.3s;"></div></div>
              <div class="eod-input-row">
                <button class="eod-btn-minus" onclick="eodAdjust(${p.id}, -1)">−</button>
                <div class="eod-qty-wrap">
                  <input type="number" class="eod-qty-input" id="eod-qty-${p.id}" data-product-id="${p.id}" data-unit="${p.unit}" data-stock="${p.current_stock}" value="0" min="0" step="1" onchange="eodOnChange(${p.id})" oninput="eodOnChange(${p.id})">
                  <span class="eod-unit">${p.unit}</span>
                </div>
                <button class="eod-btn-plus" onclick="eodAdjust(${p.id}, 1)">+</button>
              </div>
              <input type="text" class="eod-notes-input" id="eod-notes-${p.id}" placeholder="Note (optionnel)..." style="display:none;">
              <button class="eod-note-toggle" onclick="eodToggleNote(${p.id})"><i class="fa-solid fa-note-sticky"></i> Ajouter une note</button>
            </div>`;
          }).join('')}
        </div>
      </div>`).join('');

    setContent(`
      <div class="card" style="margin-bottom:12px;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
          <div>
            <h2 style="display:flex;align-items:center;gap:8px;"><i class="fa-solid fa-clipboard-check" style="color:var(--color-accent);"></i>Fin de Journée</h2>
            <p style="font-size:13px;color:var(--color-text-muted);margin-top:4px;">Saisissez les quantités consommées. Les produits non modifiés seront ignorés.</p>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <span id="eodCounter" style="font-size:13px;font-weight:600;color:var(--color-text-muted);">0 produit modifié</span>
            <button class="btn btn-primary" onclick="submitEndOfDay()" id="btnSubmitEod" disabled><i class="fa-solid fa-floppy-disk"></i> Valider</button>
          </div>
        </div>
        <div style="margin-top:14px;">
          <input type="text" class="form-control" id="eodSearch" placeholder="🔍 Rechercher un produit..." oninput="eodFilter(this.value)" style="max-width:320px;">
        </div>
      </div>
      <div id="eodSections">${categorySections}</div>
      <div id="eodDishSection"></div>
      <div id="eodSummaryModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:200;align-items:center;justify-content:center;padding:16px;">
        <div style="background:#fff;border-radius:16px;padding:28px;width:100%;max-width:480px;max-height:80vh;overflow-y:auto;">
          <h3 style="margin-bottom:16px;font-size:17px;">✅ Confirmer les sorties</h3>
          <div id="eodSummaryList"></div>
          <div style="display:flex;gap:12px;margin-top:20px;">
            <button class="btn btn-outline" style="flex:1;" onclick="document.getElementById('eodSummaryModal').style.display='none'">Modifier</button>
            <button class="btn btn-primary" style="flex:1;" onclick="confirmEndOfDay()"><i class="fa-solid fa-check"></i> Confirmer</button>
          </div>
        </div>
      </div>
    `);

    // Load dishes section
    try {
      const dishes = await api.get('/dishes');
      if (dishes.length > 0) {
        const dishSection = document.getElementById('eodDishSection');
        if (dishSection) {
          dishSection.innerHTML = `
            <div class="card" style="margin-top:12px;">
              <h3 style="font-size:14px;font-weight:700;margin-bottom:12px;">
                <i class="fa-solid fa-utensils" style="color:var(--color-accent);margin-right:8px;"></i>Plats vendus aujourd'hui
              </h3>
              <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;">
                ${dishes.map(d => `
                  <div style="border:1px solid var(--color-border);border-radius:10px;padding:14px;">
                    <div style="font-weight:700;font-size:13px;margin-bottom:4px;">${d.name}</div>
                    <div style="font-size:12px;color:var(--color-text-muted);margin-bottom:10px;">${new Intl.NumberFormat('fr-FR').format(d.selling_price)} FCFA</div>
                    <div style="display:flex;align-items:center;gap:8px;">
                      <button class="eod-btn-minus" onclick="const inp=this.nextElementSibling;inp.value=Math.max(0,parseInt(inp.value||0)-1);">−</button>
                      <input type="number" class="eod-dish-input" data-dish-id="${d.id}" data-dish-name="${d.name}" value="0" min="0" style="width:60px;text-align:center;border:1px solid var(--color-border);border-radius:6px;padding:4px;font-size:16px;font-weight:700;">
                      <button class="eod-btn-plus" onclick="const inp=this.previousElementSibling;inp.value=parseInt(inp.value||0)+1;">+</button>
                    </div>
                  </div>`).join('')}
              </div>
            </div>`;
        }
      }
    } catch(e) {}

  } catch(e) {
    setContent(`<div class="card"><p style="color:var(--color-danger);">Erreur: ${e.message}</p></div>`);
  }
}

function eodAdjust(productId, delta) {
  const input = document.getElementById(`eod-qty-${productId}`);
  const maxStock = parseFloat(input.dataset.stock || 0);
  const current = parseFloat(input.value) || 0;
  input.value = Math.max(0, Math.min(current + delta, maxStock));
  eodOnChange(productId);
}

function eodOnChange(productId) {
  const input = document.getElementById(`eod-qty-${productId}`);
  const qty = parseFloat(input.value) || 0;
  const card = document.getElementById(`eod-card-${productId}`);
  if (qty > 0) card.classList.add('eod-card-active');
  else card.classList.remove('eod-card-active');
  const active = document.querySelectorAll('.eod-qty-input');
  let count = 0;
  active.forEach(i => { if (parseFloat(i.value) > 0) count++; });
  const counter = document.getElementById('eodCounter');
  const btn = document.getElementById('btnSubmitEod');
  if (counter) counter.textContent = `${count} produit${count>1?'s':''} modifié${count>1?'s':''}`;
  if (btn) btn.disabled = count === 0;
}

function eodToggleNote(productId) {
  const noteInput = document.getElementById(`eod-notes-${productId}`);
  const btn = noteInput.previousElementSibling;
  if (noteInput.style.display === 'none') {
    noteInput.style.display = 'block';
    noteInput.focus();
    btn.innerHTML = '<i class="fa-solid fa-xmark"></i> Supprimer la note';
  } else {
    noteInput.style.display = 'none';
    noteInput.value = '';
    btn.innerHTML = '<i class="fa-solid fa-note-sticky"></i> Ajouter une note';
  }
}

function eodFilter(query) {
  const q = query.toLowerCase().trim();
  document.querySelectorAll('.eod-card').forEach(card => {
    const name = card.dataset.name || '';
    const cat = card.dataset.category || '';
    card.style.display = (!q || name.includes(q) || cat.includes(q)) ? '' : 'none';
  });
  document.querySelectorAll('.eod-category').forEach(section => {
    const visible = [...section.querySelectorAll('.eod-card')].some(c => c.style.display !== 'none');
    section.style.display = visible ? '' : 'none';
  });
}

function submitEndOfDay() {
  const inputs = document.querySelectorAll('.eod-qty-input');
  const items = [];
  inputs.forEach(input => {
    const qty = parseFloat(input.value);
    if (!qty || qty <= 0) return;
    const productId = parseInt(input.dataset.productId);
    const unit = input.dataset.unit;
    const name = input.closest('.eod-card').querySelector('.eod-product-name').textContent;
    const notes = document.getElementById(`eod-notes-${productId}`)?.value?.trim() || null;
    items.push({ product_id: productId, quantity: qty, unit, name, notes });
  });

  // Collect dish sales
  const dishInputs = document.querySelectorAll('.eod-dish-input');
  const dishSales = [];
  dishInputs.forEach(input => {
    const qty = parseInt(input.value);
    if (qty > 0) dishSales.push({ dish_id: parseInt(input.dataset.dishId), quantity_sold: qty, dish_name: input.dataset.dishName });
  });
  window._eodDishSales = dishSales;

  if (items.length === 0 && dishSales.length === 0) { showToast('Aucune sortie saisie.', 'error'); return; }

  const summaryHtml = items.map(i => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f3f4f6;">
      <span style="font-weight:600;">${i.name}</span>
      <span style="color:var(--color-info);">−${i.quantity} ${i.unit}</span>
    </div>
    ${i.notes ? `<div style="font-size:12px;color:var(--color-text-muted);padding:4px 0 8px;">📝 ${i.notes}</div>` : ''}`).join('')
    + (dishSales.length > 0 ? `<hr style="margin:12px 0;"><p style="font-weight:700;margin-bottom:8px;">🍽️ Plats vendus</p>` + dishSales.map(ds => `
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f3f4f6;">
      <span>${ds.dish_name}</span>
      <span style="color:var(--color-accent);">${ds.quantity_sold} vendu(s)</span>
    </div>`).join('') : '');

  document.getElementById('eodSummaryList').innerHTML = summaryHtml;
  document.getElementById('eodSummaryModal').style.display = 'flex';
  window._eodItems = items;
}

async function confirmEndOfDay() {
  const items = window._eodItems || [];
  const dishSales = window._eodDishSales || [];

  for (const item of items) {
    const input = document.querySelector(`.eod-qty-input[data-product-id="${item.product_id}"]`);
    const maxStock = parseFloat(input?.dataset.stock || 0);
    if (item.quantity > maxStock) {
      showToast(`❌ ${item.name}: stock disponible: ${maxStock} ${item.unit}`, 'error');
      document.getElementById('eodSummaryModal').style.display = 'none';
      return;
    }
  }

  document.getElementById('eodSummaryModal').style.display = 'none';
  try {
    if (items.length > 0) {
      await api.post('/exits', { items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity, notes: i.notes })) });
    }
    if (dishSales.length > 0) {
      await api.post('/dishes/sales', { sales: dishSales.map(d => ({ dish_id: d.dish_id, quantity_sold: d.quantity_sold })) });
    }
    showToast(`Fin de journée enregistrée ✅`);
    navigateTo('dashboard');
  } catch(e) {
    showToast('Erreur: ' + e.message, 'error');
  }
}

// ============================================================
//  PAGE: JOURNAL DES PERTES
// ============================================================
async function renderLosses() {
  try {
    const [products, losses] = await Promise.all([api.get('/products'), api.get('/losses')]);
    const productOptions = products.map(p => `<option value="${p.id}" data-unit="${p.unit}">${p.name} (${p.unit})</option>`).join('');
    const lossRows = losses.length === 0
      ? `<tr><td colspan="5" style="text-align:center;color:var(--color-text-muted);padding:24px;">Aucune perte enregistrée.</td></tr>`
      : losses.map(l => `<tr><td>${formatDate(l.date)}</td><td><strong>${l.product_name}</strong></td><td>${l.quantity} ${l.unit}</td><td>${l.reason}</td><td>${l.manager_name}</td></tr>`).join('');

    setContent(`
      <div class="card"><h2><i class="fa-solid fa-triangle-exclamation" style="color:var(--color-danger);margin-right:8px;"></i>Signaler une perte</h2><p style="margin-top:4px;">Enregistrez ici tout article cassé, périmé ou manquant.</p></div>
      <div class="card">
        <div class="form-row">
          <div class="form-group"><label>Produit</label><select class="form-control" id="lossProduct" onchange="updateLossUnit(this)"><option value="">-- Sélectionner un produit --</option>${productOptions}</select></div>
          <div class="form-group"><label>Quantité perdue</label><div style="display:flex;align-items:center;gap:8px;"><input type="number" class="form-control" id="lossQty" placeholder="0" min="0" step="0.1" style="flex:1;"><span id="lossUnit" style="font-size:13px;color:var(--color-text-muted);white-space:nowrap;min-width:40px;"></span></div></div>
        </div>
        <div class="form-group"><label>Raison <span style="color:var(--color-danger);">*</span></label><input type="text" class="form-control" id="lossReason" placeholder="ex: Bouteille cassée, produit périmé, vol constaté..."></div>
        <div style="display:flex;gap:12px;justify-content:flex-end;"><button class="btn btn-primary" onclick="submitLoss()"><i class="fa-solid fa-floppy-disk"></i> Enregistrer la perte</button></div>
      </div>
      <div class="card">
        <h2><i class="fa-solid fa-list" style="color:var(--color-text-muted);margin-right:8px;"></i>Historique des pertes</h2><br>
        <div class="table-wrap"><table class="data-table"><thead><tr><th>Date</th><th>Produit</th><th>Quantité</th><th>Raison</th><th>Enregistré par</th></tr></thead><tbody>${lossRows}</tbody></table></div>
      </div>
    `);
  } catch (e) {
    setContent(`<div class="card"><p style="color:var(--color-danger);">Erreur: ${e.message}</p></div>`);
  }
}

function updateLossUnit(select) {
  document.getElementById('lossUnit').textContent = select.options[select.selectedIndex].dataset.unit || '';
}

async function submitLoss() {
  const productId = parseInt(document.getElementById('lossProduct').value);
  const qty = parseFloat(document.getElementById('lossQty').value);
  const reason = document.getElementById('lossReason').value.trim();
  if (!productId) { showToast('Sélectionnez un produit.', 'error'); return; }
  if (!qty || qty <= 0) { showToast('Quantité invalide.', 'error'); return; }
  if (!reason) { showToast('La raison est obligatoire.', 'error'); return; }
  try {
    await api.post('/losses', { product_id: productId, quantity: qty, reason });
    showToast('Perte enregistrée.');
    renderLosses();
  } catch (e) {
    showToast(`Erreur: ${e.message}`, 'error');
  }
}

// ============================================================
//  PAGE: HISTORIQUE
// ============================================================
async function renderHistory() {
  if (user.role !== 'admin') {
    setContent(`<div class="card"><div class="empty-state"><i class="fa-solid fa-lock"></i><p>L'historique complet est réservé à l'administrateur.</p></div></div>`);
    return;
  }
  try {
    const [history, sessions, exitSessions] = await Promise.all([
      api.get('/reports/history'),
      api.get('/shopping'),
      api.get('/exits/sessions')
    ]);
    const fmt = n => new Intl.NumberFormat('fr-FR').format(n);

    const sessionsHtml = sessions.length === 0
      ? '<p style="color:var(--color-text-muted);font-size:13px;">Aucune session d\'achat.</p>'
      : sessions.map(s => `
          <div style="border:1px solid var(--color-border);border-radius:10px;margin-bottom:12px;overflow:hidden;">
            <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#f8faf8;cursor:pointer;" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
              <div><strong style="font-size:14px;">Session du ${formatDate(s.date)}</strong><span style="margin-left:12px;font-size:12px;color:var(--color-text-muted);">par ${s.manager_name}</span></div>
              <div style="display:flex;align-items:center;gap:16px;"><span style="font-weight:700;color:var(--color-accent);">${fmt(s.total_cost)} FCFA</span><span style="font-size:12px;color:var(--color-text-muted);">${s.items.length} article${s.items.length>1?'s':''} ▾</span></div>
            </div>
            <div style="display:none;padding:12px 16px;">
              ${s.notes ? `<p style="font-size:12px;color:var(--color-text-muted);margin-bottom:10px;">📝 ${s.notes}</p>` : ''}
              <table class="data-table" style="font-size:13px;"><thead><tr><th>Produit</th><th>Quantité</th><th>Prix unitaire</th><th>Sous-total</th></tr></thead>
              <tbody>${s.items.map(i => `<tr><td>${i.product_name}</td><td>${i.quantity} ${i.unit}</td><td>${fmt(i.unit_price)} FCFA</td><td>${fmt(i.quantity * i.unit_price)} FCFA</td></tr>`).join('')}</tbody></table>
            </div>
          </div>`).join('');

    const exitSessionsHtml = exitSessions.length === 0
      ? '<p style="color:var(--color-text-muted);font-size:13px;">Aucune session de vente.</p>'
      : exitSessions.map(s => `
          <div style="border:1px solid var(--color-border);border-radius:10px;margin-bottom:12px;overflow:hidden;">
            <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#f0f7ff;cursor:pointer;" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
              <div><strong style="font-size:14px;">Ventes du ${formatDate(s.date)}</strong><span style="margin-left:12px;font-size:12px;color:var(--color-text-muted);">par ${s.manager_name}</span></div>
              <div style="display:flex;align-items:center;gap:16px;"><span style="font-weight:700;color:var(--color-info);">${fmt(s.total_value)} FCFA</span><span style="font-size:12px;color:var(--color-text-muted);">${s.item_count} article${s.item_count>1?'s':''} ▾</span></div>
            </div>
            <div style="display:none;padding:12px 16px;">
              <table class="data-table" style="font-size:13px;"><thead><tr><th>Produit</th><th>Quantité</th><th>Prix vente</th><th>Sous-total</th></tr></thead>
              <tbody>${s.items.map(i => `<tr><td>${i.product_name}</td><td>${i.quantity} ${i.unit}</td><td>${fmt(i.selling_price)} FCFA</td><td>${fmt(i.subtotal)} FCFA</td></tr>`).join('')}</tbody></table>
            </div>
          </div>`).join('');

    const losses = history.filter(m => m.type === 'loss');
    const lossesHtml = losses.length === 0
      ? `<tr><td colspan="5" style="text-align:center;color:var(--color-text-muted);padding:24px;">Aucune perte.</td></tr>`
      : losses.map(m => `<tr><td>${formatDate(m.date)}</td><td><strong>${m.product}</strong></td><td>${m.quantity} ${m.unit}</td><td>${m.manager}</td><td style="color:var(--color-text-muted);font-size:12px;">${m.reason || '—'}</td></tr>`).join('');

    setContent(`
      <div class="card"><h2><i class="fa-solid fa-cart-shopping" style="color:var(--color-accent);margin-right:8px;"></i>Sessions d'achat</h2><p style="font-size:13px;color:var(--color-text-muted);margin:6px 0 16px;">Cliquez pour voir le détail.</p>${sessionsHtml}</div>
      <div class="card"><h2><i class="fa-solid fa-clipboard-check" style="color:var(--color-info);margin-right:8px;"></i>Sessions de vente (Fin de journée)</h2><p style="font-size:13px;color:var(--color-text-muted);margin:6px 0 16px;">Cliquez pour voir le détail.</p>${exitSessionsHtml}</div>
      <div class="card"><h2><i class="fa-solid fa-triangle-exclamation" style="color:var(--color-danger);margin-right:8px;"></i>Pertes</h2><div class="table-wrap" style="margin-top:16px;"><table class="data-table"><thead><tr><th>Date</th><th>Produit</th><th>Quantité</th><th>Par</th><th>Raison</th></tr></thead><tbody>${lossesHtml}</tbody></table></div></div>
    `);
  } catch (e) {
    setContent(`<div class="card"><p style="color:var(--color-danger);">Erreur: ${e.message}</p></div>`);
  }
}

// ============================================================
//  PAGE: PRODUITS
// ============================================================
async function renderProducts() {
  try {
    const products = await api.get('/products');
    const rows = products.length === 0
      ? `<tr><td colspan="6" style="text-align:center;color:var(--color-text-muted);padding:24px;">Aucun produit.</td></tr>`
      : products.map(p => {
          const status = p.current_stock <= 0 ? `<span class="badge badge-out">Rupture</span>` : p.current_stock <= p.alert_threshold ? `<span class="badge badge-low">Stock faible</span>` : `<span class="badge badge-ok">OK</span>`;
          return `<tr><td><strong>${p.name}</strong></td><td>${p.category}</td><td>${p.current_stock} ${p.unit}</td><td>${p.alert_threshold} ${p.unit}</td><td>${status}</td><td>${user.role === 'admin' ? `<button class="btn btn-outline btn-sm" onclick="openEditProduct(${p.id}, '${p.name}', '${p.category}', '${p.unit}', ${p.alert_threshold}, ${p.selling_price})"><i class="fa-solid fa-pen"></i></button><button class="btn btn-danger btn-sm" onclick="deleteProduct(${p.id}, '${p.name}')"><i class="fa-solid fa-trash"></i></button>` : ''}</td></tr>`;
        }).join('');

    const addFormHtml = user.role === 'admin' ? `
      <div class="card">
        <h2><i class="fa-solid fa-plus" style="color:var(--color-accent);margin-right:8px;"></i>Ajouter un produit</h2><br>
        <div class="form-row">
          <div class="form-group"><label>Nom du produit</label><input type="text" class="form-control" id="newProductName" placeholder="ex: Coca-Cola 33cl"></div>
          <div class="form-group"><label>Catégorie</label><select class="form-control" id="newProductCategory"><option>Boissons</option><option>Alcools</option><option>Nourriture</option><option>Condiments</option><option>Autre</option></select></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Unité</label><select class="form-control" id="newProductUnit"><option>bouteille</option><option>canette</option><option>litre</option><option>kg</option><option>caisse</option><option>unité</option></select></div>
          <div class="form-group"><label>Seuil d'alerte</label><input type="number" class="form-control" id="newProductThreshold" value="5" min="1"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Prix de vente (FCFA)</label><input type="number" class="form-control" id="newProductPrice" placeholder="ex: 500" min="0"></div>
          <div></div>
        </div>
        <div style="display:flex;justify-content:flex-end;"><button class="btn btn-primary" onclick="submitNewProduct()"><i class="fa-solid fa-plus"></i> Ajouter</button></div>
      </div>` : '';

    setContent(`
      <div class="card">
        <h2><i class="fa-solid fa-box" style="color:var(--color-accent);margin-right:8px;"></i>Catalogue des produits</h2>
        <div class="table-wrap" style="margin-top:16px;"><table class="data-table"><thead><tr><th>Nom</th><th>Catégorie</th><th>Stock actuel</th><th>Seuil alerte</th><th>Statut</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
      </div>
      ${addFormHtml}
      <div id="editModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:200;align-items:center;justify-content:center;">
        <div style="background:#fff;border-radius:16px;padding:28px;width:100%;max-width:420px;margin:16px;">
          <h3 style="margin-bottom:16px;">Modifier le produit</h3>
          <input type="hidden" id="editProductId">
          <div class="form-group"><label>Nom</label><input type="text" class="form-control" id="editProductName"></div>
          <div class="form-group"><label>Catégorie</label><select class="form-control" id="editProductCategory"><option>Boissons</option><option>Alcools</option><option>Nourriture</option><option>Condiments</option><option>Autre</option></select></div>
          <div class="form-row">
            <div class="form-group"><label>Unité</label><select class="form-control" id="editProductUnit"><option>bouteille</option><option>canette</option><option>litre</option><option>kg</option><option>caisse</option><option>unité</option></select></div>
            <div class="form-group"><label>Seuil alerte</label><input type="number" class="form-control" id="editProductThreshold" min="1"></div>
          </div>
          <div class="form-group"><label>Prix de vente (FCFA)</label><input type="number" class="form-control" id="editProductPrice" min="0"></div>
          <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:8px;">
            <button class="btn btn-outline" onclick="closeEditModal()">Annuler</button>
            <button class="btn btn-primary" onclick="submitEditProduct()">Enregistrer</button>
          </div>
        </div>
      </div>
    `);
  } catch (e) {
    setContent(`<div class="card"><p style="color:var(--color-danger);">Erreur: ${e.message}</p></div>`);
  }
}

function openEditProduct(id, name, category, unit, threshold, price) {
  document.getElementById('editProductId').value = id;
  document.getElementById('editProductName').value = name;
  document.getElementById('editProductCategory').value = category;
  document.getElementById('editProductUnit').value = unit;
  document.getElementById('editProductThreshold').value = threshold;
  document.getElementById('editProductPrice').value = price || 0;
  document.getElementById('editModal').style.display = 'flex';
}
function closeEditModal() { document.getElementById('editModal').style.display = 'none'; }
async function submitEditProduct() {
  const id = document.getElementById('editProductId').value;
  const body = { name: document.getElementById('editProductName').value, category: document.getElementById('editProductCategory').value, unit: document.getElementById('editProductUnit').value, alert_threshold: parseInt(document.getElementById('editProductThreshold').value), selling_price: parseFloat(document.getElementById('editProductPrice').value) || 0 };
  try { await api.put(`/products/${id}`, body); showToast('Produit mis à jour.'); closeEditModal(); renderProducts(); } catch (e) { showToast(`Erreur: ${e.message}`, 'error'); }
}
async function submitNewProduct() {
  const body = { name: document.getElementById('newProductName').value.trim(), category: document.getElementById('newProductCategory').value, unit: document.getElementById('newProductUnit').value, alert_threshold: parseInt(document.getElementById('newProductThreshold').value), selling_price: parseFloat(document.getElementById('newProductPrice')?.value) || 0 };
  if (!body.name) { showToast('Le nom est obligatoire.', 'error'); return; }
  try { await api.post('/products', body); showToast('Produit ajouté !'); renderProducts(); } catch (e) { showToast(`Erreur: ${e.message}`, 'error'); }
}
async function deleteProduct(productId, productName) {
  if (!confirm(`Supprimer "${productName}" ?`)) return;
  try { await api.delete(`/products/${productId}`); showToast('Produit supprimé !'); renderProducts(); } catch (e) { showToast(`Erreur: ${e.message}`, 'error'); }
}

// ============================================================
//  PAGE: RAPPORTS
// ============================================================
async function renderReports() {
  window.currentUserId = user.id;
  if (user.role !== 'admin') {
    setContent(`<div class="card"><div class="empty-state"><i class="fa-solid fa-lock"></i><p>Accès réservé à l'administrateur.</p></div></div>`);
    return;
  }
  try {
    const [stats, users] = await Promise.all([api.get('/reports/dashboard'), api.get('/reports/users')]);
    const userRows = users.map(u => `
      <tr>
        <td><strong>${u.name}</strong></td><td>${u.username}</td>
        <td><span class="badge ${u.role === 'admin' ? 'badge-admin' : 'badge-manager'}">${u.role === 'admin' ? 'Admin' : 'Gérant'}</span></td>
        <td>${formatDate(u.created_at)}</td>
        <td>${u.id !== window.currentUserId ? `<button class="btn btn-danger btn-sm" onclick="deleteUser(${u.id}, '${u.name}')"><i class="fa-solid fa-trash"></i></button>` : '<span style="font-size:12px;color:var(--color-text-muted);">Vous</span>'}</td>
      </tr>`).join('');

    setContent(`
      <div style="display:flex;justify-content:flex-end;margin-bottom:16px;"><button class="btn btn-outline" onclick="exportPDF()"><i class="fa-solid fa-file-pdf" style="color:var(--color-danger);"></i> Exporter rapport PDF</button></div>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon green"><i class="fa-solid fa-box"></i></div><div class="stat-info"><span class="stat-value">${stats.total_products}</span><span class="stat-label">Produits total</span></div></div>
        <div class="stat-card"><div class="stat-icon yellow"><i class="fa-solid fa-triangle-exclamation"></i></div><div class="stat-info"><span class="stat-value">${stats.low_stock_count}</span><span class="stat-label">Stocks faibles</span></div></div>
        <div class="stat-card"><div class="stat-icon red"><i class="fa-solid fa-ban"></i></div><div class="stat-info"><span class="stat-value">${stats.out_of_stock_count}</span><span class="stat-label">Ruptures</span></div></div>
        <div class="stat-card"><div class="stat-icon blue"><i class="fa-solid fa-cart-shopping"></i></div><div class="stat-info"><span class="stat-value">${stats.shopping_sessions_this_month}</span><span class="stat-label">Achats ce mois</span></div></div>
      </div>
      <div class="card">
        <h2><i class="fa-solid fa-users" style="color:var(--color-info);margin-right:8px;"></i>Gestion des utilisateurs</h2>
        <div class="table-wrap" style="margin-top:16px;"><table class="data-table"><thead><tr><th>Nom</th><th>Identifiant</th><th>Rôle</th><th>Créé le</th><th></th></tr></thead><tbody>${userRows}</tbody></table></div>
      </div>
      <div class="card">
        <h2><i class="fa-solid fa-user-plus" style="color:var(--color-accent);margin-right:8px;"></i>Créer un utilisateur</h2><br>
        <div class="form-row">
          <div class="form-group"><label>Nom complet</label><input type="text" class="form-control" id="newUserName" placeholder="ex: Moussa Diallo"></div>
          <div class="form-group"><label>Identifiant</label><input type="text" class="form-control" id="newUserUsername" placeholder="ex: moussa"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Mot de passe</label><input type="password" class="form-control" id="newUserPassword" placeholder="••••••••"></div>
          <div class="form-group"><label>Rôle</label><select class="form-control" id="newUserRole"><option value="manager">Gérant</option><option value="admin">Administrateur</option></select></div>
        </div>
        <div style="display:flex;justify-content:flex-end;"><button class="btn btn-primary" onclick="submitNewUser()"><i class="fa-solid fa-user-plus"></i> Créer</button></div>
      </div>
    `);
  } catch (e) {
    setContent(`<div class="card"><p style="color:var(--color-danger);">Erreur: ${e.message}</p></div>`);
  }
}

async function submitNewUser() {
  const body = { name: document.getElementById('newUserName').value.trim(), username: document.getElementById('newUserUsername').value.trim(), password: document.getElementById('newUserPassword').value, role: document.getElementById('newUserRole').value };
  if (!body.name || !body.username || !body.password) { showToast('Tous les champs sont obligatoires.', 'error'); return; }
  try { await api.post('/reports/users', body); showToast('Utilisateur créé !'); renderReports(); } catch (e) { showToast(`Erreur: ${e.message}`, 'error'); }
}

async function deleteUser(userId, userName) {
  if (!confirm(`Supprimer le compte de "${userName}" ?`)) return;
  try { await api.delete(`/reports/users/${userId}`); showToast(`Compte supprimé.`); renderReports(); } catch(e) { showToast('Erreur: ' + e.message, 'error'); }
}

// ============================================================
//  UTILS
// ============================================================
function formatDate(isoStr) {
  if (!isoStr) return '—';
  return new Date(isoStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ============================================================
//  INIT
// ============================================================
navigateTo('dashboard');

// ============================================================
//  PAGE: ANALYTICS
// ============================================================
async function renderAnalytics() {
  if (user.role !== 'admin') { setContent(`<div class="card"><div class="empty-state"><i class="fa-solid fa-lock"></i><p>Accès réservé à l'administrateur.</p></div></div>`); return; }
  setContent(`<div class="loading-state"><i class="fa-solid fa-spinner fa-spin"></i> Chargement des données financières...</div>`);
  try {
    const data = await api.get('/analytics/full');
    const { summary, daily, weekly, monthly, top_products, loss_by_product, category_breakdown } = data;
    const fmt = n => new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
    const marginColor = summary.total_margin >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
    setContent(`
      <p class="section-title">Vue financière globale</p>
      <div class="stats-grid" style="grid-template-columns:repeat(5,1fr);">
        <div class="stat-card"><div class="stat-icon red"><i class="fa-solid fa-cart-shopping"></i></div><div class="stat-info"><span class="stat-value" style="font-size:15px;">${fmt(summary.total_purchase_cost)}</span><span class="stat-label">Coût d'achat total</span></div></div>
        <div class="stat-card"><div class="stat-icon blue"><i class="fa-solid fa-chart-line"></i></div><div class="stat-info"><span class="stat-value" style="font-size:15px;">${fmt(summary.total_theoretical_gain)}</span><span class="stat-label">Gain théorique</span></div></div>
        <div class="stat-card"><div class="stat-icon yellow"><i class="fa-solid fa-triangle-exclamation"></i></div><div class="stat-info"><span class="stat-value" style="font-size:15px;">${fmt(summary.total_loss_value)}</span><span class="stat-label">Valeur des pertes</span></div></div>
        <div class="stat-card"><div class="stat-icon green"><i class="fa-solid fa-money-bill-wave"></i></div><div class="stat-info"><span class="stat-value" style="font-size:15px;">${fmt(summary.total_real_gain)}</span><span class="stat-label">Gain réel</span></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:#f0fdf4;color:${marginColor}"><i class="fa-solid fa-scale-balanced"></i></div><div class="stat-info"><span class="stat-value" style="font-size:15px;color:${marginColor}">${fmt(summary.total_margin)}</span><span class="stat-label">Marge nette</span></div></div>
      </div>
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
          <h2><i class="fa-solid fa-chart-area" style="color:var(--color-info);margin-right:8px;"></i>Évolution financière</h2>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-outline btn-sm" id="btnDay" onclick="switchPeriod('day')">Jour</button>
            <button class="btn btn-primary btn-sm" id="btnWeek" onclick="switchPeriod('week')">Semaine</button>
            <button class="btn btn-outline btn-sm" id="btnMonth" onclick="switchPeriod('month')">Mois</button>
          </div>
        </div>
        <canvas id="lineChart" height="100"></canvas>
      </div>
      <div class="dashboard-grid">
        <div class="card"><h2><i class="fa-solid fa-trophy" style="color:#d97706;margin-right:8px;"></i>Top 5 produits (revenus)</h2><br>
          ${top_products.length === 0 ? '<p style="color:var(--color-text-muted);font-size:13px;">Aucune donnée de vente.</p>' : `<table class="data-table"><thead><tr><th>Produit</th><th>Vendu</th><th>Revenu</th></tr></thead><tbody>${top_products.map(p => `<tr><td><strong>${p.name}</strong></td><td>${p.total_sold} ${p.unit}</td><td style="color:var(--color-accent);font-weight:600;">${fmt(p.revenue)}</td></tr>`).join('')}</tbody></table>`}
        </div>
        <div class="card"><h2><i class="fa-solid fa-triangle-exclamation" style="color:var(--color-danger);margin-right:8px;"></i>Top 5 pertes (valeur)</h2><br>
          ${loss_by_product.length === 0 ? '<p style="color:var(--color-text-muted);font-size:13px;">Aucune perte enregistrée.</p>' : `<table class="data-table"><thead><tr><th>Produit</th><th>Perdu</th><th>Valeur</th></tr></thead><tbody>${loss_by_product.map(p => `<tr><td><strong>${p.name}</strong></td><td>${p.total_lost} ${p.unit}</td><td style="color:var(--color-danger);font-weight:600;">${fmt(p.loss_value)}</td></tr>`).join('')}</tbody></table>`}
        </div>
      </div>
      <div class="card"><h2><i class="fa-solid fa-chart-bar" style="color:var(--color-accent);margin-right:8px;"></i>Revenus par catégorie</h2><br><canvas id="barChart" height="80"></canvas></div>
      <div class="dashboard-grid">
        <div class="card"><h2><i class="fa-solid fa-circle-half-stroke" style="color:var(--color-info);margin-right:8px;"></i>Répartition financière</h2><br><canvas id="doughnutChart" height="200"></canvas></div>
        <div class="card"><h2><i class="fa-solid fa-table" style="color:var(--color-text-muted);margin-right:8px;"></i>Résumé par période</h2><br>
          <table class="data-table"><thead><tr><th>Période</th><th>Coût</th><th>Gain réel</th><th>Marge</th></tr></thead><tbody>${buildPeriodSummaryRows(daily, weekly, monthly, fmt)}</tbody></table>
        </div>
      </div>
    `);
    window._analyticsData = { daily, weekly, monthly, category_breakdown, summary };
    loadChartJs(() => { drawLineChart(weekly); drawBarChart(category_breakdown); drawDoughnutChart(summary); });
  } catch (e) {
    setContent(`<div class="card"><p style="color:var(--color-danger);">Erreur: ${e.message}</p></div>`);
  }
}

function buildPeriodSummaryRows(daily, weekly, monthly, fmt) {
  const sum = arr => arr.reduce((a, b) => ({ purchase_cost: (a.purchase_cost||0)+(b.purchase_cost||0), real_gain: (a.real_gain||0)+(b.real_gain||0), margin: (a.margin||0)+(b.margin||0) }), {});
  const row = (label, data) => `<tr><td>${label}</td><td>${fmt(data.purchase_cost||0)}</td><td style="color:var(--color-accent)">${fmt(data.real_gain||0)}</td><td style="color:${(data.margin||0)>=0?'var(--color-success)':'var(--color-danger)'};font-weight:600;">${fmt(data.margin||0)}</td></tr>`;
  return row("Aujourd'hui", sum(daily.slice(-1))) + row("7 derniers jours", sum(weekly)) + row("30 derniers jours", sum(monthly));
}

function loadChartJs(callback) {
  if (window.Chart) { callback(); return; }
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';
  script.onload = callback;
  document.head.appendChild(script);
}

function switchPeriod(period) {
  window._currentPeriod = period;
  const data = window._analyticsData;
  if (!data) return;
  ['day','week','month'].forEach(p => {
    const btn = document.getElementById(`btn${p.charAt(0).toUpperCase()+p.slice(1)}`);
    if (btn) btn.className = p === period ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm';
  });
  drawLineChart(period === 'day' ? data.daily : period === 'week' ? data.weekly : data.monthly);
}

function drawLineChart(periodData) {
  const canvas = document.getElementById('lineChart');
  if (!canvas) return;
  if (canvas._chart) canvas._chart.destroy();
  canvas._chart = new Chart(canvas, {
    type: 'line',
    data: { labels: periodData.map(d => d.date), datasets: [
      { label: "Coût d'achat", data: periodData.map(d => d.purchase_cost), borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)', tension: 0.4, fill: true, pointRadius: 4 },
      { label: 'Gain théorique', data: periodData.map(d => d.theoretical_gain), borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.08)', tension: 0.4, fill: true, pointRadius: 4 },
      { label: 'Gain réel', data: periodData.map(d => d.real_gain), borderColor: '#39812F', backgroundColor: 'rgba(57,129,47,0.08)', tension: 0.4, fill: true, pointRadius: 4 },
      { label: 'Marge', data: periodData.map(d => d.margin), borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.08)', tension: 0.4, fill: false, pointRadius: 4, borderDash: [5,5] }
    ]},
    options: { responsive: true, plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${new Intl.NumberFormat('fr-FR').format(ctx.parsed.y)} FCFA` } } }, scales: { y: { ticks: { callback: v => new Intl.NumberFormat('fr-FR', {notation:'compact'}).format(v) + ' F' } } } }
  });
}

function drawBarChart(categories) {
  const canvas = document.getElementById('barChart');
  if (!canvas || !categories.length) return;
  if (canvas._chart) canvas._chart.destroy();
  const colors = ['#39812F','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#06b6d4'];
  canvas._chart = new Chart(canvas, {
    type: 'bar',
    data: { labels: categories.map(c => c.category), datasets: [{ label: 'Revenu par catégorie (FCFA)', data: categories.map(c => c.revenue), backgroundColor: categories.map((_, i) => colors[i % colors.length]), borderRadius: 6 }] },
    options: { responsive: true, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${new Intl.NumberFormat('fr-FR').format(ctx.parsed.y)} FCFA` } } }, scales: { y: { ticks: { callback: v => new Intl.NumberFormat('fr-FR', {notation:'compact'}).format(v) + ' F' } } } }
  });
}

function drawDoughnutChart(summary) {
  const canvas = document.getElementById('doughnutChart');
  if (!canvas) return;
  if (canvas._chart) canvas._chart.destroy();
  canvas._chart = new Chart(canvas, {
    type: 'doughnut',
    data: { labels: ["Coût d'achat", 'Gain réel', 'Pertes'], datasets: [{ data: [summary.total_purchase_cost, Math.max(0, summary.total_real_gain), summary.total_loss_value], backgroundColor: ['#ef4444', '#39812F', '#f59e0b'], borderWidth: 2, borderColor: '#fff' }] },
    options: { responsive: true, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: ctx => `${ctx.label}: ${new Intl.NumberFormat('fr-FR').format(ctx.parsed)} FCFA` } } } }
  });
}

// ============================================================
//  PAGE: INTELLIGENCE IA
// ============================================================
async function renderIntelligence() {
  if (user.role !== 'admin') { setContent(`<div class="card"><div class="empty-state"><i class="fa-solid fa-lock"></i><p>Accès réservé à l'administrateur.</p></div></div>`); return; }
  setContent(`<div class="loading-state"><i class="fa-solid fa-spinner fa-spin"></i> Analyse en cours...</div>`);
  try {
    const [anomalies, profitability, predictions, heatmap] = await Promise.all([
      api.get('/intelligence/anomalies'), api.get('/intelligence/profitability'),
      api.get('/intelligence/predictions'), api.get('/intelligence/heatmap'),
    ]);
    const fmt = n => new Intl.NumberFormat('fr-FR').format(n) + ' F';
    const anomalyRows = anomalies.length === 0
      ? `<tr><td colspan="6" style="text-align:center;color:var(--color-text-muted);padding:20px;">✅ Aucune anomalie détectée.</td></tr>`
      : anomalies.slice(0,10).map(a => `<tr><td>${formatDate(a.date)}</td><td><strong>${a.product_name}</strong></td><td style="color:var(--color-danger);font-weight:700;">${a.quantity} ${a.unit}</td><td style="color:var(--color-text-muted);">moy: ${a.average_quantity} ${a.unit}</td><td><span class="badge ${a.severity==='high'?'badge-out':'badge-low'}">${a.ratio}× la moyenne</span></td><td>${a.manager_name}</td></tr>`).join('');
    const gradeColor = g => g==='A'?'var(--color-success)':g==='B'?'var(--color-info)':g==='C'?'var(--color-warning)':'var(--color-danger)';
    const profitRows = profitability.slice(0,10).map(p => `<tr><td><div style="display:flex;align-items:center;gap:10px;"><span style="width:28px;height:28px;border-radius:50%;background:${gradeColor(p.grade)};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0;">${p.grade}</span><strong>${p.name}</strong></div></td><td>${p.category}</td><td>${fmt(p.revenue)}</td><td style="color:${p.margin_pct>=0?'var(--color-success)':'var(--color-danger)'};font-weight:600;">${p.margin_pct}%</td><td><div style="background:#f3f4f6;border-radius:99px;height:8px;width:100%;overflow:hidden;"><div style="background:${gradeColor(p.grade)};height:100%;width:${p.score}%;border-radius:99px;"></div></div><span style="font-size:11px;color:var(--color-text-muted);">${p.score}/100</span></td><td>${fmt(p.loss_value)}</td></tr>`).join('');
    const predRows = predictions.filter(p => p.days_until_empty !== null).slice(0,8).map(p => { const color = p.urgency==='critical'?'var(--color-danger)':p.urgency==='warning'?'var(--color-warning)':'var(--color-success)'; const icon = p.urgency==='critical'?'fa-circle-xmark':p.urgency==='warning'?'fa-triangle-exclamation':'fa-circle-check'; return `<tr><td><strong>${p.name}</strong></td><td>${p.current_stock} ${p.unit}</td><td style="color:${color};font-weight:700;"><i class="fa-solid ${icon}" style="margin-right:6px;"></i>${p.days_until_empty} jours</td><td>${p.avg_daily_consumption.toFixed(2)} ${p.unit}/jour</td></tr>`; }).join('');
    const maxVal = Math.max(...heatmap.heatmap.map(d => d.total_value), 1);
    const heatmapCells = heatmap.heatmap.map(d => { const intensity = d.total_value / maxVal; const bg = intensity > 0.7 ? '#173C11' : intensity > 0.4 ? '#39812F' : intensity > 0.1 ? '#a8d5a0' : '#f4f5f7'; const textColor = intensity > 0.4 ? '#fff' : '#1a1d23'; return `<div style="background:${bg};color:${textColor};border-radius:8px;padding:12px 8px;text-align:center;"><div style="font-weight:700;font-size:13px;">${d.day}</div><div style="font-size:11px;margin-top:4px;opacity:0.85;">${d.total_value > 0 ? fmt(d.avg_daily_value)+'/j' : '—'}</div></div>`; }).join('');

    setContent(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <div><h1 style="font-size:20px;font-weight:700;">Intelligence IA</h1><p style="font-size:13px;color:var(--color-text-muted);margin-top:2px;">Analyse automatique de votre business</p></div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-outline" onclick="navigateTo('monthly')"><i class="fa-solid fa-calendar-days"></i> Comparer les mois</button>
          <button class="btn btn-primary" onclick="openAIAdvisor()"><i class="fa-solid fa-brain"></i> Conseil IA</button>
        </div>
      </div>
      <div class="card" style="border-left:4px solid var(--color-danger);">
        <h2 style="display:flex;align-items:center;gap:10px;"><i class="fa-solid fa-shield-halved" style="color:var(--color-danger);"></i>Détection d'anomalies ${anomalies.length > 0 ? `<span class="badge badge-out">${anomalies.length} suspecte${anomalies.length>1?'s':''}</span>` : '<span class="badge badge-ok">Aucune</span>'}</h2>
        <p style="font-size:13px;color:var(--color-text-muted);margin:6px 0 16px;">Sorties anormalement élevées — indicateur de vol potentiel.</p>
        <div class="table-wrap"><table class="data-table"><thead><tr><th>Date</th><th>Produit</th><th>Quantité sortie</th><th>Référence</th><th>Anomalie</th><th>Responsable</th></tr></thead><tbody>${anomalyRows}</tbody></table></div>
      </div>
      <div class="card">
        <h2><i class="fa-solid fa-ranking-star" style="color:#d97706;margin-right:8px;"></i>Score de rentabilité</h2>
        <div class="table-wrap"><table class="data-table"><thead><tr><th>Produit</th><th>Catégorie</th><th>Revenu</th><th>Marge</th><th>Score</th><th>Pertes</th></tr></thead><tbody>${profitRows}</tbody></table></div>
      </div>
      <div class="dashboard-grid">
        <div class="card"><h2><i class="fa-solid fa-clock" style="color:var(--color-info);margin-right:8px;"></i>Prédictions de rupture</h2><p style="font-size:13px;color:var(--color-text-muted);margin:6px 0 16px;">Basé sur les 14 derniers jours.</p><table class="data-table"><thead><tr><th>Produit</th><th>Stock</th><th>Jours restants</th><th>Consommation</th></tr></thead><tbody>${predRows || `<tr><td colspan="4" style="text-align:center;color:var(--color-text-muted);padding:20px;">Pas encore assez de données.</td></tr>`}</tbody></table></div>
        <div class="card"><h2><i class="fa-solid fa-fire" style="color:var(--color-warning);margin-right:8px;"></i>Heatmap de consommation</h2><p style="font-size:13px;color:var(--color-text-muted);margin:6px 0 16px;">Meilleur jour: <strong>${heatmap.best_day}</strong> · Pire jour: <strong>${heatmap.worst_day}</strong></p><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;">${heatmapCells}</div></div>
      </div>
      <div id="aiModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:200;align-items:center;justify-content:center;padding:16px;">
        <div style="background:#fff;border-radius:16px;padding:28px;width:100%;max-width:620px;max-height:85vh;overflow-y:auto;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;"><h3 style="font-size:18px;font-weight:700;display:flex;align-items:center;gap:10px;"><i class="fa-solid fa-brain" style="color:var(--color-accent);"></i> Agent Conseiller IA</h3><button onclick="document.getElementById('aiModal').style.display='none'" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--color-text-muted);">✕</button></div>
          <div class="form-group"><label>Question ou contexte supplémentaire (optionnel)</label><input type="text" class="form-control" id="aiContext" placeholder="ex: On a eu un grand événement ce week-end..."></div>
          <button class="btn btn-primary" style="width:100%;" id="btnGetAdvice" onclick="getAIAdvice()"><i class="fa-solid fa-wand-magic-sparkles"></i> Analyser et donner des conseils</button>
          <div id="aiAdviceResult" style="margin-top:20px;display:none;"><div style="background:#f8faf8;border:1px solid var(--color-border);border-radius:10px;padding:20px;font-size:14px;line-height:1.8;white-space:pre-wrap;" id="aiAdviceText"></div></div>
        </div>
      </div>
    `);
  } catch(e) {
    setContent(`<div class="card"><p style="color:var(--color-danger);">Erreur: ${e.message}</p></div>`);
  }
}

function openAIAdvisor() { document.getElementById('aiModal').style.display = 'flex'; document.getElementById('aiAdviceResult').style.display = 'none'; }

async function getAIAdvice() {
  const context = document.getElementById('aiContext').value.trim();
  const btn = document.getElementById('btnGetAdvice');
  const resultDiv = document.getElementById('aiAdviceResult');
  const textDiv = document.getElementById('aiAdviceText');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analyse en cours (10-20 sec)...';
  try {
    const data = await api.post('/intelligence/ai-advisor', { context });
    textDiv.textContent = data.advice;
    resultDiv.style.display = 'block';
  } catch(e) { textDiv.textContent = 'Erreur: ' + e.message; resultDiv.style.display = 'block'; }
  finally { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Analyser et donner des conseils'; }
}

// ============================================================
//  PDF EXPORT
// ============================================================
async function exportPDF() {
  showToast('Génération du rapport PDF...');
  try {
    const [stats, analytics, profitability] = await Promise.all([api.get('/reports/dashboard'), api.get('/analytics/full'), api.get('/intelligence/profitability')]);
    const fmt = n => new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
    const now = new Date().toLocaleDateString('fr-FR', {day:'numeric',month:'long',year:'numeric'});
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Rapport La Palmeraie — ${now}</title><style>body{font-family:'Segoe UI',sans-serif;padding:40px;color:#1a1d23;max-width:800px;margin:0 auto;}h1{color:#173C11;font-size:24px;}h2{color:#39812F;font-size:16px;margin-top:28px;border-bottom:2px solid #e2e4e9;padding-bottom:6px;}.kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:16px 0;}.kpi{background:#f4f5f7;border-radius:8px;padding:14px;text-align:center;}.kpi .value{font-size:18px;font-weight:700;color:#173C11;}.kpi .label{font-size:12px;color:#6b7280;margin-top:2px;}table{width:100%;border-collapse:collapse;font-size:13px;margin-top:12px;}th{text-align:left;padding:8px 10px;background:#f4f5f7;font-weight:600;}td{padding:8px 10px;border-bottom:1px solid #f3f4f6;}.badge{display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600;}.badge-a{background:#e8f5e4;color:#39812F;}.badge-b{background:#eff6ff;color:#3b82f6;}.badge-c{background:#fef3c7;color:#d97706;}.badge-d{background:#fee2e2;color:#ef4444;}@media print{body{padding:20px;}}</style></head><body>
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;"><div><h1>🌴 La Palmeraie</h1><p style="color:#6b7280;margin-top:4px;">Rapport de gestion — ${now}</p></div><div style="text-align:right;font-size:13px;color:#6b7280;">Généré automatiquement<br>par La Palmeraie Stock Manager</div></div>
    <h2>📊 Résumé financier</h2>
    <div class="kpi-grid"><div class="kpi"><div class="value">${fmt(analytics.summary.total_purchase_cost)}</div><div class="label">Coût d'achat total</div></div><div class="kpi"><div class="value">${fmt(analytics.summary.total_theoretical_gain)}</div><div class="label">Gain théorique</div></div><div class="kpi"><div class="value">${fmt(analytics.summary.total_real_gain)}</div><div class="label">Gain réel</div></div><div class="kpi"><div class="value">${fmt(analytics.summary.total_loss_value)}</div><div class="label">Valeur des pertes</div></div><div class="kpi"><div class="value" style="color:${analytics.summary.total_margin>=0?'#39812F':'#ef4444'}">${fmt(analytics.summary.total_margin)}</div><div class="label">Marge nette</div></div><div class="kpi"><div class="value">${stats.total_products}</div><div class="label">Produits en stock</div></div></div>
    <h2>⚠️ Alertes stock (${stats.alerts.length})</h2>${stats.alerts.length === 0 ? '<p>Aucune alerte.</p>' : `<table><thead><tr><th>Produit</th><th>Stock actuel</th><th>Seuil</th><th>Statut</th></tr></thead><tbody>${stats.alerts.map(a => `<tr><td>${a.product_name}</td><td>${a.current_stock} ${a.unit}</td><td>${a.alert_threshold} ${a.unit}</td><td>${a.status === 'out' ? '🔴 Rupture' : '🟡 Stock faible'}</td></tr>`).join('')}</tbody></table>`}
    <h2>🏆 Classement de rentabilité</h2><table><thead><tr><th>Grade</th><th>Produit</th><th>Revenu</th><th>Marge</th><th>Score</th></tr></thead><tbody>${profitability.slice(0,10).map(p => `<tr><td><span class="badge badge-${p.grade.toLowerCase()}">${p.grade}</span></td><td>${p.name}</td><td>${fmt(p.revenue)}</td><td style="color:${p.margin_pct>=0?'#39812F':'#ef4444'}">${p.margin_pct}%</td><td>${p.score}/100</td></tr>`).join('')}</tbody></table>
    <p style="margin-top:40px;font-size:12px;color:#9ca3af;text-align:center;">La Palmeraie Stock Manager · Rapport confidentiel · ${now}</p>
    <script>window.onload=()=>{window.print();}<\/script></body></html>`);
    printWindow.document.close();
  } catch(e) { showToast('Erreur export: ' + e.message, 'error'); }
}

// ============================================================
//  PAGE: COMPARAISON MENSUELLE
// ============================================================
async function renderMonthlyComparison() {
  if (user.role !== 'admin') { setContent(`<div class="card"><div class="empty-state"><i class="fa-solid fa-lock"></i><p>Accès réservé à l'administrateur.</p></div></div>`); return; }
  setContent(`<div class="loading-state"><i class="fa-solid fa-spinner fa-spin"></i> Chargement...</div>`);
  try {
    const data = await api.get('/analytics/monthly-comparison');
    const { months, comparison } = data;
    const fmt = n => new Intl.NumberFormat('fr-FR').format(n) + ' F';
    const changeChip = (pct) => { if (pct === null) return '<span style="color:var(--color-text-muted);font-size:12px;">—</span>'; const up = pct >= 0; return `<span style="color:${up?'var(--color-success)':'var(--color-danger)'};font-weight:700;font-size:13px;"><i class="fa-solid fa-arrow-${up?'up':'down'}"></i> ${Math.abs(pct)}%</span>`; };
    const comparisonHtml = comparison ? `<div class="card" style="border-left:4px solid var(--color-accent);"><h2 style="margin-bottom:16px;">📊 ${comparison.current_month} vs ${comparison.previous_month}</h2><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;"><div style="text-align:center;padding:12px;background:#f8faf8;border-radius:10px;"><div style="font-size:12px;color:var(--color-text-muted);margin-bottom:6px;">Gain réel</div>${changeChip(comparison.revenue_change)}</div><div style="text-align:center;padding:12px;background:#f8faf8;border-radius:10px;"><div style="font-size:12px;color:var(--color-text-muted);margin-bottom:6px;">Coût d'achat</div>${changeChip(comparison.cost_change)}</div><div style="text-align:center;padding:12px;background:#f8faf8;border-radius:10px;"><div style="font-size:12px;color:var(--color-text-muted);margin-bottom:6px;">Marge</div>${changeChip(comparison.margin_change)}</div><div style="text-align:center;padding:12px;background:#f8faf8;border-radius:10px;"><div style="font-size:12px;color:var(--color-text-muted);margin-bottom:6px;">Pertes</div>${changeChip(comparison.loss_change)}</div></div></div>` : '';
    const tableRows = months.map(m => `<tr><td><strong>${m.label}</strong></td><td style="color:var(--color-danger);">${fmt(m.purchase_cost)}</td><td style="color:var(--color-info);">${fmt(m.theoretical_gain)}</td><td style="color:var(--color-warning);">${fmt(m.loss_value)}</td><td style="color:var(--color-accent);font-weight:600;">${fmt(m.real_gain)}</td><td style="color:${m.margin>=0?'var(--color-success)':'var(--color-danger)'};font-weight:700;">${fmt(m.margin)}</td></tr>`).join('');
    setContent(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;"><div><h1 style="font-size:20px;font-weight:700;">Comparaison mensuelle</h1><p style="font-size:13px;color:var(--color-text-muted);margin-top:2px;">6 derniers mois</p></div><button class="btn btn-outline" onclick="navigateTo('analytics')"><i class="fa-solid fa-arrow-left"></i> Retour Analytics</button></div>
      ${comparisonHtml}
      <div class="card"><h2><i class="fa-solid fa-chart-bar" style="color:var(--color-accent);margin-right:8px;"></i>Évolution sur 6 mois</h2><br><canvas id="monthlyChart" height="90"></canvas></div>
      <div class="card"><h2><i class="fa-solid fa-table" style="color:var(--color-text-muted);margin-right:8px;"></i>Tableau détaillé</h2><div class="table-wrap" style="margin-top:16px;"><table class="data-table"><thead><tr><th>Mois</th><th style="color:var(--color-danger);">Coût achat</th><th style="color:var(--color-info);">Gain théorique</th><th style="color:var(--color-warning);">Pertes</th><th style="color:var(--color-accent);">Gain réel</th><th>Marge</th></tr></thead><tbody>${tableRows}</tbody></table></div></div>
    `);
    loadChartJs(() => {
      const canvas = document.getElementById('monthlyChart');
      if (!canvas) return;
      new Chart(canvas, { type: 'bar', data: { labels: months.map(m => m.label), datasets: [{ label: "Coût d'achat", data: months.map(m => m.purchase_cost), backgroundColor: 'rgba(239,68,68,0.7)', borderRadius: 4 }, { label: 'Gain réel', data: months.map(m => m.real_gain), backgroundColor: 'rgba(57,129,47,0.7)', borderRadius: 4 }, { label: 'Marge', data: months.map(m => m.margin), type: 'line', borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', tension: 0.4, pointRadius: 5, fill: false, yAxisID: 'y' }] }, options: { responsive: true, plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${new Intl.NumberFormat('fr-FR').format(ctx.parsed.y)} FCFA` } } }, scales: { y: { ticks: { callback: v => new Intl.NumberFormat('fr-FR', {notation:'compact'}).format(v) + ' F' } } } } });
    });
  } catch(e) { setContent(`<div class="card"><p style="color:var(--color-danger);">Erreur: ${e.message}</p></div>`); }
}

// ============================================================
//  PAGE: PLATS & RECETTES
// ============================================================
async function renderDishes() {
  try {
    const [dishes, products] = await Promise.all([api.get('/dishes'), api.get('/products')]);
    const productOptions = products.map(p => `<option value="${p.id}" data-unit="${p.unit}">${p.name} (${p.unit})</option>`).join('');
    window._dishProductOptions = productOptions;

    const dishCards = dishes.length === 0
      ? `<div class="empty-state"><i class="fa-solid fa-utensils"></i><p>Aucun plat créé. Ajoutez votre premier plat ci-dessous.</p></div>`
      : dishes.map(d => `
          <div class="card" style="margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;">
              <div><h3 style="font-size:15px;font-weight:700;">${d.name}</h3>${d.description ? `<p style="font-size:13px;color:var(--color-text-muted);margin-top:2px;">${d.description}</p>` : ''}</div>
              <div style="text-align:right;">
                <div style="font-size:18px;font-weight:700;color:var(--color-accent);">${new Intl.NumberFormat('fr-FR').format(d.selling_price)} FCFA</div>
                <div style="font-size:12px;color:var(--color-text-muted);">Coût: ${new Intl.NumberFormat('fr-FR').format(d.estimated_cost)} FCFA | Marge: <span style="color:${d.estimated_margin >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};">${new Intl.NumberFormat('fr-FR').format(d.estimated_margin)} FCFA</span></div>
              </div>
            </div>
            <div style="margin-top:12px;">
              <p style="font-size:12px;font-weight:600;color:var(--color-text-muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">Recette</p>
              <div style="display:flex;flex-wrap:wrap;gap:8px;">${d.ingredients.map(i => `<span style="background:var(--color-accent-light);color:var(--color-accent);padding:4px 10px;border-radius:99px;font-size:12px;font-weight:600;">${i.quantity} ${i.unit} ${i.product_name}</span>`).join('')}</div>
            </div>
            ${user.role === 'admin' ? `<div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end;">
              <button class="btn btn-outline btn-sm" onclick="openEditDish(${d.id}, '${d.name}', ${d.selling_price}, '${d.description || ''}')"><i class="fa-solid fa-pen"></i> Modifier</button>
              <button class="btn btn-outline btn-sm" onclick="openEditIngredients(${d.id}, '${d.name}')"><i class="fa-solid fa-list"></i> Recette</button>
              <button class="btn btn-danger btn-sm" onclick="deactivateDish(${d.id}, '${d.name}')"><i class="fa-solid fa-trash"></i></button>
            </div>` : ''}
          </div>`).join('');

    const addFormHtml = user.role === 'admin' ? `
      <div class="card">
        <h2><i class="fa-solid fa-plus" style="color:var(--color-accent);margin-right:8px;"></i>Ajouter un plat</h2><br>
        <div class="form-row">
          <div class="form-group"><label>Nom du plat</label><input type="text" class="form-control" id="newDishName" placeholder="ex: Thiéboudienne"></div>
          <div class="form-group"><label>Prix de vente (FCFA)</label><input type="number" class="form-control" id="newDishPrice" placeholder="ex: 3000" min="0"></div>
        </div>
        <div class="form-group"><label>Description (optionnel)</label><input type="text" class="form-control" id="newDishDescription" placeholder="ex: Riz au poisson sénégalais"></div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin:16px 0 10px;">
          <h3 style="font-size:14px;font-weight:700;">Ingrédients de la recette</h3>
          <button class="btn btn-outline btn-sm" onclick="addDishIngredient()"><i class="fa-solid fa-plus"></i> Ajouter un ingrédient</button>
        </div>
        <table class="items-table"><thead><tr><th style="width:45%">Ingrédient</th><th style="width:25%">Quantité</th><th style="width:20%">Unité</th><th style="width:10%"></th></tr></thead>
        <tbody id="dishIngredientsBody"><tr id="emptyDishRow"><td colspan="4" style="text-align:center;color:var(--color-text-muted);padding:16px;">Ajoutez au moins un ingrédient</td></tr></tbody></table>
        <div style="display:flex;justify-content:flex-end;margin-top:16px;"><button class="btn btn-primary" onclick="submitNewDish()"><i class="fa-solid fa-floppy-disk"></i> Créer le plat</button></div>
      </div>` : '';

    setContent(`
      <div class="card"><h2><i class="fa-solid fa-utensils" style="color:var(--color-accent);margin-right:8px;"></i>Plats & Recettes</h2><p style="font-size:13px;color:var(--color-text-muted);margin-top:4px;">Chaque plat a une recette fixe. Quand un plat est vendu, les ingrédients sont déduits automatiquement.</p></div>
      ${dishCards}
      ${addFormHtml}
      <div id="editDishModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:200;align-items:center;justify-content:center;padding:16px;">
        <div style="background:#fff;border-radius:16px;padding:28px;width:100%;max-width:420px;">
          <h3 style="margin-bottom:16px;">Modifier le plat</h3>
          <input type="hidden" id="editDishId">
          <div class="form-group"><label>Nom</label><input type="text" class="form-control" id="editDishName"></div>
          <div class="form-group"><label>Prix de vente (FCFA)</label><input type="number" class="form-control" id="editDishPrice" min="0"></div>
          <div class="form-group"><label>Description</label><input type="text" class="form-control" id="editDishDesc"></div>
          <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:8px;"><button class="btn btn-outline" onclick="closeEditDishModal()">Annuler</button><button class="btn btn-primary" onclick="submitEditDish()">Enregistrer</button></div>
        </div>
      </div>
      <div id="editIngredientsModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:200;align-items:center;justify-content:center;padding:16px;">
        <div style="background:#fff;border-radius:16px;padding:28px;width:100%;max-width:560px;max-height:80vh;overflow-y:auto;">
          <h3 style="margin-bottom:4px;">Modifier la recette</h3>
          <p id="editIngredientsTitle" style="font-size:13px;color:var(--color-text-muted);margin-bottom:16px;"></p>
          <input type="hidden" id="editIngredientsDishId">
          <table class="items-table"><thead><tr><th style="width:45%">Ingrédient</th><th style="width:25%">Quantité</th><th style="width:20%">Unité</th><th></th></tr></thead><tbody id="editIngredientsBody"></tbody></table>
          <button class="btn btn-outline btn-sm" style="margin-top:10px;" onclick="addEditIngredient()"><i class="fa-solid fa-plus"></i> Ajouter</button>
          <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:16px;"><button class="btn btn-outline" onclick="closeEditIngredientsModal()">Annuler</button><button class="btn btn-primary" onclick="submitEditIngredients()">Sauvegarder la recette</button></div>
        </div>
      </div>
    `);
    addDishIngredient();
  } catch(e) {
    setContent(`<div class="card"><p style="color:var(--color-danger);">Erreur: ${e.message}</p></div>`);
  }
}

function addDishIngredient() {
  const body = document.getElementById('dishIngredientsBody');
  const empty = document.getElementById('emptyDishRow');
  if (empty) empty.remove();
  const productOptions = window._dishProductOptions || '';
  const row = document.createElement('tr');
  row.className = 'dish-ingredient-row';
  row.innerHTML = `<td><select class="form-control dish-ing-product"><option value="">-- Sélectionner --</option>${productOptions}</select></td><td><input type="number" class="form-control dish-ing-qty" placeholder="0" min="0" step="0.01"></td><td><select class="form-control dish-ing-unit"><option>g</option><option>kg</option><option>ml</option><option>L</option><option>unité</option><option>bouteille</option><option>pièce</option></select></td><td><button class="btn-remove-item" onclick="this.closest('tr').remove()"><i class="fa-solid fa-trash"></i></button></td>`;
  body.appendChild(row);
}

async function submitNewDish() {
  const name = document.getElementById('newDishName').value.trim();
  const price = parseFloat(document.getElementById('newDishPrice').value);
  const description = document.getElementById('newDishDescription').value.trim();
  if (!name) { showToast('Le nom est obligatoire.', 'error'); return; }
  if (!price || price <= 0) { showToast('Le prix de vente est obligatoire.', 'error'); return; }
  const rows = document.querySelectorAll('.dish-ingredient-row');
  const ingredients = [];
  let valid = true;
  rows.forEach(row => {
    const productId = parseInt(row.querySelector('.dish-ing-product').value);
    const qty = parseFloat(row.querySelector('.dish-ing-qty').value);
    const unit = row.querySelector('.dish-ing-unit').value;
    if (!productId || !qty || qty <= 0) { valid = false; return; }
    ingredients.push({ product_id: productId, quantity: qty, unit });
  });
  if (ingredients.length === 0) { showToast('Ajoutez au moins un ingrédient.', 'error'); return; }
  if (!valid) { showToast('Vérifiez tous les ingrédients.', 'error'); return; }
  try { await api.post('/dishes', { name, selling_price: price, description: description || null, ingredients }); showToast('Plat créé avec succès !'); renderDishes(); } catch(e) { showToast(`Erreur: ${e.message}`, 'error'); }
}

function openEditDish(id, name, price, desc) {
  document.getElementById('editDishId').value = id;
  document.getElementById('editDishName').value = name;
  document.getElementById('editDishPrice').value = price;
  document.getElementById('editDishDesc').value = desc;
  document.getElementById('editDishModal').style.display = 'flex';
}
function closeEditDishModal() { document.getElementById('editDishModal').style.display = 'none'; }
async function submitEditDish() {
  const id = document.getElementById('editDishId').value;
  const body = { name: document.getElementById('editDishName').value, selling_price: parseFloat(document.getElementById('editDishPrice').value), description: document.getElementById('editDishDesc').value || null };
  try { await api.put(`/dishes/${id}`, body); showToast('Plat mis à jour !'); closeEditDishModal(); renderDishes(); } catch(e) { showToast(`Erreur: ${e.message}`, 'error'); }
}

function openEditIngredients(dishId, dishName) {
  document.getElementById('editIngredientsDishId').value = dishId;
  document.getElementById('editIngredientsTitle').textContent = dishName;
  document.getElementById('editIngredientsBody').innerHTML = '';
  addEditIngredient();
  document.getElementById('editIngredientsModal').style.display = 'flex';
}
function closeEditIngredientsModal() { document.getElementById('editIngredientsModal').style.display = 'none'; }
function addEditIngredient() {
  const body = document.getElementById('editIngredientsBody');
  const productOptions = window._dishProductOptions || '';
  const row = document.createElement('tr');
  row.className = 'edit-ingredient-row';
  row.innerHTML = `<td><select class="form-control edit-ing-product"><option value="">-- Sélectionner --</option>${productOptions}</select></td><td><input type="number" class="form-control edit-ing-qty" placeholder="0" min="0" step="0.01"></td><td><select class="form-control edit-ing-unit"><option>g</option><option>kg</option><option>ml</option><option>L</option><option>unité</option><option>bouteille</option><option>pièce</option></select></td><td><button class="btn-remove-item" onclick="this.closest('tr').remove()"><i class="fa-solid fa-trash"></i></button></td>`;
  body.appendChild(row);
}
async function submitEditIngredients() {
  const dishId = document.getElementById('editIngredientsDishId').value;
  const rows = document.querySelectorAll('.edit-ingredient-row');
  const ingredients = [];
  rows.forEach(row => {
    const productId = parseInt(row.querySelector('.edit-ing-product').value);
    const qty = parseFloat(row.querySelector('.edit-ing-qty').value);
    const unit = row.querySelector('.edit-ing-unit').value;
    if (productId && qty > 0) ingredients.push({ product_id: productId, quantity: qty, unit });
  });
  if (ingredients.length === 0) { showToast('Ajoutez au moins un ingrédient.', 'error'); return; }
  try { await api.put(`/dishes/${dishId}/ingredients`, ingredients); showToast('Recette mise à jour !'); closeEditIngredientsModal(); renderDishes(); } catch(e) { showToast(`Erreur: ${e.message}`, 'error'); }
}

async function deactivateDish(dishId, dishName) {
  if (!confirm(`Supprimer le plat "${dishName}" ?`)) return;
  try { await api.put(`/dishes/${dishId}`, { active: 0 }); showToast('Plat supprimé.'); renderDishes(); } catch(e) { showToast(`Erreur: ${e.message}`, 'error'); }
}