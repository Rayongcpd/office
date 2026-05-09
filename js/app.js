// ============================================================
// Unified Office Portal - Core Application
// Frontend: GitHub Pages | Backend: Google Apps Script
// Style: Claude-inspired minimal & warm neutral
// ============================================================

const APP = {
  user: null,
  sessionId: null,
  currentPage: 'dashboard',
  config: {},
  modules: {
    planning: { url: 'AKfycbyF9dpyV6e9p5GwoqlsKAEhdqc2rtsnJ5Y05E24QnLzLjqYhnktemXxMXFKSvt1BRxRag', label: 'นโยบายและแผน' },
    procurement: { url: 'AKfycbyF9dpyV6e9p5GwoqlsKAEhdqc2rtsnJ5Y05E24QnLzLjqYhnktemXxMXFKSvt1BRxRag', label: 'บริหารงานพัสดุ' },
    eoffice: { url: 'AKfycbyF9dpyV6e9p5GwoqlsKAEhdqc2rtsnJ5Y05E24QnLzLjqYhnktemXxMXFKSvt1BRxRag', label: 'e-Office' }
  }
};

// ============================================================
// AUTHENTICATION
// ============================================================
function doLogin() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!username || !password) {
    Swal.fire({ icon: 'warning', title: 'กรุณากรอกข้อมูล', text: 'ชื่อผู้ใช้และรหัสผ่านจำเป็นต้องกรอก', confirmButtonColor: '#292524' });
    return;
  }

  Swal.fire({ title: 'กำลังเข้าสู่ระบบ...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });

  callGas('eoffice', 'login', [username, password])
    .then(res => {
      Swal.close();
      if (res && res.success) {
        APP.user = res.user;
        APP.sessionId = res.session_id;
        APP.config = res.config || {};
        localStorage.setItem('unified_session', JSON.stringify({ user: APP.user, sessionId: APP.sessionId, ts: Date.now() }));
        showMainApp();
      } else {
        Swal.fire({ icon: 'error', title: 'เข้าสู่ระบบไม่สำเร็จ', text: res?.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', confirmButtonColor: '#292524' });
      }
    })
    .catch(err => {
      Swal.close();
      Swal.fire({ icon: 'error', title: 'ข้อผิดพลาด', text: 'ไม่สามารถเชื่อมต่อกับระบบได้', confirmButtonColor: '#292524' });
      console.error('Login error:', err);
    });
}

function doLogout() {
  Swal.fire({
    icon: 'question', title: 'ออกจากระบบ?', showCancelButton: true,
    confirmButtonText: 'ออก', cancelButtonText: 'ยกเลิก', confirmButtonColor: '#292524'
  }).then(r => {
    if (r.isConfirmed) {
      localStorage.removeItem('unified_session');
      APP.user = null; APP.sessionId = null;
      document.getElementById('loginScreen').classList.remove('hidden');
      document.getElementById('mainApp').classList.add('hidden');
      document.getElementById('loginPassword').value = '';
    }
  });
}

function checkSession() {
  const saved = localStorage.getItem('unified_session');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      if (data && data.sessionId && (Date.now() - data.ts) < 8 * 60 * 60 * 1000) {
        APP.user = data.user;
        APP.sessionId = data.sessionId;
        showMainApp();
        return;
      }
    } catch (e) {}
  }
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('mainApp').classList.add('hidden');
}

function showMainApp() {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('mainApp').classList.remove('hidden');
  updateUserInfo();
  loadDashboard();
}

function updateUserInfo() {
  if (!APP.user) return;
  document.getElementById('sidebarUserName').textContent = APP.user.name || APP.user.username || '-';
  document.getElementById('sidebarUserRole').textContent = roleTh(APP.user.role);
  document.getElementById('userAvatar').textContent = (APP.user.name || APP.user.username || 'A').charAt(0).toUpperCase();
  document.getElementById('sidebarOrgName').textContent = APP.config.org_name || 'หน่วยงาน';
  document.getElementById('fiscalYearLabel').textContent = APP.config.fiscal_year || '-';
}

function roleTh(role) {
  const map = {
    admin: 'ผู้ดูแลระบบ', director: 'ผู้อำนวยการ', deputy: 'รองผู้อำนวยการ',
    head_of_dept: 'หัวหน้าฝ่าย', registrar: 'เจ้าหน้าที่สารบรรณ',
    staff: 'ครู/บุคลากร', procurement: 'เจ้าหน้าที่พัสดุ',
    finance: 'เจ้าหน้าที่การเงิน', user: 'ผู้ใช้ทั่วไป'
  };
  return map[role] || role;
}

function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  const icon = btn.querySelector('i');
  if (input.type === 'password') { input.type = 'text'; icon.classList.replace('fa-eye', 'fa-eye-slash'); }
  else { input.type = 'password'; icon.classList.replace('fa-eye-slash', 'fa-eye'); }
}

