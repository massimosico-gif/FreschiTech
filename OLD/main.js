/**
 * BresanuSite Manager - Core Logic
 */

// --- Configurazione Iniziale e Defaults ---
const defaultImpostazioni = {
    costoOrarioViaggio: 20,
    costoOrarioManodopera: 30,
    ricaricoManodopera: 50,
    ricaricoMateriali: 25,
    ricaricoTrasferte: 20,
    categorieCC: ['Macchinari', 'Opere Civili', 'Liquami', 'Impianto Elettrico'],
    furgoni: [{ id: 'f1', nome: 'Furgone 1', targa: 'AB123CD', costoKm: 0.50 }]
};

function loadFromStorage(key, defaultValue) {
    try {
        const val = localStorage.getItem(key);
        return val ? JSON.parse(val) : defaultValue;
    } catch(e) { return defaultValue; }
}

const rawImpostazioni = loadFromStorage('bresanu_impostazioni', defaultImpostazioni);

let state = {
    commesse: loadFromStorage('bresanu_commesse', []),
    currentCommessaId: localStorage.getItem('bresanu_current_id') || null,
    catalogo: loadFromStorage('bresanu_catalogo', []),
    catalogoRobot: loadFromStorage('bresanu_catalogoRobot', []),
    robotCantiere: loadFromStorage('bresanu_robotCantiere', []),
    materiali: loadFromStorage('bresanu_materiali', []),
    manodopera: loadFromStorage('bresanu_manodopera', []),
    spese: loadFromStorage('bresanu_spese', []),
    clienti: loadFromStorage('bresanu_clienti', []),
    impostazioni: { ...defaultImpostazioni, ...rawImpostazioni },
    activeView: 'home',
    activeTab: 'dashboard',
    searchQuery: '',
    isPrivacyMode: false,
    isLocked: true,
    masterPasswordHash: localStorage.getItem('bresanu_password_hash') || null,
    currentClientId: null
};

let mainChart = null;
let profitChart = null;

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initLucide();
    setupEventListeners();
    renderApp();
});

function initLucide() { if (window.lucide) window.lucide.createIcons(); }

function saveState() {
    localStorage.setItem('bresanu_commesse', JSON.stringify(state.commesse));
    localStorage.setItem('bresanu_current_id', state.currentCommessaId);
    localStorage.setItem('bresanu_catalogo', JSON.stringify(state.catalogo));
    localStorage.setItem('bresanu_catalogoRobot', JSON.stringify(state.catalogoRobot));
    localStorage.setItem('bresanu_robotCantiere', JSON.stringify(state.robotCantiere));
    localStorage.setItem('bresanu_materiali', JSON.stringify(state.materiali));
    localStorage.setItem('bresanu_manodopera', JSON.stringify(state.manodopera));
    localStorage.setItem('bresanu_spese', JSON.stringify(state.spese));
    localStorage.setItem('bresanu_clienti', JSON.stringify(state.clienti));
    localStorage.setItem('bresanu_catalogoRobot', JSON.stringify(state.catalogoRobot));
    localStorage.setItem('bresanu_impostazioni', JSON.stringify(state.impostazioni));
}

// --- UI Rendering ---

function setupEventListeners() {
    document.querySelectorAll('.main-nav li').forEach(li => {
        li.addEventListener('click', () => {
            document.querySelectorAll('.main-nav li').forEach(el => el.classList.remove('active'));
            li.classList.add('active');
            state.activeTab = li.dataset.tab;
            renderActiveTab();
        });
    });
    const closeBtn = document.querySelector('.close-modal');
    if (closeBtn) closeBtn.onclick = hideModal;
}

function renderApp() {
    if (state.isLocked && state.masterPasswordHash) {
        renderLockScreen();
        return;
    }

    const nav = document.getElementById('project-nav');
    const headerContext = document.getElementById('header-context');
    const dashboardEl = document.getElementById('dashboard');
    
    if (state.activeView === 'home') {
        if(nav) nav.style.display = 'none';
        if(dashboardEl) dashboardEl.classList.remove('active');
        if(headerContext) headerContext.innerHTML = '';
        renderHome();
    } else if (state.activeView === 'catalog') {
        if(nav) nav.style.display = 'none';
        if(dashboardEl) dashboardEl.classList.remove('active');
        if(headerContext) headerContext.innerHTML = `<button class="btn-secondary" onclick="goHome()"><i data-lucide="arrow-left"></i> Torna alla Home</button>`;
        renderCatalogo();
    } else if (state.activeView === 'clients') {
        if(nav) nav.style.display = 'none';
        if(dashboardEl) dashboardEl.classList.remove('active');
        if(headerContext) headerContext.innerHTML = `<button class="btn-secondary" onclick="goHome()"><i data-lucide="arrow-left"></i> Torna alla Home</button>`;
        renderClienti();
    } else if (state.activeView === 'client-detail') {
        if(nav) nav.style.display = 'none';
        if(dashboardEl) dashboardEl.classList.remove('active');
        if(headerContext) headerContext.innerHTML = `<button class="btn-secondary" onclick="openClients()"><i data-lucide="arrow-left"></i> Torna ai Clienti</button>`;
        renderDettaglioCliente(state.currentClientId);
    } else if (state.activeView === 'project') {
        if(nav) nav.style.display = 'flex';
        const c = state.commesse.find(x => x.id === state.currentCommessaId);
        if(headerContext) headerContext.innerHTML = `
            <button class="btn-secondary" onclick="goHome()"><i data-lucide="arrow-left"></i> Torna alla Home</button>
            <h2 style="margin:0; font-size: 1.2rem; display: flex; align-items: center; gap: 0.5rem;"><i data-lucide="folder-open"></i> ${c ? c.nome : ''}</h2>
        `;
        renderActiveTab();
    }
    initLucide();
}

function goHome() { state.activeView = 'home'; saveState(); renderApp(); }
function openCatalog() { state.activeView = 'catalog'; saveState(); renderApp(); }
function openClients() { state.activeView = 'clients'; saveState(); renderApp(); }
function openClientDetail(id) { state.currentClientId = id; state.activeView = 'client-detail'; saveState(); renderApp(); }
function openProject(id) {
    state.currentCommessaId = id;
    state.activeView = 'project';
    state.activeTab = 'dashboard';
    
    document.querySelectorAll('.main-nav li').forEach(el => el.classList.remove('active'));
    const dashTab = document.querySelector('.main-nav li[data-tab="dashboard"]');
    if (dashTab) dashTab.classList.add('active');
    
    saveState();
    renderApp();
}

function renderHome() {
    const query = state.searchQuery.toLowerCase();
    
    let globalPreventivo = 0;
    let globalVendita = 0;
    let globalCosti = 0;

    const filteredClients = query ? state.clienti.filter(cl => 
        cl.nome.toLowerCase().includes(query) || 
        (cl.piva && cl.piva.toLowerCase().includes(query)) ||
        (cl.citta && cl.citta.toLowerCase().includes(query))
    ) : [];

    const filteredCommesse = state.commesse.filter(c => {
        const n = c.nome.toLowerCase();
        const cl = (c.cliente || '').toLowerCase();
        const tags = (c.macchineInstallate || '').toLowerCase();
        return n.includes(query) || cl.includes(query) || tags.includes(query);
    });

    const clientsHtml = filteredClients.map(cl => `
        <div class="client-card glass search-result-client" onclick="openClientDetail('${cl.id}')" style="border-left: 4px solid var(--accent); margin-bottom: 1rem;">
            <div class="client-card-header">
                <div style="display:flex; align-items:center; gap:10px;">
                    <i data-lucide="user" style="color:var(--accent)"></i>
                    <h3 style="margin:0">${cl.nome}</h3>
                </div>
                <span class="client-badge">CLIENTE</span>
            </div>
            <div class="client-card-body">
                <p><i data-lucide="map-pin"></i> ${cl.citta || 'Indirizzo non specificato'}</p>
            </div>
        </div>
    `).join('');

    const commesseHtml = filteredCommesse.map(c => {
        const mats = state.materiali.filter(m => m.commessaId === c.id);
        const labs = state.manodopera.filter(l => l.commessaId === c.id);
        const sps = state.spese.filter(s => s.commessaId === c.id);
        
        const matC = mats.reduce((s, m) => s + (m.qty * m.unitPrice), 0);
        const matS = mats.reduce((s, m) => s + (m.qty * m.unitPrice * (1 + m.markup)), 0);
        const labC = labs.reduce((s, l) => s + (l.totalHours * l.unitPrice), 0);
        const labS = labs.reduce((s, l) => s + (l.totalHours * l.unitPrice * (1 + l.markup)), 0);
        
        const ricaricoTrasferte = 1 + ((state.impostazioni.ricaricoTrasferte !== undefined ? state.impostazioni.ricaricoTrasferte : 20) / 100);
        const traC = labs.reduce((s, l) => s + (l.viaggio ? (l.viaggio.costoFurgone || l.viaggio.costoTot || 0) + (l.viaggio.costoOreViaggio || 0) : 0), 0);
        const traS = labs.reduce((s, l) => s + (l.viaggio ? ((l.viaggio.costoFurgone || l.viaggio.costoTot || 0) + (l.viaggio.costoOreViaggio || 0)) * ricaricoTrasferte : 0), 0);
        
        const speC = sps.reduce((s, x) => s + (x.qty * x.unitPrice), 0);
        const speS = sps.reduce((s, x) => s + (x.qty * x.unitPrice * (1 + x.markup)), 0);
        
        const robs = state.robotCantiere.filter(r => r.commessaId === c.id);
        const robC = robs.reduce((s, r) => s + r.costoBase + (r.trasporto || 0) + (r.fee || 0), 0);
        const robS = robs.reduce((s, r) => s + (r.costoBase * (1 + r.markup)) + (r.trasporto || 0) + (r.fee || 0), 0);

        const totalC = matC + labC + traC + speC + robC;
        const totalS = matS + labS + traS + speS + robS;
        const totalP = totalS - totalC;
        
        globalPreventivo += (c.budget || 0);
        globalCosti += totalC;
        globalVendita += totalS;
        
        const profitColor = totalP >= 0 ? 'var(--success)' : 'var(--danger)';
        const tagsHtml = c.macchineInstallate ? c.macchineInstallate.split(',').map(t => `<span class="tag">${t.trim()}</span>`).join('') : '';

        return `
            <div class="commessa-card glass" onclick="openProject('${c.id}')">
                <div class="card-header" style="border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.75rem; margin-bottom: 0.5rem;">
                    <h3 style="margin: 0 0 0.25rem 0; font-size: 1.3rem;">${c.nome}</h3>
                    <span class="cliente" style="font-size: 0.85rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.3rem;"><i data-lucide="building-2" style="width: 14px; height: 14px;"></i> ${c.cliente || 'Nessun cliente'}</span>
                </div>
                <div class="card-body" style="flex: 1;">
                    <div class="card-stat"><span>Preventivo:</span> <strong>${formatCurrency(c.budget || 0)}</strong></div>
                    <div class="card-stat"><span>Valore Vendita:</span> <strong>${formatCurrency(totalS)}</strong></div>
                    <div class="card-stat" style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid rgba(255,255,255,0.1);">
                        <span>Utile Previsto:</span> 
                        <strong style="color: ${profitColor}; font-size: 1.1rem;">${formatCurrency(totalP)}</strong>
                    </div>
                </div>
                ${tagsHtml ? `<div class="card-tags" style="margin-top: 0.5rem;">${tagsHtml}</div>` : ''}
                <div class="card-actions" style="margin-top: 1rem; text-align: right; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 0.5rem;">
                    <button class="icon-btn btn-danger btn-small" onclick="event.stopPropagation(); deleteCommessa('${c.id}')" title="Elimina Cantiere"><i data-lucide="trash-2" style="width: 16px; height: 16px;"></i> Elimina</button>
                </div>
            </div>
        `;
    }).join('');

    const globalUtile = globalVendita - globalCosti;
    const globalUtileColor = globalUtile >= 0 ? 'var(--success)' : 'var(--danger)';

    const globalStatsHtml = `
        <div class="stats-grid-small" style="margin-bottom: 2rem;">
            <div class="stat-card glass">
                <div class="stat-icon" style="background: rgba(245, 158, 11, 0.1); color: var(--warning);"><i data-lucide="target"></i></div>
                <div class="stat-info">
                    <h3>Totale Preventivi (Tutti i Cantieri)</h3>
                    <p style="font-size: 1.5rem;">${formatCurrency(globalPreventivo)}</p>
                </div>
            </div>
            <div class="stat-card glass sale">
                <div class="stat-icon"><i data-lucide="trending-up"></i></div>
                <div class="stat-info">
                    <h3>Totale Vendita Attesa</h3>
                    <p style="font-size: 1.5rem;">${formatCurrency(globalVendita)}</p>
                </div>
            </div>
            <div class="stat-card glass profit">
                <div class="stat-icon" style="background: ${globalUtile >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; color: ${globalUtileColor};"><i data-lucide="piggy-bank"></i></div>
                <div class="stat-info">
                    <h3>Utile Netto Globale</h3>
                    <p style="font-size: 1.5rem; color: ${globalUtileColor}">${formatCurrency(globalUtile)}</p>
                </div>
            </div>
        </div>
    `;

    document.getElementById('dynamic-content').innerHTML = `
        <section id="home-view" class="tab-content active" style="animation: fadeIn 0.3s ease-out;">
            <div class="home-toolbar glass" style="display:flex; justify-content:space-between; align-items:center; padding: 1rem; border-radius: var(--radius); margin-bottom: 1.5rem; gap: 1rem; flex-wrap: wrap;">
                <div style="display:flex; gap: 1rem; align-items:center; flex: 1; min-width: 300px;">
                    <i data-lucide="search" style="color: var(--text-muted)"></i>
                    <input type="text" id="home-search" placeholder="Cerca per nome, cliente o macchine installate..." value="${state.searchQuery}" oninput="state.searchQuery=this.value; renderHome()" style="max-width: 100%;">
                </div>
                <div style="display:flex; gap: 1rem;">
                    <button class="btn-secondary" onclick="openClients()"><i data-lucide="users"></i> Anagrafica Clienti</button>
                    <button class="btn-secondary" onclick="openCatalog()"><i data-lucide="database"></i> Catalogo Globale</button>
                    <button class="btn-primary" onclick="addCommessa()"><i data-lucide="plus"></i> Nuova Commessa</button>
                </div>
            </div>
            
            ${globalStatsHtml}

            ${clientsHtml ? `
                <div class="search-results-section" style="margin-bottom: 2rem;">
                    <h2 style="font-size:0.9rem; color:var(--accent); text-transform:uppercase; letter-spacing:1px; margin-bottom:1rem; border-bottom: 1px solid rgba(56, 189, 248, 0.2); padding-bottom: 0.5rem;">Clienti Corrispondenti</h2>
                    <div class="clients-grid" style="grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem;">
                        ${clientsHtml}
                    </div>
                </div>
            ` : ''}

            <div class="section-header" style="margin-bottom: 1rem;">
                <h2 style="font-size:0.9rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px;">${query ? 'Commesse e Cantieri Corrispondenti' : 'Tutti i Cantieri Attivi'}</h2>
            </div>

            <div class="commesse-grid">
                ${commesseHtml || '<p style="text-align:center; color:var(--text-muted); padding: 3rem; width: 100%; grid-column: 1 / -1;">Nessuna commessa trovata.</p>'}
            </div>
        </section>
    `;
    
    if (state.searchQuery) {
        const s = document.getElementById('home-search');
        if(s) { s.focus(); const val = s.value; s.value=''; s.value=val; }
    }
}

function addCommessa() {
    showPromptModal('Nuova Commessa', 'Nome cantiere:', (n) => {
        if (n) {
            const id = Date.now().toString();
            state.commesse.push({ id, nome: n, budget: 0, cliente: '-', kmSede: 0, costoAutostrada: 0, oreViaggio: 1, note: '', macchineInstallate: '', fasi: ['Generale'] });
            state.currentCommessaId = id; 
            saveState(); 
            openProject(id);
        }
    });
}

function deleteCommessa(id) {
    if(confirm('Sei sicuro di voler eliminare questa commessa e tutti i suoi dati? Questa azione è irreversibile.')) {
        state.commesse = state.commesse.filter(c => c.id !== id);
        state.materiali = state.materiali.filter(m => m.commessaId !== id);
        state.manodopera = state.manodopera.filter(l => l.commessaId !== id);
        state.spese = state.spese.filter(s => s.commessaId !== id);
        state.robotCantiere = state.robotCantiere.filter(r => r.commessaId !== id);
        saveState();
        renderHome();
    }
}

function renderActiveTab() {
    if (state.activeTab !== 'dashboard') { if (mainChart) mainChart.destroy(); if (profitChart) profitChart.destroy(); mainChart = null; profitChart = null; }
    
    if (state.activeTab === 'dashboard') {
        document.getElementById('dynamic-content').innerHTML = '';
        document.getElementById('dashboard').classList.add('active');
        updateDashboardStats();
    } else {
        document.getElementById('dashboard').classList.remove('active');
        switch (state.activeTab) {
            case 'robot': renderRobotCantiere(); break;
            case 'materiali': renderMateriali(); break;
            case 'manodopera': renderManodopera(); break;
            case 'spese': renderSpese(); break;
            case 'catalogo': renderCatalogo(); break;
        }
    }
}

// --- Gestione Centri di Costo ---