// ============================================================
// NAVIGATION & UI
// ============================================================
function navigateTo(page) {
  APP.currentPage = page;
  document.querySelectorAll('.page-section').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));

  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');

  const navEl = document.querySelector('.sidebar-item[data-page="' + page + '"]');
  if (navEl) navEl.classList.add('active');

  const titles = {
    dashboard: 'Dashboard', planning: 'นโยบายและแผน',
    procurement: 'บริหารงานพัสดุ', eoffice: 'e-Office',
    settings: 'ตั้งค่าระบบ', users: 'ผู้ใช้งาน'
  };
  document.getElementById('pageTitle').textContent = titles[page] || page;

  if (page === 'dashboard') loadDashboard();
  if (page === 'users') loadUsers();
  if (page === 'settings') populateSettings();
  if (window.innerWidth < 1024) toggleSidebar(false);
}

function toggleSidebar(force) {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebarOverlay');
  const open = force !== undefined ? force : !sb.classList.contains('open');
  sb.classList.toggle('open', open);
  ov.classList.toggle('open', open);
}

function toggleTheme() {
  const html = document.documentElement;
  const icon = document.getElementById('themeIcon');
  if (html.classList.contains('dark')) {
    html.classList.remove('dark');
    icon.classList.replace('fa-sun', 'fa-moon');
    localStorage.setItem('theme', 'light');
  } else {
    html.classList.add('dark');
    icon.classList.replace('fa-moon', 'fa-sun');
    localStorage.setItem('theme', 'dark');
  }
}

function showNotifications() {
  Swal.fire({
    title: 'การแจ้งเตือน', html: '<div class="text-left text-sm text-ink-500 py-4">ไม่มีแจ้งเตือนใหม่</div>',
    confirmButtonColor: '#292524', confirmButtonText: 'ปิด'
  });
}

function fmtNum(n) {
  if (n === undefined || n === null) return '-';
  return Number(n).toLocaleString('th-TH');
}

function fmtMoney(n) {
  if (n === undefined || n === null) return '-';
  return Number(n).toLocaleString('th-TH') + ' บ.';
}

// ============================================================
// API WRAPPER (JSONP — CORS-free for Google Apps Script)
// ============================================================
function callGas(module, funcName, args) {
  const mod = APP.modules[module];
  if (!mod) return Promise.reject(new Error('Unknown module: ' + module));

  const url = `https://script.google.com/macros/s/${mod.url}/exec`;
  const params = new URLSearchParams();
  params.append('func', funcName);
  if (args) params.append('args', JSON.stringify(args));

  return new Promise((resolve, reject) => {
    const cbName = '_cb_' + Date.now();
    const script = document.createElement('script');
    const fullUrl = url + '?' + params.toString() + '&callback=' + cbName;

    console.log('[callGas] JSONP:', fullUrl);

    window[cbName] = function(data) {
      console.log('[callGas] response:', data);
      delete window[cbName];
      if (script.parentNode) script.parentNode.removeChild(script);
      resolve(data);
    };

    script.onload = function() {
      // If script loaded but callback never fired, it's likely an Apps Script auth error
      setTimeout(() => {
        if (window[cbName]) {
          delete window[cbName];
          if (script.parentNode) script.parentNode.removeChild(script);
          reject(new Error('Apps Script returned no data. Please check: 1) Script is deployed as Web App with "Anyone" access. 2) Open the script URL in browser first to authorize.'));
        }
      }, 2000);
    };

    script.onerror = function() {
      delete window[cbName];
      if (script.parentNode) script.parentNode.removeChild(script);
      reject(new Error('Script load error. URL: ' + fullUrl));
    };

    script.src = fullUrl;
    document.head.appendChild(script);

    setTimeout(() => {
      if (window[cbName]) {
        delete window[cbName];
        if (script.parentNode) script.parentNode.removeChild(script);
        reject(new Error('Request timeout (>30s)'));
      }
    }, 30000);
  });
}

// ============================================================
// DASHBOARD
// ============================================================
async function loadDashboard() {
  // Parallel load stats from all 3 backends
  try {
    const [planning, procurement, eoffice] = await Promise.allSettled([
      callGas('planning', 'getPlanDashboardData', [APP.sessionId]).catch(() => null),
      callGas('procurement', 'getDashboardData', [APP.sessionId]).catch(() => null),
      callGas('eoffice', 'getDashboardStats', [APP.sessionId]).catch(() => null)
    ]);

    if (planning.value) {
      document.getElementById('dashPlanningProjects').textContent = fmtNum(planning.value.total_projects || 0);
      document.getElementById('dashPlanningBudget').textContent = fmtMoney(planning.value.total_budget || 0);
    }
    if (procurement.value) {
      document.getElementById('dashProcurementPlans').textContent = fmtNum(procurement.value.total_plans || 0);
      document.getElementById('dashProcurementContracts').textContent = fmtNum(procurement.value.active_contracts || 0);
    }
    if (eoffice.value) {
      document.getElementById('dashEofficeDocs').textContent = fmtNum(eoffice.value.pending_docs || 0);
      document.getElementById('dashEofficeMeetings').textContent = fmtNum(eoffice.value.today_meetings || 0);
    }
  } catch (e) {
    console.log('Dashboard partial load', e);
  }

  renderMiniCalendar();
}

function renderMiniCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

  let html = `<div class="col-span-7 text-center text-xs font-semibold text-ink-500 py-2">${monthNames[month]} ${year + 543}</div>`;
  const dayHeaders = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
  dayHeaders.forEach(d => html += `<div class="text-[10px] font-medium text-ink-400 py-1">${d}</div>`);

  for (let i = 0; i < firstDay; i++) html += `<div></div>`;
  const today = now.getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = d === today;
    html += `<div class="aspect-square flex items-center justify-center text-xs rounded-lg ${isToday ? 'bg-ink-800 text-white font-semibold' : 'text-ink-600 hover:bg-ink-100'} cursor-pointer transition">${d}</div>`;
  }
  document.getElementById('dashCalendar').innerHTML = html;
}

// ============================================================
// MODULE LOADERS (Planning)
// ============================================================
async function planningLoad(subpage) {
  const el = document.getElementById('planningContent');
  el.innerHTML = '<div class="text-center py-10 text-ink-400 text-sm"><i class="fas fa-spinner fa-spin mr-2"></i>กำลังโหลด...</div>';

  try {
    if (subpage === 'projects') {
      const res = await callGas('planning', 'getProjects', [APP.sessionId]);
      renderPlanningProjects(el, res);
    } else if (subpage === 'budget') {
      const res = await callGas('planning', 'getBudgetSummary', [APP.sessionId]);
      renderPlanningBudget(el, res);
    } else if (subpage === 'kpi') {
      const res = await callGas('planning', 'getKPIs', [APP.sessionId]);
      renderPlanningKPI(el, res);
    } else if (subpage === 'reports') {
      const res = await callGas('planning', 'getProjectReport', [APP.sessionId]);
      renderPlanningReports(el, res);
    }
  } catch (e) {
    el.innerHTML = '<div class="text-center py-10 text-ink-400 text-sm">ไม่สามารถโหลดข้อมูลได้ (กรุณาตรวจสอบการเชื่อมต่อ)</div>';
  }
}