function renderRobotCantiere() {
    const robots = state.robotCantiere.filter(r => r.commessaId === state.currentCommessaId);
    
    document.getElementById('dynamic-content').innerHTML = `
        <section id="robot-cantiere" class="tab-content active">
            <div class="section-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                <h2>Gestione Centri di Costo</h2>
                <button class="btn-primary" onclick="showAddRobotModal()"><i data-lucide="plus"></i> Nuovo Centro di Costo</button>
            </div>
            
            <div class="robots-hierarchy-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 1.5rem;">
                ${robots.length === 0 ? '<div class="glass" style="grid-column: 1/-1; padding: 3rem; text-align: center; color: var(--text-muted);">Nessun centro di costo configurato. Aggiungine uno per iniziare a monitorare i costi di installazione.</div>' : ''}
                ${robots.map(r => {
                    const linkedMats = state.materiali.filter(m => m.linkedId === r.id);
                    const linkedLabs = state.manodopera.filter(l => l.linkedId === r.id);
                    
                    const matCost = linkedMats.reduce((s, m) => s + (m.qty * m.unitPrice), 0);
                    const labCost = linkedLabs.reduce((s, l) => s + (l.totalHours * l.unitPrice), 0);
                    const labViaggio = linkedLabs.reduce((s, l) => s + (l.viaggio ? (l.viaggio.costoFurgone || 0) + (l.viaggio.costoOreViaggio || 0) : 0), 0);
                    
                    const totalCostoMacchina = r.costoBase + (r.trasporto || 0) + (r.fee || 0) + matCost + labCost + labViaggio;
                    
                    const venditaMacchina = (r.costoBase * (1 + (r.markup || 0))) + (r.trasporto || 0) + (r.fee || 0);
                    const venditaMats = linkedMats.reduce((s, m) => s + (m.qty * m.unitPrice * (1 + m.markup)), 0);
                    const venditaLabs = linkedLabs.reduce((s, l) => s + (l.totalHours * l.unitPrice * (1 + l.markup)), 0);
                    const venditaViaggio = labViaggio * 1.2; 
                    
                    const totalVenditaMacchina = venditaMacchina + venditaMats + venditaLabs + venditaViaggio;
                    const profitMacchina = totalVenditaMacchina - totalCostoMacchina;
                    const profitColor = profitMacchina >= 0 ? 'var(--success)' : 'var(--danger)';
                    
                    return `
                        <div class="robot-cost-center glass" style="padding:1.5rem; border-left:4px solid var(--accent); position:relative;">
                            <div class="robot-cc-header" style="display:flex; justify-content:space-between; margin-bottom:1rem;">
                                <div>
                                    <div style="display:flex; gap:8px; align-items:center; margin-bottom:4px;">
                                        <span style="font-size:0.7rem; background:var(--accent); color:var(--bg-dark); padding:2px 6px; border-radius:4px; font-weight:800; text-transform:uppercase;">${r.categoria || 'Generale'}</span>
                                        <span style="font-size:0.75rem; color:var(--accent); font-weight:700; text-transform:uppercase;">${r.marca}</span>
                                    </div>
                                    <h3 style="margin:0; font-size:1.25rem;">${r.modello}</h3>
                                </div>
                                <div style="display:flex; gap:5px;">
                                    <button class="btn-secondary btn-small" onclick="showEditRobotModal('${r.id}')"><i data-lucide="edit-3" style="width:14px"></i></button>
                                    <button class="btn-danger btn-small" onclick="deleteRobot('${r.id}')"><i data-lucide="trash-2" style="width:14px"></i></button>
                                </div>
                            </div>
                            
                            <div class="robot-cc-main-stats" style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1.5rem; background:rgba(255,255,255,0.03); padding:1rem; border-radius:8px;">
                                <div>
                                    <label style="font-size:0.7rem; color:var(--text-muted); display:block;">COSTO TOT. INSTALLAZIONE</label>
                                    <p style="font-size:1.1rem; font-weight:700; margin:0;">${formatCurrency(totalCostoMacchina)}</p>
                                </div>
                                <div>
                                    <label style="font-size:0.7rem; color:var(--text-muted); display:block;">VALORE VENDITA TOT.</label>
                                    <p style="font-size:1.1rem; font-weight:700; margin:0; color:var(--success)">${formatCurrency(totalVenditaMacchina)}</p>
                                </div>
                                <div style="grid-column: span 2; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 0.5rem; text-align: right;">
                                    <label style="font-size:0.7rem; color:var(--text-muted);">UTILE CENTRO DI COSTO:</label>
                                    <span style="font-size:1.1rem; font-weight:800; color:${profitColor}">${formatCurrency(profitMacchina)}</span>
                                </div>
                            </div>

                            <div class="robot-cc-details">
                                <details style="font-size:0.85rem;">
                                    <summary style="cursor:pointer; color:var(--accent); font-weight:600; padding:0.5rem 0;">Dettaglio Componenti (${1 + linkedMats.length + linkedLabs.length})</summary>
                                    <div style="padding:0.5rem; background:rgba(0,0,0,0.2); border-radius:4px; margin-top:0.5rem;">
                                        <table style="width:100%; border-collapse:collapse;">
                                            <tbody style="font-size:0.8rem;">
                                                <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                                                    <td style="padding:4px 0;">Centro di Costo (Base + Fee)</td>
                                                    <td style="text-align:right;">${formatCurrency(venditaMacchina)}</td>
                                                </tr>
                                                ${linkedMats.map(m => `
                                                    <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                                                        <td style="padding:4px 0;">${m.descrizione}</td>
                                                        <td style="text-align:right;">${formatCurrency(m.qty * m.unitPrice * (1 + m.markup))}</td>
                                                    </tr>
                                                `).join('')}
                                                ${linkedLabs.map(l => `
                                                    <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                                                        <td style="padding:4px 0;">Manodopera: ${l.descrizione}</td>
                                                        <td style="text-align:right;">${formatCurrency((l.totalHours * l.unitPrice * (1 + l.markup)) + (l.viaggio ? (l.viaggio.costoFurgone || 0) + (l.viaggio.costoOreViaggio || 0) * 1.2 : 0))}</td>
                                                    </tr>
                                                `).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                </details>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </section>
    `;
    initLucide();
}

function showAddRobotModal() {
    const html = `
        <form id="add-robot-form">
            <div class="form-group">
                <label>Seleziona dal Catalogo</label>
                <select id="ar-catalog-id" onchange="onRobotSelect(this.value)">
                    <option value="">-- Scegli un modello --</option>
                    ${state.catalogoRobot.map(r => `<option value="${r.id}">${r.marca} - ${r.modello}</option>`).join('')}
                </select>
            </div>
            <div class="grid-2">
                <div class="form-group"><label>Marca/Tipologia</label><input type="text" id="ar-marca" required></div>
                <div class="form-group"><label>Modello/Descrizione</label><input type="text" id="ar-modello" required></div>
            </div>
            <div class="form-group">
                <label>Categoria Centro di Costo</label>
                <select id="ar-categoria">
                    ${(state.impostazioni.categorieCC || []).map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                </select>
            </div>
            <div class="grid-2">
                <div class="form-group"><label>Costo Base (€)</label><input type="number" id="ar-costo" step="0.01" required></div>
                <div class="form-group"><label>Ricarico (%)</label><input type="number" id="ar-markup" step="0.1"></div>
            </div>
            <div class="grid-2">
                <div class="form-group"><label>Trasporto (€)</label><input type="number" id="ar-trasporto" step="0.01"></div>
                <div class="form-group"><label>Fee Montaggio (€)</label><input type="number" id="ar-fee" step="0.01"></div>
            </div>
            <div class="text-right mt-4">
                <button type="button" class="btn-secondary" onclick="hideModal()">Annulla</button>
                <button type="submit" class="btn-primary">Aggiungi al Cantiere</button>
            </div>
        </form>
    `;
    showModal('Nuovo Centro di Costo', html);
    document.getElementById('add-robot-form').onsubmit = (e) => {
        e.preventDefault();
        state.robotCantiere.push({
            id: Date.now().toString(),
            commessaId: state.currentCommessaId,
            marca: document.getElementById('ar-marca').value,
            modello: document.getElementById('ar-modello').value,
            categoria: document.getElementById('ar-categoria').value,
            costoBase: parseFloat(document.getElementById('ar-costo').value),
            markup: parseFloat(document.getElementById('ar-markup').value) / 100,
            trasporto: parseFloat(document.getElementById('ar-trasporto').value) || 0,
            fee: parseFloat(document.getElementById('ar-fee').value) || 0
        });
        saveState(); hideModal(); renderRobotCantiere();
    };
}

function showEditRobotModal(robotId) {
    const r = state.robotCantiere.find(x => x.id === robotId);
    if (!r) return;
    
    const html = `
        <form id="edit-robot-form">
            <div class="grid-2">
                <div class="form-group"><label>Marca/Tipologia</label><input type="text" id="er-marca" value="${r.marca}" required></div>
                <div class="form-group"><label>Modello/Descrizione</label><input type="text" id="er-modello" value="${r.modello}" required></div>
            </div>
            <div class="form-group">
                <label>Categoria Centro di Costo</label>
                <select id="er-categoria">
                    ${(state.impostazioni.categorieCC || []).map(cat => `<option value="${cat}" ${cat === r.categoria ? 'selected' : ''}>${cat}</option>`).join('')}
                </select>
            </div>
            <div class="grid-2">
                <div class="form-group"><label>Costo Base (€)</label><input type="number" id="er-costo" value="${r.costoBase}" step="0.01" required></div>
                <div class="form-group"><label>Ricarico (%)</label><input type="number" id="er-markup" value="${(r.markup || 0) * 100}" step="0.1"></div>
            </div>
            <div class="grid-2">
                <div class="form-group"><label>Trasporto (€)</label><input type="number" id="er-trasporto" value="${r.trasporto || 0}" step="0.01"></div>
                <div class="form-group"><label>Fee Montaggio (€)</label><input type="number" id="er-fee" value="${r.fee || 0}" step="0.01"></div>
            </div>
            <div class="text-right mt-4">
                <button type="button" class="btn-secondary" onclick="hideModal()">Annulla</button>
                <button type="submit" class="btn-primary">Salva Modifiche</button>
            </div>
        </form>
    `;
    showModal('Modifica Centro di Costo', html);
    document.getElementById('edit-robot-form').onsubmit = (e) => {
        e.preventDefault();
        r.marca = document.getElementById('er-marca').value;
        r.modello = document.getElementById('er-modello').value;
        r.costoBase = parseFloat(document.getElementById('er-costo').value);
        r.markup = parseFloat(document.getElementById('er-markup').value) / 100;
        r.trasporto = parseFloat(document.getElementById('er-trasporto').value) || 0;
        r.fee = parseFloat(document.getElementById('er-fee').value) || 0;
        saveState(); hideModal(); renderRobotCantiere();
    };
}

function onRobotSelect(id) {
    const r = state.catalogoRobot.find(x => x.id === id);
    if (r) {
        document.getElementById('ar-marca').value = r.marca;
        document.getElementById('ar-modello').value = r.modello;
        document.getElementById('ar-costo').value = r.costoBase;
        document.getElementById('ar-markup').value = r.defaultRicarico || 15;
        document.getElementById('ar-trasporto').value = r.defaultTrasporto || 0;
        document.getElementById('ar-fee').value = r.defaultFee || 0;
    }
}

function deleteRobot(id) {
    const linkedMats = state.materiali.filter(m => m.linkedId === id);
    const linkedLabs = state.manodopera.filter(l => l.linkedId === id);
    
    if (linkedMats.length > 0 || linkedLabs.length > 0) {
        alert(`Attenzione! Non puoi eliminare questo centro di costo perché ci sono ${linkedMats.length} materiali e ${linkedLabs.length} registrazioni ore collegate. Scollegali prima di procedere.`);
        return;
    }

    if (confirm('Sei sicuro di voler eliminare questo centro di costo?')) {
        state.robotCantiere = state.robotCantiere.filter(r => r.id !== id);
        saveState(); renderRobotCantiere();
    }
}

// --- Dashboard Logic ---

function updateDashboardStats() {
    const c = state.commesse.find(x => x.id === state.currentCommessaId);
    if (!c) return;

    document.getElementById('detail-cliente').textContent = c.cliente || '-';
    document.getElementById('detail-km').textContent = (c.kmSede || 0) + ' km';
    document.getElementById('detail-autostrada').textContent = formatCurrency(c.costoAutostrada || 0);
    
    let tagsDisplay = 'Nessuna macchina specificata.';
    if(c.macchineInstallate) {
        tagsDisplay = c.macchineInstallate.split(',').map(t => `<span class="tag">${t.trim()}</span>`).join(' ');
    }
    document.getElementById('detail-note').innerHTML = `<div style="margin-bottom:0.5rem"><strong>Macchine Installate:</strong><br>${tagsDisplay}</div><div style="border-top:1px solid var(--border); padding-top:0.5rem"><strong>Note Generali:</strong><br>${c.note || 'Nessuna nota.'}</div>`;

    const mats = state.materiali.filter(m => m.commessaId === state.currentCommessaId);
    const labs = state.manodopera.filter(l => l.commessaId === state.currentCommessaId);
    const sps = state.spese.filter(s => s.commessaId === state.currentCommessaId);
    const robots = state.robotCantiere.filter(r => r.commessaId === state.currentCommessaId);

    // Calc costs
    const matC = mats.reduce((s, m) => s + (m.qty * m.unitPrice), 0);
    const matS = mats.reduce((s, m) => s + (m.qty * m.unitPrice * (1 + m.markup)), 0);
    const labC = labs.reduce((s, l) => s + (l.totalHours * l.unitPrice), 0);
    const labS = labs.reduce((s, l) => s + (l.totalHours * l.unitPrice * (1 + l.markup)), 0);
    
    // Robots
    const robC = robots.reduce((s, r) => s + r.costoBase + (r.trasporto || 0) + (r.fee || 0), 0);
    const robS = robots.reduce((s, r) => s + (r.costoBase * (1 + r.markup)) + (r.trasporto || 0) + (r.fee || 0), 0);

    // Add travel costs from labor entries
    const ricaricoTrasferte = 1 + ((state.impostazioni.ricaricoTrasferte !== undefined ? state.impostazioni.ricaricoTrasferte : 20) / 100);
    const traC = labs.reduce((s, l) => s + (l.viaggio ? (l.viaggio.costoFurgone || l.viaggio.costoTot || 0) + (l.viaggio.costoOreViaggio || 0) : 0), 0);
    const traS = labs.reduce((s, l) => s + (l.viaggio ? ((l.viaggio.costoFurgone || l.viaggio.costoTot || 0) + (l.viaggio.costoOreViaggio || 0)) * ricaricoTrasferte : 0), 0);

    const speC = sps.reduce((s, x) => s + (x.qty * x.unitPrice), 0);
    const speS = sps.reduce((s, x) => s + (x.qty * x.unitPrice * (1 + x.markup)), 0);

    const totalC = matC + labC + traC + speC + robC;
    const totalS = matS + labS + traS + speS + robS;
    const totalP_sale = totalS - totalC;
    const budget = c.budget || 0;
    
    let utileReale = totalP_sale;
    let isBudgetBased = false;
    
    if (budget > 0) {
        utileReale = budget - totalC;
        isBudgetBased = true;
    }

    document.getElementById('total-site-cost').textContent = formatCurrency(totalC);
    document.getElementById('total-site-sale').textContent = formatCurrency(totalS);
    document.getElementById('total-site-profit').textContent = formatCurrency(utileReale);
    document.getElementById('budget-display').textContent = formatCurrency(budget);
    
    const scostEl = document.getElementById('budget-scostamento');
    if (scostEl) {
        if (budget > 0) {
            const scostamento = budget - totalS;
            const color = scostamento >= 0 ? 'var(--success)' : 'var(--danger)';
            const sign = scostamento >= 0 ? '+' : '';
            scostEl.innerHTML = `Margine Extra (Rispetto a Vendita): <span style="color: ${color}; font-weight: 600;">${sign}${formatCurrency(scostamento)}</span>`;
        } else {
            scostEl.innerHTML = 'Nessun preventivo inserito';
            scostEl.style.color = 'var(--text-muted)';
        }
    }
    
    const subtitleEl = document.getElementById('profit-subtitle');
    if (subtitleEl) {
        subtitleEl.textContent = isBudgetBased ? 'Calcolato su Preventivo Approvato' : 'Calcolato su Valore Lavori (Vendita)';
    }

    const pc = document.getElementById('profit-card');
    if (pc) pc.style.borderColor = utileReale >= 0 ? 'var(--success)' : 'var(--danger)';

    // --- Phase Breakdown logic ---
    const phaseTotals = {};
    const phases = c.fasi || ['Generale'];
    phases.forEach(p => phaseTotals[p] = { costo: 0, vendita: 0 });

    mats.forEach(m => { if(phaseTotals[m.fase || 'Generale']) { phaseTotals[m.fase || 'Generale'].costo += m.qty * m.unitPrice; phaseTotals[m.fase || 'Generale'].vendita += m.qty * m.unitPrice * (1 + m.markup); } });
    labs.forEach(l => { 
        if(phaseTotals[l.fase || 'Generale']) { 
            phaseTotals[l.fase || 'Generale'].costo += l.totalHours * l.unitPrice; 
            phaseTotals[l.fase || 'Generale'].vendita += l.totalHours * l.unitPrice * (1 + l.markup);
            if(l.viaggio) {
                phaseTotals[l.fase || 'Generale'].costo += (l.viaggio.costoFurgone || 0) + (l.viaggio.costoOreViaggio || 0);
                phaseTotals[l.fase || 'Generale'].vendita += ((l.viaggio.costoFurgone || 0) + (l.viaggio.costoOreViaggio || 0)) * ricaricoTrasferte;
            }
        } 
    });
    sps.forEach(s => { if(phaseTotals[s.fase || 'Generale']) { phaseTotals[s.fase || 'Generale'].costo += s.qty * s.unitPrice; phaseTotals[s.fase || 'Generale'].vendita += s.qty * s.unitPrice * (1 + s.markup); } });
    robots.forEach(r => { if(phaseTotals[r.fase || 'Robot']) { phaseTotals[r.fase || 'Robot'].costo += r.costoBase + (r.trasporto || 0) + (r.fee || 0); phaseTotals[r.fase || 'Robot'].vendita += (r.costoBase * (1 + r.markup)) + (r.trasporto || 0) + (r.fee || 0); } });

    renderPhaseBreakdown(phaseTotals);

    initLucide();
    setTimeout(() => renderCharts(matC, labC, traC + speC + robC, totalS, budget, isBudgetBased), 100);
}

function renderPhaseBreakdown(phaseTotals) {
    const container = document.getElementById('dynamic-content');
    if (!container) return;
    
    let html = `
        <div class="panel glass mt-4" id="phase-analysis">
            <header><h2>Analisi per Fasi di Lavoro</h2></header>
            <div class="panel-body">
                <div class="table-container">
                    <table>
                        <thead>
                            <tr><th>Fase</th><th>Costo Totale</th><th>Valore Vendita</th><th>Margine</th><th>% su Totale</th></tr>
                        </thead>
                        <tbody>
    `;

    const totalC = Object.values(phaseTotals).reduce((s, p) => s + p.costo, 0);

    Object.keys(phaseTotals).forEach(p => {
        const data = phaseTotals[p];
        if (data.costo === 0 && data.vendita === 0) return;
        const profit = data.vendita - data.costo;
        const pct = totalC > 0 ? (data.costo / totalC * 100).toFixed(1) : 0;
        html += `
            <tr>
                <td><strong>${p}</strong></td>
                <td>${formatCurrency(data.costo)}</td>
                <td>${formatCurrency(data.vendita)}</td>
                <td style="color: ${profit >= 0 ? 'var(--success)' : 'var(--danger)'}">${formatCurrency(profit)}</td>
                <td><div style="display:flex; align-items:center; gap:8px;">${pct}% <div class="progress-mini"><div class="progress-fill" style="width:${pct}%"></div></div></div></td>
            </tr>
        `;
    });

    html += `</tbody></table></div></div></div>`;
    
    // Inject or append
    const existing = document.getElementById('phase-analysis');
    if (existing) existing.remove();
    
    const dashboard = document.getElementById('dashboard');
    if (dashboard.classList.contains('active')) {
        dashboard.insertAdjacentHTML('beforeend', html);
    }
}

function renderCharts(matC, labC, logisticsC, sale, budget, isBudgetBased = false) {
    const c1 = document.getElementById('main-chart');
    const c2 = document.getElementById('profit-chart');
    if (!c1 || !c2) return;
    if (mainChart) mainChart.destroy();
    if (profitChart) profitChart.destroy();

    mainChart = new Chart(c1.getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Materiali', 'Manodopera', 'Logistica', 'Vendita Tot.', 'Preventivo'],
            datasets: [{ data: [matC, labC, logisticsC, sale, budget], backgroundColor: ['#38bdf8', '#10b981', '#ef4444', '#f59e0b', '#475569'], borderRadius: 8 }]
        },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { grid: { color: '#334155' } } } }
    });

    const totaleCosti = matC + labC + logisticsC;
    const totaleRicavo = isBudgetBased ? budget : sale;
    const utileReale = Math.max(0, totaleRicavo - totaleCosti);

    profitChart = new Chart(c2.getContext('2d'), {
        type: 'doughnut',
        data: { labels: ['Costi', 'Utile'], datasets: [{ data: [totaleCosti, utileReale], backgroundColor: ['#334155', '#10b981'], borderWidth: 0 }] },
        options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: '#f8fafc' } } } }
    });
}

// --- Materiali Tab (Quick Inline) ---

function renderMateriali() {
    const commessa = state.commesse.find(c => c.id === state.currentCommessaId);
    const fasiOptions = (commessa.fasi || ['Generale']).map(f => `<option value="${f}">${f}</option>`).join('');
    const f = state.materiali.filter(m => m.commessaId === state.currentCommessaId);
    document.getElementById('dynamic-content').innerHTML = `
        <section id="materiali" class="tab-content active">
            <datalist id="dl-codici">${state.catalogo.map(c=>`<option value="${c.codice}"></option>`).join('')}</datalist>
            <datalist id="dl-descrizioni">${state.catalogo.map(c=>`<option value="${c.descrizione}"></option>`).join('')}</datalist>
            <div class="panel glass">
                <header>
                    <h2>Materiali Utilizzati</h2>
                    <div id="material-suggestions" style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                        <span style="font-size:0.75rem; color:var(--text-muted); margin-right:8px;">Suggeriti:</span>
                        ${getMaterialSuggestions().map(s => `
                            <button class="btn-suggestion" onclick="quickFillMaterial('${s.codice}')" title="${s.descrizione}">
                                ${s.codice}
                            </button>
                        `).join('')}
                    </div>
                </header>
                <div class="panel-body">
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr><th>Ambito</th><th>Data</th><th>Codice</th><th>Descrizione</th><th>Fornitore</th><th>Q.tà</th><th>Prezzo €</th><th>Ric. %</th><th>Centro di Costo</th><th>Azioni</th></tr>
                                <tr class="quick-add-row">
                                    <td><select id="qa-m-fase" style="max-width:120px">${fasiOptions}</select></td>
                                    <td><input type="date" id="qa-m-data" value="${new Date().toISOString().split('T')[0]}"></td>
                                    <td><input type="text" id="qa-m-codice" placeholder="Codice" list="dl-codici" oninput="onItemSelectInlineCodice(this.value)"></td>
                                    <td><input type="text" id="qa-m-desc" placeholder="Descrizione" list="dl-descrizioni" oninput="onItemSelectInlineDesc(this.value)"></td>
                                    <td><input type="text" id="qa-m-forn" placeholder="Fornitore" disabled></td>
                                    <td><input type="number" id="qa-m-qty" placeholder="Q.tà" step="0.01"></td>
                                    <td><input type="number" id="qa-m-price" placeholder="Prezzo" step="0.01"></td>
                                    <td><input type="number" id="qa-m-markup" value="${state.impostazioni.ricaricoMateriali !== undefined ? state.impostazioni.ricaricoMateriali : 25}" step="1" title="Ricarico personalizzato per questo articolo"></td>
                                    <td>
                                        <select id="qa-m-link" style="max-width:150px" onchange="autoSelectAmbitoM(this.value)">
                                            <option value="">-- Generale --</option>
                                            ${state.robotCantiere.filter(r => r.commessaId === state.currentCommessaId).map(r => `<option value="${r.id}">🤖 ${r.modello}</option>`).join('')}
                                        </select>
                                    </td>
                                    <td><button class="btn-add-inline" onclick="addMaterialInline()"><i data-lucide="plus"></i></button></td>
                                </tr>
                            </thead>
                            <tbody>
                                ${f.map(m=>{
                                    const linkedRobot = m.linkedId ? state.robotCantiere.find(r => r.id === m.linkedId) : null;
                                    return `<tr>
                                        <td><span class="tag-ambito">${m.linkedId ? '🤖 Robot' : '🏠 ' + (m.fase || 'Gen')}</span></td>
                                        <td>${formatDateIT(m.data)}</td>
                                        <td>${m.codice}</td>
                                        <td>${m.descrizione}</td>
                                        <td>${m.fornitore || '-'}</td>
                                        <td>${m.qty} ${m.um}</td>
                                        <td>${formatCurrency(m.unitPrice)}</td>
                                        <td>${m.markup * 100}%</td>
                                        <td>${linkedRobot ? `<span class="tag-linked"><i data-lucide="cpu" style="width:12px;height:12px"></i> ${linkedRobot.modello}</span>` : '-'}</td>
                                        <td class="actions-cell"><button class="btn-danger btn-small" onclick="deleteMaterial('${m.id}')">Elimina</button></td>
                                    </tr>`;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </section>
    `;
    initLucide();
}

function addMaterialInline() {
    const fase = document.getElementById('qa-m-fase') ? document.getElementById('qa-m-fase').value : 'Generale';
    const d = document.getElementById('qa-m-data').value;
    const c = document.getElementById('qa-m-codice').value;
    const desc = document.getElementById('qa-m-desc').value;
    const forn = document.getElementById('qa-m-forn') ? document.getElementById('qa-m-forn').value : '';
    const q = parseFloat(document.getElementById('qa-m-qty').value);
    const p = parseFloat(document.getElementById('qa-m-price').value);
    const markupPct = parseFloat(document.getElementById('qa-m-markup').value) || 0;
    const markupVal = markupPct / 100;
    const linkedId = document.getElementById('qa-m-link').value || null;
    if (!desc || isNaN(q)) return;

    // Recupera l'UM dal catalogo se esiste, altrimenti usa 'pz'
    const catItem = state.catalogo.find(x => x.codice === c || x.descrizione === desc);
    const um = catItem ? (catItem.um || 'pz') : 'pz';

    state.materiali.push({ id: Date.now().toString(), commessaId: state.currentCommessaId, fase: fase, data: d, codice: c, descrizione: desc, fornitore: forn, qty: q, um: um, unitPrice: p, markup: markupVal, linkedId: linkedId });
    saveState(); renderMateriali();
}

// --- Manodopera Tab (Quick Inline + Viaggio) ---

function renderManodopera() {
    const f = state.manodopera.filter(l => l.commessaId === state.currentCommessaId);
    const comm = state.commesse.find(x => x.id === state.currentCommessaId);

    document.getElementById('dynamic-content').innerHTML = `
        <section id="manodopera" class="tab-content active">
            <div class="panel glass">
                <header><h2>Registro Ore e Trasferte</h2></header>
                <div class="panel-body">
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr><th>Ambito</th><th>Data</th><th>Descrizione</th><th>Pers.</th><th>Ore/P</th><th>Viaggio?</th><th>Furgone</th><th>Centro di Costo</th><th>Azioni</th></tr>
                                <tr class="quick-add-row">
                                    <td><select id="qa-l-fase" style="max-width:120px">${(comm.fasi || ['Generale']).map(f => `<option value="${f}">${f}</option>`).join('')}</select></td>
                                    <td><input type="date" id="qa-l-data" value="${new Date().toISOString().split('T')[0]}"></td>
                                    <td><input type="text" id="qa-l-desc" placeholder="es. Montaggio"></td>
                                    <td><input type="number" id="qa-l-people" value="1"></td>
                                    <td><input type="number" id="qa-l-hours" value="8" step="0.5"></td>
                                    <td style="text-align:center"><input type="checkbox" id="qa-l-travel" checked style="width:20px"></td>
                                    <td>
                                        <select id="qa-l-van" style="max-width:120px">
                                            ${state.impostazioni.furgoni.map(f => `<option value="${f.id}">${f.nome}</option>`).join('')}
                                        </select>
                                    </td>
                                    <td>
                                        <select id="qa-l-link" style="max-width:120px" onchange="autoSelectAmbitoL(this.value)">
                                            <option value="">-- Generale --</option>
                                            ${state.robotCantiere.filter(r => r.commessaId === state.currentCommessaId).map(r => `<option value="${r.id}">🤖 ${r.modello}</option>`).join('')}
                                        </select>
                                    </td>
                                    <td><button class="btn-add-inline" onclick="addLaborInline()"><i data-lucide="plus"></i></button></td>
                                </tr>
                            </thead>
                            <tbody>
                                ${f.map(l=>{
                                    const linkedRobot = l.linkedId ? state.robotCantiere.find(r => r.id === l.linkedId) : null;
                                    return `<tr>
                                        <td><span class="tag-ambito">${l.linkedId ? '🤖 Robot' : '🏠 ' + (l.fase || 'Gen')}</span></td>
                                        <td>${formatDateIT(l.data)}</td>
                                        <td>${l.descrizione}</td>
                                        <td>${l.numPersone}</td>
                                        <td>${l.oreUnit}</td>
                                        <td>${l.viaggio ? 'SÌ' : 'NO'}</td>
                                        <td>${l.viaggio ? state.impostazioni.furgoni.find(x=>x.id===l.viaggio.furgoneId)?.nome || l.viaggio.furgone : '-'}</td>
                                        <td>${linkedRobot ? `<span class="tag-linked"><i data-lucide="cpu" style="width:12px;height:12px"></i> ${linkedRobot.modello}</span>` : '-'}</td>
                                        <td class="actions-cell"><button class="btn-danger btn-small" onclick="deleteLabor('${l.id}')">Elimina</button></td>
                                    </tr>`;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </section>
    `;
    initLucide();
}

function addLaborInline() {
    const fase = document.getElementById('qa-l-fase').value;
    const d = document.getElementById('qa-l-data').value;
    const desc = document.getElementById('qa-l-desc').value;
    const p = parseInt(document.getElementById('qa-l-people').value);
    const h = parseFloat(document.getElementById('qa-l-hours').value);
    const tra = document.getElementById('qa-l-travel').checked;
    const vanId = document.getElementById('qa-l-van').value;
    const linkedId = document.getElementById('qa-l-link').value || null;
    if (!desc || isNaN(h)) return;

    const c = state.commesse.find(x => x.id === state.currentCommessaId);
    let viaggio = null;
    if (tra && vanId) {
        const furgone = state.impostazioni.furgoni.find(x => x.id === vanId);
        const costoFurgone = furgone ? (c.kmSede * 2 * furgone.costoKm) + c.costoAutostrada : 0;
        const costoOreViaggio = p * (c.oreViaggio || 0) * (state.impostazioni.costoOrarioViaggio || 20);
        viaggio = { furgoneId: vanId, furgone: furgone?.nome || '-', costoFurgone: costoFurgone, costoOreViaggio: costoOreViaggio };
    }

    const cManodopera = state.impostazioni.costoOrarioManodopera !== undefined ? state.impostazioni.costoOrarioManodopera : 30;
    const rManodopera = (state.impostazioni.ricaricoManodopera !== undefined ? state.impostazioni.ricaricoManodopera : 50) / 100;

    state.manodopera.push({
        id: Date.now().toString(), commessaId: state.currentCommessaId, fase: fase, data: d, descrizione: desc, numPersone: p, oreUnit: h, totalHours: p * h, unitPrice: cManodopera, markup: rManodopera, viaggio, linkedId
    });
    saveState(); renderManodopera();
}

// --- Algoritmi e Utility Contabilità ---

function getMaterialSuggestions() {
    const counts = {};
    state.materiali.forEach(m => {
        if (m.codice) counts[m.codice] = (counts[m.codice] || 0) + 1;
    });
    return Object.keys(counts)
        .sort((a, b) => counts[b] - counts[a])
        .slice(0, 8)
        .map(code => state.catalogo.find(c => c.codice === code))
        .filter(x => x);
}
// --- Automazioni Intuitive ---

function autoSelectAmbitoM(robotId) {
    const faseSelect = document.getElementById('qa-m-fase');
    if (robotId) {
        // Se c'è un robot, forziamo l'ambito su un valore tecnico o creiamolo se non esiste
        if (![...faseSelect.options].some(o => o.value === 'Macchinari')) {
            const opt = document.createElement('option');
            opt.value = opt.text = 'Macchinari';
            faseSelect.add(opt);
        }
        faseSelect.value = 'Macchinari';
        faseSelect.style.opacity = '0.5';
        faseSelect.disabled = true;
    } else {
        faseSelect.disabled = false;
        faseSelect.style.opacity = '1';
        faseSelect.value = 'Generale';
    }
}

function autoSelectAmbitoL(robotId) {
    const faseSelect = document.getElementById('qa-l-fase');
    if (robotId) {
        if (![...faseSelect.options].some(o => o.value === 'Macchinari')) {
            const opt = document.createElement('option');
            opt.value = opt.text = 'Macchinari';
            faseSelect.add(opt);
        }
        faseSelect.value = 'Macchinari';
        faseSelect.disabled = true;
    } else {
        faseSelect.disabled = false;
        faseSelect.value = 'Generale';
    }
}

function quickFillMaterial(codice) {
    const item = state.catalogo.find(x => x.codice === codice);
    if (!item) return;
    
    document.getElementById('qa-m-codice').value = item.codice;
    document.getElementById('qa-m-desc').value = item.descrizione;
    document.getElementById('qa-m-forn').value = item.fornitore || '';
    document.getElementById('qa-m-price').value = item.prezzoAcquisto || 0;
    
    // Focus on Qty to let user type it immediately
    document.getElementById('qa-m-qty').focus();
}

// --- Other Tabs ---

function renderSpese() {
    const f = state.spese.filter(s => s.commessaId === state.currentCommessaId);
    document.getElementById('dynamic-content').innerHTML = `<section id="spese" class="tab-content active"><div class="panel glass"><header><h2>Spese Extra (Pasti, Hotel)</h2><button class="btn-primary" onclick="showSpeseModal()">+ Aggiungi Spesa</button></header><div class="panel-body"><div class="table-container"><table><thead><tr><th>Fase</th><th>Data</th><th>Tipo</th><th>Descrizione</th><th>Costo</th><th>Azioni</th></tr></thead><tbody>${f.map(s=>`<tr><td><span class="tag" style="background:rgba(255,255,255,0.1);color:var(--text-main);">${s.fase || 'Generale'}</span></td><td>${formatDateIT(s.data)}</td><td>${s.tipo}</td><td>${s.descrizione}</td><td>${formatCurrency(s.qty*s.unitPrice)}</td><td class="actions-cell"><button class="btn-danger btn-small" onclick="deleteSpesa('${s.id}')">Elimina</button></td></tr>`).join('')}</tbody></table></div></div></div></section>`;
    initLucide();
}

function renderCatalogo() {
    const query = document.getElementById('cat-search') ? document.getElementById('cat-search').value.toLowerCase() : '';
    const filteredCatalogo = state.catalogo.filter(i => 
        i.codice.toLowerCase().includes(query) || 
        i.descrizione.toLowerCase().includes(query) || 
        (i.fornitore && i.fornitore.toLowerCase().includes(query))
    );

    document.getElementById('dynamic-content').innerHTML = `
        <section id="catalogo" class="tab-content active">
            <div class="tabs-container" style="margin-bottom: 1.5rem;">
                <button class="tab-link active" onclick="renderCatalogo()">Articoli e Materiali</button>
                <button class="tab-link" onclick="renderCatalogoMacchinari()">Catalogo Macchinari</button>
            </div>
            
            <div class="panel glass">
                <header>
                    <h2>Anagrafica Articoli</h2>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <input type="text" id="cat-search" placeholder="Cerca..." value="${query}" oninput="renderCatalogo()" style="max-width: 250px;">
                        <button class="btn-primary" onclick="showAddItemModal()">+ Nuovo</button>
                        <button class="btn-secondary" onclick="document.getElementById('csv-import').click()">Importa</button>
                        <input type="file" id="csv-import" style="display:none" onchange="importCatalog(event)">
                    </div>
                </header>
                <div class="panel-body">
                    <div class="table-container">
                        <table>
                            <thead><tr><th>Codice</th><th>Descrizione</th><th>UM</th><th>Fornitore</th><th>Prezzo</th><th>Ricarico %</th><th>Note</th><th>Azioni</th></tr></thead>
                            <tbody>${filteredCatalogo.map(i=>`<tr><td><strong>${i.codice}</strong></td><td>${i.descrizione}</td><td>${i.um || 'pz'}</td><td>${i.fornitore || '-'}</td><td>${formatCurrency(i.prezzo)}</td><td>${i.markup !== undefined ? i.markup + '%' : '-'}</td><td>${i.note || '-'}</td><td class="actions-cell"><button class="btn-secondary btn-small" style="margin-right:4px;" onclick="editItem('${i.codice}')">Modifica</button><button class="btn-danger btn-small" onclick="deleteItem('${i.codice}')">Elimina</button></td></tr>`).join('')}</tbody>
                        </table>
                    </div>
                </div>
            </div>
        </section>`;
        
    if (query) {
        const s = document.getElementById('cat-search');
        s.focus();
        const val = s.value; s.value = ''; s.value = val;
    }
    initLucide();
}

// --- Modals ---

function editCommessaDetails() {
    const c = state.commesse.find(x => x.id === state.currentCommessaId);
    const html = `
        <form id="details-form">
            <div class="form-group"><label>Nome Commessa</label><input type="text" id="d-nome" value="${c.nome||''}"></div>
            <div class="form-group">
                <label>Cliente</label>
                <div style="display:flex; gap:8px;">
                    <select id="d-cliente-id" style="flex:1">
                        <option value="">-- Seleziona Cliente --</option>
                        ${state.clienti.map(cl => `<option value="${cl.id}" ${c.clienteId === cl.id ? 'selected' : ''}>${cl.nome}</option>`).join('')}
                    </select>
                    <button type="button" class="btn-secondary btn-small" onclick="showAddClientModal(() => editCommessaDetails())" title="Aggiungi nuovo cliente"><i data-lucide="user-plus"></i></button>
                </div>
            </div>
            <div class="grid-2">
                <div class="form-group"><label>Km dalla Sede (Solo Andata)</label><input type="number" id="d-km" value="${c.kmSede||0}"></div>
                <div class="form-group"><label>Tempo di viaggio A/R (ore)</label><input type="number" id="d-ore" value="${c.oreViaggio||1}" step="0.25"></div>
            </div>
            <div class="grid-2">
                <div class="form-group"><label>Costo Autostrada A/R (€)</label><input type="number" id="d-auto" value="${c.costoAutostrada||0}" step="0.01"></div>
                <div class="form-group"><label>Macchine Installate</label><input type="text" id="d-macchine" value="${c.macchineInstallate||''}" placeholder="Es: Pompa 1"></div>
            </div>
            <div class="form-group"><label>Fasi di Lavoro (Separate da virgola)</label><input type="text" id="d-fasi" value="${(c.fasi || ['Generale']).join(', ')}" placeholder="Es: Generale, Impianto Elettrico, Robot"></div>
            <div class="form-group"><label>Note</label><textarea id="d-note" rows="3">${c.note||''}</textarea></div>
            <div class="text-right mt-4"><button type="button" class="btn-secondary" onclick="hideModal()">Annulla</button><button type="submit" class="btn-primary">Salva</button></div>
        </form>
    `;
    showModal('Impostazioni Commessa', html);
    document.getElementById('details-form').onsubmit = (e) => {
        e.preventDefault();
        c.nome = document.getElementById('d-nome').value;
        const clientId = document.getElementById('d-cliente-id').value;
        if (clientId) {
            const cl = state.clienti.find(x => x.id === clientId);
            c.clienteId = cl.id;
            c.cliente = cl.nome;
        } else {
            c.clienteId = null;
            c.cliente = '';
        }
        c.kmSede = parseFloat(document.getElementById('d-km').value);
        c.oreViaggio = parseFloat(document.getElementById('d-ore').value);
        c.costoAutostrada = parseFloat(document.getElementById('d-auto').value);
        c.macchineInstallate = document.getElementById('d-macchine').value;
        const fasiRaw = document.getElementById('d-fasi').value;
        c.fasi = fasiRaw.split(',').map(x => x.trim()).filter(x => x);
        if(c.fasi.length === 0) c.fasi = ['Generale'];
        c.note = document.getElementById('d-note').value;
        saveState(); hideModal(); renderApp();
    };
}

// --- Utils ---
function formatDateIT(dStr) { if(!dStr) return ''; const parts = dStr.split('-'); if(parts.length!==3) return dStr; return `${parts[2]}/${parts[1]}/${parts[0]}`; }
function formatCurrency(v) { return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(v); }
function formatNumber(v) { return new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2 }).format(v); }
function showModal(t, c) { document.getElementById('modal-title').textContent=t; document.getElementById('modal-content').innerHTML=c; document.getElementById('modal-container').classList.add('active'); initLucide(); }
function hideModal() { document.getElementById('modal-container').classList.remove('active'); }
function showPromptModal(t, m, c, d='') { const h=`<div class="form-group"><label>${m}</label><input type="text" id="prompt-input" value="${d}"></div><div class="text-right"><button class="btn-secondary" onclick="hideModal()">Annulla</button><button class="btn-primary" id="prompt-confirm">OK</button></div>`; showModal(t, h); document.getElementById('prompt-confirm').onclick=()=>{ c(document.getElementById('prompt-input').value); hideModal(); }; }
function onItemSelectInlineCodice(val) { const i=state.catalogo.find(x=>x.codice===val); if(i){ document.getElementById('qa-m-desc').value=i.descrizione; document.getElementById('qa-m-price').value=i.prezzo; if(document.getElementById('qa-m-forn')) document.getElementById('qa-m-forn').value=i.fornitore||''; if(document.getElementById('qa-m-markup')) document.getElementById('qa-m-markup').value=i.markup!==undefined?i.markup:(state.impostazioni.ricaricoMateriali!==undefined?state.impostazioni.ricaricoMateriali:25); } }
function onItemSelectInlineDesc(val) { const i=state.catalogo.find(x=>x.descrizione===val); if(i){ document.getElementById('qa-m-codice').value=i.codice; document.getElementById('qa-m-price').value=i.prezzo; if(document.getElementById('qa-m-forn')) document.getElementById('qa-m-forn').value=i.fornitore||''; if(document.getElementById('qa-m-markup')) document.getElementById('qa-m-markup').value=i.markup!==undefined?i.markup:(state.impostazioni.ricaricoMateriali!==undefined?state.impostazioni.ricaricoMateriali:25); } }
function deleteMaterial(id) { state.materiali=state.materiali.filter(m=>m.id!==id); saveState(); renderMateriali(); }
function deleteLabor(id) { state.manodopera=state.manodopera.filter(l=>l.id!==id); saveState(); renderManodopera(); }
function deleteSpesa(id) { state.spese=state.spese.filter(s=>s.id!==id); saveState(); renderSpese(); }
function deleteItem(c) { state.catalogo=state.catalogo.filter(i=>i.codice!==c); saveState(); renderCatalogo(); }

function showAddItemModal() {
    const html = `
        <form id="add-item-form">
            <div class="form-group"><label>Codice *</label><input type="text" id="ai-codice" required></div>
            <div class="form-group"><label>Descrizione *</label><input type="text" id="ai-desc" required></div>
            <div class="grid-2">
                <div class="form-group"><label>UM</label><input type="text" id="ai-um" value="pz"></div>
                <div class="form-group"><label>Prezzo (€) *</label><input type="number" id="ai-price" step="0.01" required></div>
            </div>
            <div class="grid-2">
                <div class="form-group"><label>Fornitore</label><input type="text" id="ai-forn"></div>
                <div class="form-group"><label>Ricarico % (Vuoto = usa Default Aziendale)</label><input type="number" id="ai-markup" step="1"></div>
            </div>
            <div class="form-group"><label>Note</label><input type="text" id="ai-note"></div>
            <div class="text-right mt-4"><button type="button" class="btn-secondary" onclick="hideModal()">Annulla</button><button type="submit" class="btn-primary">Aggiungi</button></div>
        </form>
    `;
    showModal('Nuovo Articolo', html);
    document.getElementById('add-item-form').onsubmit = (e) => {
        e.preventDefault();
        const codice = document.getElementById('ai-codice').value.trim();
        if(state.catalogo.find(i => i.codice === codice)) {
            alert('Un articolo con questo codice esiste già!');
            return;
        }
        const mkp = document.getElementById('ai-markup').value;
        state.catalogo.push({
            codice: codice,
            descrizione: document.getElementById('ai-desc').value,
            um: document.getElementById('ai-um').value,
            prezzo: parseFloat(document.getElementById('ai-price').value),
            fornitore: document.getElementById('ai-forn').value,
            markup: mkp === '' ? undefined : parseFloat(mkp),
            note: document.getElementById('ai-note').value
        });
        saveState();
        hideModal();
        renderCatalogo();
    };
}

function editItem(codice) {
    const item = state.catalogo.find(i => i.codice === codice);
    if (!item) return;

    const html = `
        <form id="edit-item-form">
            <div class="form-group"><label>Codice (Non modificabile)</label><input type="text" value="${item.codice}" disabled></div>
            <div class="form-group"><label>Descrizione</label><input type="text" id="ei-desc" value="${item.descrizione || ''}"></div>
            <div class="grid-2">
                <div class="form-group"><label>UM</label><input type="text" id="ei-um" value="${item.um || 'pz'}"></div>
                <div class="form-group"><label>Prezzo (€)</label><input type="number" id="ei-price" value="${item.prezzo}" step="0.01"></div>
            </div>
            <div class="grid-2">
                <div class="form-group"><label>Fornitore</label><input type="text" id="ei-forn" value="${item.fornitore || ''}"></div>
                <div class="form-group"><label>Ricarico % (Vuoto = usa Default Aziendale)</label><input type="number" id="ei-markup" value="${item.markup !== undefined ? item.markup : ''}" step="1"></div>
            </div>
            <div class="form-group"><label>Note</label><input type="text" id="ei-note" value="${item.note || ''}"></div>
            <div class="text-right mt-4"><button type="button" class="btn-secondary" onclick="hideModal()">Annulla</button><button type="submit" class="btn-primary">Salva Modifiche</button></div>
        </form>
    `;
    showModal('Modifica Articolo', html);
    document.getElementById('edit-item-form').onsubmit = (e) => {
        e.preventDefault();
        item.descrizione = document.getElementById('ei-desc').value;
        item.um = document.getElementById('ei-um').value;
        item.prezzo = parseFloat(document.getElementById('ei-price').value);
        item.fornitore = document.getElementById('ei-forn').value;
        
        const mkp = document.getElementById('ei-markup').value;
        item.markup = mkp === '' ? undefined : parseFloat(mkp);

        item.note = document.getElementById('ei-note').value;
        saveState();
        hideModal();
        renderCatalogo();
    };
}

function editBudget() { const c = state.commesse.find(x=>x.id===state.currentCommessaId); showPromptModal('Budget', 'Importo preventivo (€):', (v)=>{ c.budget=parseFloat(v); saveState(); updateDashboardStats(); }, c.budget||0); }
function exportToExcel() {
    const c = state.commesse.find(x => x.id === state.currentCommessaId);
    if (!c) return;

    let csv = "Ambito;Data;Codice;Descrizione;Quantita;Prezzo Unit.;Totale Costo;Prezzo Vendita\n";
    
    // Materiali
    state.materiali.filter(m => m.commessaId === c.id).forEach(m => {
        const costo = m.qty * m.unitPrice;
        const vendita = costo * (1 + m.markup);
        csv += `${m.fase};${m.data};${m.codice};${m.descrizione};${m.qty};${m.unitPrice};${costo};${vendita}\n`;
    });
    
    // Manodopera
    state.manodopera.filter(l => l.commessaId === c.id).forEach(l => {
        const costo = l.totalHours * l.unitPrice;
        const vendita = costo * (1 + l.markup);
        csv += `${l.fase};${l.data};-;ORE: ${l.descrizione};${l.totalHours};${l.unitPrice};${costo};${vendita}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Contabilita_${c.nome.replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
function exportToPDF(t) { document.body.classList.add('printing-'+t); window.print(); document.body.classList.remove('printing-'+t); }
function importCatalog(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target.result;
        // Gestisci tutti i tipi di ritorni a capo (\r\n, \n, \r)
        const lines = text.split(/\r?\n|\r/).filter(line => line.trim() !== '');
        if (lines.length < 2) {
            alert('Il file CSV è vuoto o non ha dati validi.');
            return;
        }

        // Rimuovi eventuale BOM all'inizio del file
        const firstLine = lines[0].replace(/^\uFEFF/, '');
        
        // Rileva separatore (punto e virgola, tab o virgola)
        let separator = ',';
        if (firstLine.includes(';')) separator = ';';
        else if (firstLine.includes('\t')) separator = '\t';

        // Parse headers to find indexes, rimuovendo le virgolette
        const headers = firstLine.split(separator).map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
        const codIdx = headers.indexOf('codice');
        const descIdx = headers.indexOf('descrizione');
        const priceIdx = headers.findIndex(h => h === 'prezzo' || h.includes('prezzo') || h === 'unitario' || h.includes('unitario'));
        const umIdx = headers.findIndex(h => h === 'um' || h === 'unità di misura' || h === 'unita di misura');
        const fornIdx = headers.findIndex(h => h === 'fornitore' || h.includes('fornitore'));
        const noteIdx = headers.findIndex(h => h === 'note' || h === 'nota');

        if (codIdx === -1 || descIdx === -1 || priceIdx === -1) {
            alert(`Il file CSV deve contenere le colonne obbligatorie: Codice, Descrizione, Prezzo.\n\nColonne trovate nel tuo file:\n[${headers.join('] [')}]`);
            return;
        }

        let importedCount = 0;
        for (let i = 1; i < lines.length; i++) {
            const columns = lines[i].split(separator).map(c => c.trim().replace(/^["']|["']$/g, ''));
            if (columns.length <= Math.max(codIdx, descIdx, priceIdx)) continue;

            const codice = columns[codIdx];
            const descrizione = columns[descIdx];
            // Pulisci il prezzo da simboli euro, spazi e sostituisci virgola con punto
            const prezzoStr = columns[priceIdx].replace(/[€$]/g, '').replace(/\s/g, '').replace(',', '.');
            const prezzo = parseFloat(prezzoStr);
            const um = umIdx !== -1 && columns[umIdx] ? columns[umIdx] : 'pz';
            const fornitore = fornIdx !== -1 && columns[fornIdx] ? columns[fornIdx] : '';
            const note = noteIdx !== -1 && columns[noteIdx] ? columns[noteIdx] : '';

            if (codice && !isNaN(prezzo)) {
                // Rimuovi eventuale vecchio articolo con stesso codice
                state.catalogo = state.catalogo.filter(item => item.codice !== codice);
                
                state.catalogo.push({
                    codice: codice,
                    descrizione: descrizione,
                    um: um,
                    fornitore: fornitore,
                    prezzo: prezzo,
                    note: note
                });
                importedCount++;
            }
        }

        saveState();
        renderCatalogo();
        alert(`Importazione completata: ${importedCount} articoli importati.`);
    };
    // Specifica UTF-8 per evitare problemi di codifica con lettere accentate e BOM
    reader.readAsText(file, 'UTF-8');
    event.target.value = ''; // Reset input
}
function showSpeseModal() {
    const c = state.commesse.find(x => x.id === state.currentCommessaId);
    const fasiOptions = (c.fasi || ['Generale']).map(f => `<option value="${f}">${f}</option>`).join('');
    const html = `<form id="spese-form">
        <div class="form-group"><label>Fase</label><select id="s-fase">${fasiOptions}</select></div>
        <div class="form-group"><label>Data</label><input type="date" id="s-data" value="${new Date().toISOString().split('T')[0]}"></div>
        <div class="form-group"><label>Tipo</label><input type="text" id="s-tipo" placeholder="Pasto, Hotel, ecc."></div>
        <div class="form-group"><label>Descrizione</label><input type="text" id="s-desc"></div>
        <div class="form-group"><label>Importo (€)</label><input type="number" id="s-price" step="0.01"></div>
        <div class="text-right mt-4"><button type="button" class="btn-secondary" onclick="hideModal()">Annulla</button><button type="submit" class="btn-primary">Aggiungi</button></div>
    </form>`;
    showModal('Spesa Extra', html);
    document.getElementById('spese-form').onsubmit=(e)=>{ 
        e.preventDefault(); 
        state.spese.push({
            id:Date.now().toString(), 
            commessaId:state.currentCommessaId, 
            fase: document.getElementById('s-fase').value,
            data:document.getElementById('s-data').value, 
            tipo:document.getElementById('s-tipo').value, 
            descrizione:document.getElementById('s-desc').value, 
            qty:1, 
            unitPrice:parseFloat(document.getElementById('s-price').value), 
            markup:0
        }); 
        saveState(); hideModal(); renderSpese(); 
    };
}

function showImpostazioniGlobali() {
    const html = `
        <div class="tabs-simple" style="display:flex; gap:10px; margin-bottom:1.5rem; border-bottom:1px solid var(--border); padding-bottom:10px;">
            <button class="btn-tab active" onclick="showSetTab(event, 'impostazioni-generali')">Generali</button>
            <button class="btn-tab" onclick="showSetTab(event, 'impostazioni-sicurezza')">Sicurezza & Backup</button>
        </div>
        
        <div id="impostazioni-generali" class="settings-panel active">
            <div class="grid-2">
                <div class="form-group"><label>Costo Orario Manodopera (€/h)</label><input type="number" id="g-costo-mano" value="${state.impostazioni.costoOrarioManodopera || 30}" step="0.5"></div>
                <div class="form-group"><label>Ricarico Manodopera (%)</label><input type="number" id="g-ric-mano" value="${state.impostazioni.ricaricoManodopera || 50}"></div>
                <div class="form-group"><label>Ricarico Materiali (%)</label><input type="number" id="g-ric-mat" value="${state.impostazioni.ricaricoMateriali || 25}"></div>
                <div class="form-group"><label>Ricarico Trasferte (%)</label><input type="number" id="g-ric-tra" value="${state.impostazioni.ricaricoTrasferte || 20}"></div>
            </div>
            <h3 class="mt-4">Furgoni Aziendali</h3>
            <div class="table-container mb-4">
                <table>
                    <thead><tr><th>Nome</th><th>Costo €/Km</th><th>Azioni</th></tr></thead>
                    <tbody id="furgoni-list">
                        ${(state.impostazioni.furgoni || []).map(f => `<tr><td>${f.nome}</td><td>${formatNumber(f.costoKm)}</td><td><button class="btn-danger btn-small" onclick="deleteFurgone('${f.id}')">Elimina</button></td></tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div id="impostazioni-sicurezza" class="settings-panel" style="display:none;">
            <h3>Categorie Centri di Costo</h3>
            <div id="ccc-list" class="mb-4">
                ${(state.impostazioni.categorieCC || []).map(cat => `
                    <div class="glass" style="display:flex; justify-content:space-between; padding:8px 12px; margin-bottom:5px; border-radius:6px;">
                        <span>${cat}</span>
                        <button class="btn-danger btn-small" onclick="deleteCategoryCC('${cat}')">Elimina</button>
                    </div>
                `).join('')}
            </div>
            <div style="display:flex; gap:10px;">
                <input type="text" id="new-ccc-name" placeholder="Nuova categoria (es. Impianto Elettrico)">
                <button class="btn-primary" onclick="addCategoryCC()">Aggiungi</button>
            </div>
            
            <hr style="margin:2rem 0; opacity:0.1;">
            <h3>Protezione Dati</h3>
            <div class="form-group">
                <label>Nuova Master Password</label>
                <input type="password" id="set-new-password" placeholder="Lascia vuoto per non cambiare">
                <p style="font-size:0.7rem; color:var(--text-muted); margin-top:5px;">La password protegge l'accesso ai dati sensibili all'avvio.</p>
            </div>
            
            <hr style="margin:1.5rem 0; opacity:0.1;">
            <h3>Backup Database</h3>
            <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:1rem;">Esporta l'intero archivio (Clienti, Cantieri, Cataloghi) per sicurezza o per spostarlo su un altro PC.</p>
            <div style="display:flex; gap:10px;">
                <button class="btn-primary" onclick="backupFullData()"><i data-lucide="download"></i> Scarica Backup (.json)</button>
                <label class="btn-secondary" style="cursor:pointer; display:flex; align-items:center; gap:8px;">
                    <i data-lucide="upload"></i> Ripristina Backup <input type="file" id="restore-file" style="display:none;" onchange="restoreFullData(event)">
                </label>
            </div>
        </div>

        <div class="text-right mt-4" style="border-top:1px solid var(--border); padding-top:1.5rem;">
            <button class="btn-primary" onclick="salvaImpostazioniGlobali()">Salva Tutte le Impostazioni</button>
        </div>
    `;
    showModal('Impostazioni e Sicurezza', html);
}

function addFurgone() {
    const n = document.getElementById('n-furgone-nome').value;
    const t = document.getElementById('n-furgone-targa').value;
    const c = parseFloat(document.getElementById('n-furgone-costo').value);
    if (!n || isNaN(c)) return;
    state.impostazioni.furgoni.push({ id: 'f'+Date.now(), nome: n, targa: t, costoKm: c });
    saveState(); showImpostazioniGlobali();
}

function deleteFurgone(id) {
    state.impostazioni.furgoni = state.impostazioni.furgoni.filter(f => f.id !== id);
    saveState(); showImpostazioniGlobali();
}

async function salvaImpostazioniGlobali() {
    state.impostazioni.costoOrarioManodopera = parseFloat(document.getElementById('g-costo-mano').value);
    state.impostazioni.ricaricoManodopera = parseFloat(document.getElementById('g-ric-mano').value);
    state.impostazioni.ricaricoMateriali = parseFloat(document.getElementById('g-ric-mat').value);
    state.impostazioni.ricaricoTrasferte = parseFloat(document.getElementById('g-ric-tra').value);
    
    const newPass = document.getElementById('set-new-password').value;
    if (newPass) {
        state.masterPasswordHash = await hashPassword(newPass);
        localStorage.setItem('bresanu_password_hash', state.masterPasswordHash);
        alert('Master Password impostata correttamente. Al prossimo avvio sarà necessaria per accedere.');
    }

    saveState();
    hideModal();
    renderApp();
}

// --- Gestione Catalogo Centri di Costo ---

function renderCatalogoMacchinari() {
    document.getElementById('dynamic-content').innerHTML = `
        <section id="catalogo-macchinari" class="tab-content active">
            <div class="tabs-container" style="margin-bottom: 1.5rem;">
                <button class="tab-link" onclick="renderCatalogo()">Articoli e Materiali</button>
                <button class="tab-link active" onclick="renderCatalogoMacchinari()">Catalogo Centri di Costo</button>
            </div>
            
            <div class="panel glass">
                <header>
                    <h2>Catalogo Tipologie / Modelli</h2>
                    <button class="btn-primary" onclick="showAddRobotCatalogModal()">+ Nuova Tipologia</button>
                </header>
                <div class="panel-body">
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr><th>Marca</th><th>Modello</th><th>Costo Base</th><th>Fee Montaggio</th><th>Trasporto</th><th>Ricarico %</th><th>Azioni</th></tr>
                            </thead>
                            <tbody>
                                ${state.catalogoRobot.length === 0 ? '<tr><td colspan="7" style="text-align:center; padding:2rem;">Nessun macchinario in catalogo.</td></tr>' : ''}
                                ${state.catalogoRobot.map(r => `
                                    <tr>
                                        <td><strong>${r.marca}</strong></td>
                                        <td>${r.modello}</td>
                                        <td>${formatCurrency(r.costoBase)}</td>
                                        <td>${formatCurrency(r.defaultFee)}</td>
                                        <td>${formatCurrency(r.defaultTrasporto)}</td>
                                        <td>${r.defaultRicarico}%</td>
                                        <td class="actions-cell">
                                            <button class="btn-secondary btn-small" onclick="editRobotCatalog('${r.id}')">Modifica</button>
                                            <button class="btn-danger btn-small" onclick="deleteRobotCatalog('${r.id}')">Elimina</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </section>
    `;
    initLucide();
}

function showAddRobotCatalogModal() {
    const html = `
        <form id="add-robot-cat-form">
            <div class="grid-2">
                <div class="form-group"><label>Marca/Produttore *</label><input type="text" id="arc-marca" required></div>
                <div class="form-group"><label>Modello/Descrizione *</label><input type="text" id="arc-modello" required></div>
            </div>
            <div class="form-group">
                <label>Categoria Predefinita</label>
                <select id="arc-categoria">
                    ${state.impostazioni.categorieCC.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                </select>
            </div>
            <div class="grid-2">
                <div class="form-group"><label>Costo Base (€) *</label><input type="number" id="arc-costo" step="0.01" required></div>
                <div class="form-group"><label>Ricarico Default (%)</label><input type="number" id="arc-ricarico" value="15"></div>
            </div>
            <div class="grid-2">
                <div class="form-group"><label>Fee Montaggio (€)</label><input type="number" id="arc-fee" step="0.01" value="0"></div>
                <div class="form-group"><label>Trasporto (€)</label><input type="number" id="arc-trasporto" step="0.01" value="0"></div>
            </div>
            <div class="text-right mt-4"><button type="button" class="btn-secondary" onclick="hideModal()">Annulla</button><button type="submit" class="btn-primary">Aggiungi al Catalogo</button></div>
        </form>
    `;
    showModal('Nuovo Modello Macchinario', html);
    document.getElementById('add-robot-cat-form').onsubmit = (e) => {
        e.preventDefault();
        state.catalogoRobot.push({
            id: 'r' + Date.now(),
            marca: document.getElementById('arc-marca').value,
            modello: document.getElementById('arc-modello').value,
            categoria: document.getElementById('arc-categoria').value,
            costoBase: parseFloat(document.getElementById('arc-costo').value),
            defaultRicarico: parseFloat(document.getElementById('arc-ricarico').value),
            defaultFee: parseFloat(document.getElementById('arc-fee').value),
            defaultTrasporto: parseFloat(document.getElementById('arc-trasporto').value)
        });
        saveState(); hideModal(); renderCatalogoMacchinari();
    };
}

function editRobotCatalog(id) {
    const r = state.catalogoRobot.find(x => x.id === id);
    if (!r) return;
    const html = `
        <form id="edit-robot-cat-form">
            <div class="grid-2">
                <div class="form-group"><label>Marca *</label><input type="text" id="erc-marca" value="${r.marca}" required></div>
                <div class="form-group"><label>Modello *</label><input type="text" id="erc-modello" value="${r.modello}" required></div>
            </div>
            <div class="grid-2">
                <div class="form-group"><label>Costo Base (€) *</label><input type="number" id="erc-costo" value="${r.costoBase}" step="0.01" required></div>
                <div class="form-group"><label>Ricarico Default (%)</label><input type="number" id="erc-ricarico" value="${r.defaultRicarico}"></div>
            </div>
            <div class="grid-2">
                <div class="form-group"><label>Fee Montaggio (€)</label><input type="number" id="erc-fee" value="${r.defaultFee}" step="0.01"></div>
                <div class="form-group"><label>Trasporto (€)</label><input type="number" id="erc-trasporto" value="${r.defaultTrasporto}" step="0.01"></div>
            </div>
            <div class="text-right mt-4"><button type="button" class="btn-secondary" onclick="hideModal()">Annulla</button><button type="submit" class="btn-primary">Salva Modifiche</button></div>
        </form>
    `;
    showModal('Modifica Modello Macchinario', html);
    document.getElementById('edit-robot-cat-form').onsubmit = (e) => {
        e.preventDefault();
        r.marca = document.getElementById('erc-marca').value;
        r.modello = document.getElementById('erc-modello').value;
        r.costoBase = parseFloat(document.getElementById('erc-costo').value);
        r.defaultRicarico = parseFloat(document.getElementById('erc-ricarico').value);
        r.defaultFee = parseFloat(document.getElementById('erc-fee').value);
        r.defaultTrasporto = parseFloat(document.getElementById('erc-trasporto').value);
        saveState(); hideModal(); renderCatalogoMacchinari();
    };
}

function deleteRobotCatalog(id) {
    if (confirm('Sei sicuro di voler eliminare questo modello dal catalogo?')) {
        state.catalogoRobot = state.catalogoRobot.filter(r => r.id !== id);
        saveState(); renderCatalogoMacchinari();
    }
}

// --- Gestione Clienti ---

function renderClienti() {
    const query = document.getElementById('client-search') ? document.getElementById('client-search').value.toLowerCase() : '';
    const filteredClienti = state.clienti.filter(c => 
        c.nome.toLowerCase().includes(query) || 
        (c.email && c.email.toLowerCase().includes(query)) ||
        (c.citta && c.citta.toLowerCase().includes(query))
    );

    document.getElementById('dynamic-content').innerHTML = `
        <section id="clienti-view" class="tab-content active">
            <div class="panel glass">
                <header>
                    <h2>Anagrafica Clienti</h2>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <input type="text" id="client-search" placeholder="Cerca cliente..." value="${query}" oninput="renderClienti()" style="max-width: 250px;">
                        <button class="btn-primary" onclick="showAddClientModal()">+ Nuovo Cliente</button>
                    </div>
                </header>
                <div class="panel-body">
                    <div class="clients-grid">
                        ${filteredClienti.length === 0 ? '<p style="grid-column: 1/-1; text-align:center; padding:2rem; color:var(--text-muted);">Nessun cliente trovato.</p>' : ''}
                        ${filteredClienti.map(c => {
                            const clientCommesse = state.commesse.filter(x => x.clienteId === c.id || x.cliente === c.nome);
                            return `
                                <div class="client-card glass" onclick="openClientDetail('${c.id}')">
                                    <div class="client-card-header">
                                        <h3>${c.nome}</h3>
                                        <span class="client-badge">${clientCommesse.length} Commesse</span>
                                    </div>
                                    <div class="client-card-body">
                                        <p><i data-lucide="map-pin"></i> ${c.citta || '-'}</p>
                                        <p><i data-lucide="mail"></i> ${c.email || '-'}</p>
                                    </div>
                                    <div class="client-card-footer">
                                        <button class="btn-small btn-secondary" onclick="event.stopPropagation(); editClient('${c.id}')">Modifica</button>
                                        <button class="btn-small btn-danger" onclick="event.stopPropagation(); deleteClient('${c.id}')">Elimina</button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        </section>
    `;
    if (query) {
        const s = document.getElementById('client-search');
        if(s) { s.focus(); const val = s.value; s.value=''; s.value=val; }
    }
    initLucide();
}

function renderDettaglioCliente(clientId) {
    const c = state.clienti.find(x => x.id === clientId);
    if (!c) { openClients(); return; }

    const clientCommesse = state.commesse.filter(x => x.clienteId === c.id || x.cliente === c.nome);
    
    let totalCosti = 0;
    let totalVendita = 0;

    const commesseListHtml = clientCommesse.map(comm => {
        const mats = state.materiali.filter(m => m.commessaId === comm.id);
        const labs = state.manodopera.filter(l => l.commessaId === comm.id);
        const sps = state.spese.filter(s => s.commessaId === comm.id);
        const robs = state.robotCantiere.filter(r => r.commessaId === comm.id);

        const matC = mats.reduce((s, m) => s + (m.qty * m.unitPrice), 0);
        const matS = mats.reduce((s, m) => s + (m.qty * m.unitPrice * (1 + m.markup)), 0);
        const labC = labs.reduce((s, l) => s + (l.totalHours * l.unitPrice), 0);
        const labS = labs.reduce((s, l) => s + (l.totalHours * l.unitPrice * (1 + l.markup)), 0);
        const robC = robs.reduce((s, r) => s + r.costoBase + (r.trasporto || 0) + (r.fee || 0), 0);
        const robS = robs.reduce((s, r) => s + (r.costoBase * (1 + r.markup)) + (r.trasporto || 0) + (r.fee || 0), 0);
        const traC = labs.reduce((s, l) => s + (l.viaggio ? (l.viaggio.costoFurgone || 0) + (l.viaggio.costoOreViaggio || 0) : 0), 0);
        const traS = labs.reduce((s, l) => s + (l.viaggio ? ((l.viaggio.costoFurgone || 0) + (l.viaggio.costoOreViaggio || 0)) * 1.2 : 0), 0);
        const speC = sps.reduce((s, x) => s + (x.qty * x.unitPrice), 0);
        const speS = sps.reduce((s, x) => s + (x.qty * x.unitPrice * (1 + x.markup)), 0);

        const cTot = matC + labC + robC + traC + speC;
        const sTot = matS + labS + robS + traS + speS;
        
        totalCosti += cTot;
        totalVendita += sTot;

        return `
            <div class="commessa-row-small glass" onclick="openProject('${comm.id}')">
                <div class="info">
                    <strong>${comm.nome}</strong>
                    <span>${formatDateIT(comm.dataApertura || '')}</span>
                </div>
                <div class="values">
                    <span>Costo: ${formatCurrency(cTot)}</span>
                    <span style="color:var(--success)">Vendita: ${formatCurrency(sTot)}</span>
                    <span style="font-weight:700">Utile: ${formatCurrency(sTot - cTot)}</span>
                </div>
                <i data-lucide="chevron-right"></i>
            </div>
        `;
    }).join('');

    const utileTotale = totalVendita - totalCosti;

    document.getElementById('dynamic-content').innerHTML = `
        <section id="client-detail-view" class="tab-content active">
            <div class="client-detail-header glass">
                <div class="client-info-main">
                    <h1>${c.nome}</h1>
                    <div class="client-meta">
                        <span><i data-lucide="hash"></i> P.IVA: ${c.piva || '-'}</span>
                        <span><i data-lucide="map-pin"></i> ${c.indirizzo || ''} ${c.citta || ''}</span>
                        <span><i data-lucide="phone"></i> ${c.telefono || '-'}</span>
                    </div>
                </div>
                <div class="client-stats-summary">
                    <div class="stat">
                        <label>Fatturato Totale</label>
                        <p>${formatCurrency(totalVendita)}</p>
                    </div>
                    <div class="stat">
                        <label>Utile Complessivo</label>
                        <p style="color: ${utileTotale >= 0 ? 'var(--success)' : 'var(--danger)'}">${formatCurrency(utileTotale)}</p>
                    </div>
                </div>
            </div>

            <div class="panel glass mt-4">
                <header>
                    <h2>Elenco Commesse</h2>
                    <button class="btn-primary btn-small" onclick="addCommessaForClient('${c.id}')"><i data-lucide="plus"></i> Nuova Commessa</button>
                </header>
                <div class="panel-body">
                    <div class="commesse-list-vertical">
                        ${commesseListHtml || '<p style="text-align:center; color:var(--text-muted); padding:2rem;">Nessuna commessa associata a questo cliente.</p>'}
                    </div>
                </div>
            </div>
        </section>
    `;
    initLucide();
}

function showAddClientModal(onComplete) {
    const html = `
        <form id="add-client-form">
            <div class="form-group"><label>Nome / Ragione Sociale *</label><input type="text" id="ac-nome" required></div>
            <div class="grid-2">
                <div class="form-group"><label>P.IVA / CF</label><input type="text" id="ac-piva"></div>
                <div class="form-group"><label>Email</label><input type="email" id="ac-email"></div>
            </div>
            <div class="grid-2">
                <div class="form-group"><label>Indirizzo</label><input type="text" id="ac-indirizzo"></div>
                <div class="form-group"><label>Città</label><input type="text" id="ac-citta"></div>
            </div>
            <div class="form-group"><label>Note</label><textarea id="ac-note" rows="2"></textarea></div>
            <div class="text-right mt-4"><button type="button" class="btn-secondary" onclick="hideModal()">Annulla</button><button type="submit" class="btn-primary">Salva Cliente</button></div>
        </form>
    `;
    showModal('Nuovo Cliente', html);
    document.getElementById('add-client-form').onsubmit = (e) => {
        e.preventDefault();
        const id = Date.now().toString();
        const newClient = {
            id,
            nome: document.getElementById('ac-nome').value,
            piva: document.getElementById('ac-piva').value,
            email: document.getElementById('ac-email').value,
            indirizzo: document.getElementById('ac-indirizzo').value,
            citta: document.getElementById('ac-citta').value,
            note: document.getElementById('ac-note').value
        };
        state.clienti.push(newClient);
        saveState();
        if (onComplete) {
            onComplete(newClient);
        } else {
            hideModal();
            renderClienti();
        }
    };
}

function editClient(id) {
    const c = state.clienti.find(x => x.id === id);
    if (!c) return;
    const html = `
        <form id="edit-client-form">
            <div class="form-group"><label>Nome / Ragione Sociale *</label><input type="text" id="ec-nome" value="${c.nome}" required></div>
            <div class="grid-2">
                <div class="form-group"><label>P.IVA / CF</label><input type="text" id="ec-piva" value="${c.piva || ''}"></div>
                <div class="form-group"><label>Email</label><input type="email" id="ec-email" value="${c.email || ''}"></div>
            </div>
            <div class="grid-2">
                <div class="form-group"><label>Indirizzo</label><input type="text" id="ec-indirizzo" value="${c.indirizzo || ''}"></div>
                <div class="form-group"><label>Città</label><input type="text" id="ec-citta" value="${c.citta || ''}"></div>
            </div>
            <div class="form-group"><label>Note</label><textarea id="ec-note" rows="2">${c.note || ''}</textarea></div>
            <div class="text-right mt-4"><button type="button" class="btn-secondary" onclick="hideModal()">Annulla</button><button type="submit" class="btn-primary">Salva Modifiche</button></div>
        </form>
    `;
    showModal('Modifica Cliente', html);
    document.getElementById('edit-client-form').onsubmit = (e) => {
        e.preventDefault();
        c.nome = document.getElementById('ec-nome').value;
        c.piva = document.getElementById('ec-piva').value;
        c.email = document.getElementById('ec-email').value;
        c.indirizzo = document.getElementById('ec-indirizzo').value;
        c.citta = document.getElementById('ec-citta').value;
        c.note = document.getElementById('ec-note').value;
        saveState(); hideModal(); renderClienti();
    };
}

function deleteClient(id) {
    const commesseCollegate = state.commesse.filter(x => x.clienteId === id);
    if (commesseCollegate.length > 0) {
        alert(`Impossibile eliminare il cliente: ci sono ${commesseCollegate.length} commesse collegate.`);
        return;
    }
    if (confirm('Sei sicuro di voler eliminare questo cliente?')) {
        state.clienti = state.clienti.filter(c => c.id !== id);
        saveState(); renderClienti();
    }
}

function addCommessaForClient(clientId) {
    const c = state.clienti.find(x => x.id === clientId);
    showPromptModal('Nuova Commessa', 'Nome cantiere:', (n) => {
        if (n) {
            const id = Date.now().toString();
            state.commesse.push({ 
                id, nome: n, budget: 0, cliente: c.nome, clienteId: c.id, 
                kmSede: 0, costoAutostrada: 0, oreViaggio: 1, note: '', macchineInstallate: '', 
                fasi: ['Generale'], dataApertura: new Date().toISOString().split('T')[0] 
            });
            saveState(); 
            openProject(id);
        }
    });
}

// --- Sicurezza, Backup e Privacy ---

function togglePrivacyMode() {
    state.isPrivacyMode = !state.isPrivacyMode;
    document.body.classList.toggle('privacy-active', state.isPrivacyMode);
    saveState();
    // Don't re-render everything to avoid locking the app if it's already unlocked
    // Just refresh the active view parts if needed, but the CSS class on body usually suffices
    initLucide();
}

async function hashPassword(password) {
    const msgUint8 = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function renderLockScreen() {
    document.getElementById('dynamic-content').innerHTML = `
        <div class="lock-screen" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:70vh;">
            <div class="glass" style="padding:3rem; border-radius:var(--radius); text-align:center; width:100%; max-width:400px;">
                <i data-lucide="lock" style="width:48px; height:48px; color:var(--accent); margin-bottom:1.5rem;"></i>
                <h2>Accesso Protetto</h2>
                <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:2rem;">Inserisci la Master Password per accedere ai dati sensibili.</p>
                <input type="password" id="lock-password" placeholder="Password" style="width:100%; margin-bottom:1rem; text-align:center;">
                <button class="btn-primary w-100" onclick="unlockApp()">Sblocca</button>
            </div>
        </div>
    `;
    initLucide();
}

async function unlockApp() {
    const input = document.getElementById('lock-password').value;
    const h = await hashPassword(input);
    if (h === state.masterPasswordHash) {
        state.isLocked = false;
        renderApp();
    } else {
        alert('Password Errata!');
    }
}

function backupFullData() {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Backup_BresanuSite_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
}

function restoreFullData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            if (imported.commesse && imported.materiali) {
                Object.assign(state, imported);
                state.isLocked = true; // Richiede ri-autenticazione
                saveState();
                location.reload();
            }
        } catch (err) {
            alert('Errore nel ripristino del file. Formato non valido.');
        }
    };
    reader.readAsText(file);
}

function showSetTab(e, id) {
    document.querySelectorAll('.settings-panel').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.btn-tab').forEach(b => b.classList.remove('active'));
    document.getElementById(id).style.display = 'block';
    if(e && e.currentTarget) e.currentTarget.classList.add('active');
}

function addCategoryCC() {
    const val = document.getElementById('new-ccc-name').value;
    if (val && !state.impostazioni.categorieCC.includes(val)) {
        state.impostazioni.categorieCC.push(val);
        saveState(); showImpostazioniGlobali();
    }
}

function deleteCategoryCC(cat) {
    state.impostazioni.categorieCC = state.impostazioni.categorieCC.filter(c => c !== cat);
    saveState(); showImpostazioniGlobali();
}

// Global Exports
Object.assign(window, {
    addMaterialInline, addLaborInline, showSpeseModal, deleteMaterial, deleteLabor, deleteSpesa, deleteItem, editItem, showAddItemModal,
    hideModal, importCatalog, onItemSelectInlineCodice, onItemSelectInlineDesc, exportToExcel, exportToPDF, editBudget, editCommessaDetails,
    showImpostazioniGlobali, addFurgone, deleteFurgone, salvaImpostazioniGlobali,
    showAddRobotModal, onRobotSelect, deleteRobot, goHome, openCatalog, openProject,
    openClients, openClientDetail, showAddClientModal, editClient, deleteClient, addCommessaForClient,
    renderCatalogoMacchinari, showAddRobotCatalogModal, editRobotCatalog, deleteRobotCatalog,
    quickFillMaterial, togglePrivacyMode, unlockApp, backupFullData, restoreFullData, showSetTab, showEditRobotModal
});