function renderPlanningProjects(el, data) {
  const rows = (data || []).map(p => `
    <tr class="border-b border-ink-100 hover:bg-ink-50 transition">
      <td class="py-3 px-4 text-sm font-medium text-ink-700">${p.name || '-'}</td>
      <td class="py-3 px-4 text-sm text-ink-500">${p.department || '-'}</td>
      <td class="py-3 px-4 text-sm text-ink-500 text-right stat-value">${fmtMoney(p.budget)}</td>
      <td class="py-3 px-4 text-sm text-ink-500">${p.status || '-'}</td>
    </tr>
  `).join('');
  el.innerHTML = `
    <div class="overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead><tr class="border-b border-ink-200 text-xs text-ink-400 uppercase tracking-wider">
          <th class="py-2 px-4 font-medium">โครงการ</th>
          <th class="py-2 px-4 font-medium">ฝ่าย</th>
          <th class="py-2 px-4 font-medium text-right">งบประมาณ</th>
          <th class="py-2 px-4 font-medium">สถานะ</th>
        </tr></thead>
        <tbody>${rows || '<tr><td colspan="4" class="py-8 text-center text-ink-400">ไม่มีข้อมูล</td></tr>'}</tbody>
      </table>
    </div>`;
}

function renderPlanningBudget(el, data) {
  const total = data?.total || 0, used = data?.used || 0, remain = total - used;
  const pct = total > 0 ? Math.round((used / total) * 100) : 0;
  el.innerHTML = `
    <div class="space-y-4">
      <div class="grid grid-cols-3 gap-4">
        <div class="bg-ink-50 rounded-xl p-4 text-center">
          <p class="text-xs text-ink-500 mb-1">งบประมาณรวม</p>
          <p class="text-lg font-bold text-ink-700 stat-value">${fmtMoney(total)}</p>
        </div>
        <div class="bg-ink-50 rounded-xl p-4 text-center">
          <p class="text-xs text-ink-500 mb-1">ใช้ไปแล้ว</p>
          <p class="text-lg font-bold text-amber-600 stat-value">${fmtMoney(used)}</p>
        </div>
        <div class="bg-ink-50 rounded-xl p-4 text-center">
          <p class="text-xs text-ink-500 mb-1">คงเหลือ</p>
          <p class="text-lg font-bold text-emerald-600 stat-value">${fmtMoney(remain)}</p>
        </div>
      </div>
      <div>
        <div class="flex justify-between text-xs text-ink-500 mb-1.5"><span>ความคืบหน้า</span><span>${pct}%</span></div>
        <div class="h-2 bg-ink-100 rounded-full overflow-hidden"><div class="h-full bg-ink-700 rounded-full transition-all" style="width:${pct}%"></div></div>
      </div>
    </div>`;
}

function renderPlanningKPI(el, data) {
  const rows = (data || []).map(k => `
    <tr class="border-b border-ink-100 hover:bg-ink-50 transition">
      <td class="py-3 px-4 text-sm text-ink-700">${k.name || '-'}</td>
      <td class="py-3 px-4 text-sm text-ink-500 text-right">${k.target || '-'}</td>
      <td class="py-3 px-4 text-sm text-ink-500 text-right">${k.actual || '-'}</td>
      <td class="py-3 px-4"><div class="flex items-center gap-2"><div class="w-16 h-1.5 bg-ink-100 rounded-full overflow-hidden"><div class="h-full bg-amber-500 rounded-full" style="width:${Math.min(k.progress || 0, 100)}%"></div></div><span class="text-xs text-ink-500">${k.progress || 0}%</span></div></td>
    </tr>
  `).join('');
  el.innerHTML = `<div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead><tr class="border-b border-ink-200 text-xs text-ink-400 uppercase"><th class="py-2 px-4 font-medium">ตัวชี้วัด</th><th class="py-2 px-4 font-medium text-right">เป้าหมาย</th><th class="py-2 px-4 font-medium text-right">ผลงาน</th><th class="py-2 px-4 font-medium">ความคืบหน้า</th></tr></thead><tbody>${rows || '<tr><td colspan="4" class="py-8 text-center text-ink-400">ไม่มีข้อมูล</td></tr>'}</tbody></table></div>`;
}

function renderPlanningReports(el, data) {
  el.innerHTML = `<div class="space-y-3"><div class="flex items-center gap-3 p-3 rounded-xl bg-ink-50 hover:bg-ink-100 transition cursor-pointer"><i class="fas fa-file-pdf text-red-400"></i><div><p class="text-sm font-medium text-ink-700">รายงานสรุปโครงการ</p><p class="text-xs text-ink-400">ประจำปีงบฯ ${APP.config.fiscal_year || '-'}</p></div></div><div class="flex items-center gap-3 p-3 rounded-xl bg-ink-50 hover:bg-ink-100 transition cursor-pointer"><i class="fas fa-file-excel text-emerald-500"></i><div><p class="text-sm font-medium text-ink-700">รายงานงบประมาณ</p><p class="text-xs text-ink-400">Export ข้อมูลเป็น Excel</p></div></div></div>`;
}

// ============================================================
// MODULE LOADERS (Procurement)
// ============================================================
async function procurementLoad(subpage) {
  const el = document.getElementById('procurementContent');
  el.innerHTML = '<div class="text-center py-10 text-ink-400 text-sm"><i class="fas fa-spinner fa-spin mr-2"></i>กำลังโหลด...</div>';

  try {
    if (subpage === 'plans') {
      const res = await callGas('procurement', 'getPlans', [APP.sessionId]);
      renderProcurementPlans(el, res);
    } else if (subpage === 'procurements') {
      const res = await callGas('procurement', 'getProcurements', [APP.sessionId]);
      renderProcurementList(el, res);
    } else if (subpage === 'assets') {
      const res = await callGas('procurement', 'getAssets', [APP.sessionId]);
      renderProcurementAssets(el, res);
    } else if (subpage === 'contracts') {
      const res = await callGas('procurement', 'getContracts', [APP.sessionId]);
      renderProcurementContracts(el, res);
    }
  } catch (e) {
    el.innerHTML = '<div class="text-center py-10 text-ink-400 text-sm">ไม่สามารถโหลดข้อมูลได้ (กรุณาตรวจสอบการเชื่อมต่อ)</div>';
  }
}

function renderProcurementPlans(el, data) {
  const rows = (data || []).map(p => `
    <tr class="border-b border-ink-100 hover:bg-ink-50 transition">
      <td class="py-3 px-4 text-sm font-medium text-ink-700">${p.name || '-'}</td>
      <td class="py-3 px-4 text-sm text-ink-500">${p.category || '-'}</td>
      <td class="py-3 px-4 text-sm text-ink-500 text-right stat-value">${fmtMoney(p.amount)}</td>
      <td class="py-3 px-4 text-sm"><span class="badge-claude bg-emerald-50 text-emerald-700">${p.status || '-'}</span></td>
    </tr>
  `).join('');
  el.innerHTML = `<div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead><tr class="border-b border-ink-200 text-xs text-ink-400 uppercase"><th class="py-2 px-4 font-medium">แผน</th><th class="py-2 px-4 font-medium">หมวด</th><th class="py-2 px-4 font-medium text-right">วงเงิน</th><th class="py-2 px-4 font-medium">สถานะ</th></tr></thead><tbody>${rows || '<tr><td colspan="4" class="py-8 text-center text-ink-400">ไม่มีข้อมูล</td></tr>'}</tbody></table></div>`;
}

function renderProcurementList(el, data) {
  el.innerHTML = '<div class="text-center py-8 text-ink-400 text-sm">รายการดำเนินการจัดซื้อจัดจ้าง</div>';
}

function renderProcurementAssets(el, data) {
  const rows = (data || []).map(a => `
    <tr class="border-b border-ink-100 hover:bg-ink-50 transition">
      <td class="py-3 px-4 text-sm font-medium text-ink-700">${a.name || '-'}</td>
      <td class="py-3 px-4 text-sm text-ink-500">${a.code || '-'}</td>
      <td class="py-3 px-4 text-sm text-ink-500">${a.location || '-'}</td>
      <td class="py-3 px-4 text-sm"><span class="badge-claude ${a.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-ink-100 text-ink-600'}">${a.status || '-'}</span></td>
    </tr>
  `).join('');
  el.innerHTML = `<div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead><tr class="border-b border-ink-200 text-xs text-ink-400 uppercase"><th class="py-2 px-4 font-medium">ครุภัณฑ์</th><th class="py-2 px-4 font-medium">เลขทะเบียน</th><th class="py-2 px-4 font-medium">ที่ตั้ง</th><th class="py-2 px-4 font-medium">สถานะ</th></tr></thead><tbody>${rows || '<tr><td colspan="4" class="py-8 text-center text-ink-400">ไม่มีข้อมูล</td></tr>'}</tbody></table></div>`;
}

function renderProcurementContracts(el, data) {
  el.innerHTML = '<div class="text-center py-8 text-ink-400 text-sm">รายการสัญญา</div>';
}

// ============================================================
// MODULE LOADERS (eOffice)
// ============================================================
async function eofficeLoad(subpage) {
  const el = document.getElementById('eofficeContent');
  el.innerHTML = '<div class="text-center py-10 text-ink-400 text-sm"><i class="fas fa-spinner fa-spin mr-2"></i>กำลังโหลด...</div>';

  try {
    if (subpage === 'incoming') {
      const res = await callGas('eoffice', 'getData', [APP.sessionId, 'IncomingDocs']);
      renderEofficeIncoming(el, res);
    } else if (subpage === 'outgoing') {
      const res = await callGas('eoffice', 'getData', [APP.sessionId, 'OutgoingDocs']);
      renderEofficeOutgoing(el, res);
    } else if (subpage === 'leave') {
      const res = await callGas('eoffice', 'getData', [APP.sessionId, 'Leaves']);
      renderEofficeLeave(el, res);
    } else if (subpage === 'meetings') {
      const res = await callGas('eoffice', 'getData', [APP.sessionId, 'Meetings']);
      renderEofficeMeetings(el, res);
    }
  } catch (e) {
    el.innerHTML = '<div class="text-center py-10 text-ink-400 text-sm">ไม่สามารถโหลดข้อมูลได้ (กรุณาตรวจสอบการเชื่อมต่อ)</div>';
  }
}

function renderEofficeIncoming(el, data) {
  const rows = (data || []).map(d => `
    <tr class="border-b border-ink-100 hover:bg-ink-50 transition">
      <td class="py-3 px-4 text-sm font-medium text-ink-700">${d.doc_number || '-'}</td>
      <td class="py-3 px-4 text-sm text-ink-500">${d.subject || '-'}</td>
      <td class="py-3 px-4 text-sm text-ink-500">${d.from || '-'}</td>
      <td class="py-3 px-4 text-sm"><span class="badge-claude bg-blue-50 text-blue-700">${d.status || '-'}</span></td>
    </tr>
  `).join('');
  el.innerHTML = `<div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead><tr class="border-b border-ink-200 text-xs text-ink-400 uppercase"><th class="py-2 px-4 font-medium">เลขที่</th><th class="py-2 px-4 font-medium">เรื่อง</th><th class="py-2 px-4 font-medium">จาก</th><th class="py-2 px-4 font-medium">สถานะ</th></tr></thead><tbody>${rows || '<tr><td colspan="4" class="py-8 text-center text-ink-400">ไม่มีข้อมูล</td></tr>'}</tbody></table></div>`;
}

function renderEofficeOutgoing(el, data) {
  el.innerHTML = '<div class="text-center py-8 text-ink-400 text-sm">หนังสือส่ง</div>';
}

function renderEofficeLeave(el, data) {
  el.innerHTML = '<div class="text-center py-8 text-ink-400 text-sm">รายการใบลา</div>';
}

function renderEofficeMeetings(el, data) {
  el.innerHTML = '<div class="text-center py-8 text-ink-400 text-sm">การประชุม</div>';
}

// ============================================================
// USERS & SETTINGS
// ============================================================
async function loadUsers() {
  const el = document.getElementById('usersTable');
  el.innerHTML = '<div class="p-6 text-center text-ink-400 text-sm"><i class="fas fa-spinner fa-spin mr-2"></i>กำลังโหลด...</div>';
  try {
    const res = await callGas('eoffice', 'getUsers', [APP.sessionId]);
    const users = res || [];
    const rows = users.map(u => `
      <tr class="border-b border-ink-100 hover:bg-ink-50 transition">
        <td class="py-3 px-4 text-sm font-medium text-ink-700">${u.username || '-'}</td>
        <td class="py-3 px-4 text-sm text-ink-500">${u.name || '-'}</td>
        <td class="py-3 px-4 text-sm"><span class="badge-claude bg-ink-100 text-ink-600">${roleTh(u.role)}</span></td>
        <td class="py-3 px-4 text-sm text-ink-500">${u.department || '-'}</td>
        <td class="py-3 px-4 text-sm text-right">
          <button class="text-ink-400 hover:text-ink-700 transition p-1"><i class="fas fa-edit text-xs"></i></button>
          <button class="text-ink-400 hover:text-red-500 transition p-1 ml-1"><i class="fas fa-trash text-xs"></i></button>
        </td>
      </tr>
    `).join('');
    el.innerHTML = `<div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead><tr class="border-b border-ink-200 text-xs text-ink-400 uppercase"><th class="py-2 px-4 font-medium">ชื่อผู้ใช้</th><th class="py-2 px-4 font-medium">ชื่อ-นามสกุล</th><th class="py-2 px-4 font-medium">บทบาท</th><th class="py-2 px-4 font-medium">ฝ่าย</th><th class="py-2 px-4 font-medium"></th></tr></thead><tbody>${rows || '<tr><td colspan="5" class="py-8 text-center text-ink-400">ไม่มีข้อมูล</td></tr>'}</tbody></table></div>`;
  } catch (e) {
    el.innerHTML = '<div class="p-6 text-center text-ink-400 text-sm">ไม่สามารถโหลดข้อมูลได้</div>';
  }
}

function showAddUser() {
  Swal.fire({
    title: 'เพิ่มผู้ใช้',
    html: `<div class="text-left space-y-3"><div><label class="block text-xs text-ink-500 mb-1">ชื่อผู้ใช้</label><input id="swalUsername" class="claude-input" placeholder="username"></div><div><label class="block text-xs text-ink-500 mb-1">รหัสผ่าน</label><input id="swalPassword" type="password" class="claude-input" placeholder="password"></div><div><label class="block text-xs text-ink-500 mb-1">ชื่อ-นามสกุล</label><input id="swalName" class="claude-input" placeholder="ชื่อ นามสกุล"></div><div><label class="block text-xs text-ink-500 mb-1">บทบาท</label><select id="swalRole" class="claude-input"><option value="staff">ครู/บุคลากร</option><option value="admin">ผู้ดูแลระบบ</option><option value="head_of_dept">หัวหน้าฝ่าย</option><option value="procurement">เจ้าหน้าที่พัสดุ</option></select></div></div>`,
    confirmButtonColor: '#292524', confirmButtonText: 'เพิ่ม', showCancelButton: true, cancelButtonText: 'ยกเลิก',
    preConfirm: () => {
      const u = document.getElementById('swalUsername').value.trim();
      const p = document.getElementById('swalPassword').value;
      const n = document.getElementById('swalName').value.trim();
      if (!u || !p) { Swal.showValidationMessage('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน'); return false; }
      return { username: u, password: p, name: n, role: document.getElementById('swalRole').value };
    }
  }).then(r => {
    if (r.isConfirmed) {
      Swal.fire({ title: 'กำลังเพิ่ม...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
      callGas('eoffice', 'addUser', [APP.sessionId, r.value]).then(res => {
        Swal.close();
        if (res?.success) { Swal.fire({ icon: 'success', title: 'เพิ่มเรียบร้อย', timer: 1500, showConfirmButton: false }); loadUsers(); }
        else Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: res?.message || 'ไม่สามารถเพิ่มได้', confirmButtonColor: '#292524' });
      });
    }
  });
}

function populateSettings() {
  document.getElementById('cfgOrgName').value = APP.config.org_name || '';
  document.getElementById('cfgFiscalYear').value = APP.config.fiscal_year || '';
  document.getElementById('cfgDriveFolder').value = APP.config.drive_folder_id || '';
}

async function saveSettings() {
  const cfg = {
    org_name: document.getElementById('cfgOrgName').value,
    fiscal_year: parseInt(document.getElementById('cfgFiscalYear').value) || undefined,
    drive_folder_id: document.getElementById('cfgDriveFolder').value
  };
  Swal.fire({ title: 'กำลังบันทึก...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
  try {
    const res = await callGas('eoffice', 'saveConfig', [cfg]);
    Swal.close();
    if (res?.success) {
      APP.config = Object.assign(APP.config, cfg);
      Swal.fire({ icon: 'success', title: 'บันทึกเรียบร้อย', timer: 1500, showConfirmButton: false });
      updateUserInfo();
    } else throw new Error(res?.message);
  } catch (e) {
    Swal.close();
    Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: e.message || 'บันทึกไม่สำเร็จ', confirmButtonColor: '#292524' });
  }
}

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  const theme = localStorage.getItem('theme');
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
    document.getElementById('themeIcon').classList.replace('fa-moon', 'fa-sun');
  }
  checkSession();
});
