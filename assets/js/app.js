/* ============================================================
   Khánh An ERP - Core App JS
   ============================================================ */

const DATA_URL = 'data/demo-data.json';
let APP_DATA = null;
let CURRENT_USER = null;

/* ---- Data Loader ---- */
async function loadData() {
  if (APP_DATA) return APP_DATA;
  const res = await fetch(DATA_URL);
  APP_DATA = await res.json();
  return APP_DATA;
}

/* ---- Auth ---- */
function getSession() {
  const s = sessionStorage.getItem('ka_user');
  return s ? JSON.parse(s) : null;
}

function setSession(user) {
  sessionStorage.setItem('ka_user', JSON.stringify(user));
}

function clearSession() {
  sessionStorage.removeItem('ka_user');
}

function requireAuth() {
  const user = getSession();
  if (!user) {
    window.location.href = 'index.html';
    return null;
  }
  return user;
}

function logout() {
  clearSession();
  window.location.href = 'index.html';
}

/* ---- Number Formatters ---- */
function fmtCurrency(n) {
  if (!n && n !== 0) return '—';
  return Number(n).toLocaleString('vi-VN') + ' ₫';
}

function fmtCurrencyShort(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + ' tỷ';
  if (n >= 1e6) return (n / 1e6).toFixed(0) + ' triệu';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + ' nghìn';
  return n.toLocaleString('vi-VN');
}

function fmtNumber(n) {
  if (!n && n !== 0) return '—';
  return Number(n).toLocaleString('vi-VN');
}

function fmtDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

/* ---- Khu vuc label ---- */
const KHU_VUC_LABEL = {
  SG: 'TP.HCM', AG: 'An Giang', CT: 'Cần Thơ',
  TG: 'Tiền Giang', LA: 'Long An', DN: 'Đà Nẵng',
  VL: 'Vĩnh Long', DT: 'Đồng Tháp'
};

function getKhuVucLabel(code) {
  return KHU_VUC_LABEL[code] || code;
}

/* ---- Role label ---- */
const VAI_TRO_LABEL = {
  admin: 'Quản trị viên',
  kinh_doanh: 'Kinh doanh',
  ke_toan: 'Kế toán',
  thu_kho: 'Thủ kho'
};

function getVaiTroLabel(id) {
  return VAI_TRO_LABEL[id] || id;
}

/* ---- Status badge ---- */
function statusBadge(status) {
  const map = {
    active:          ['active',          'Hoạt động'],
    inactive:        ['inactive',        'Ngưng'],
    nhap:            ['nhap',            'Nháp'],
    hoan_thanh:      ['hoan_thanh',      'Hoàn thành'],
    cho_thanh_toan:  ['cho_thanh_toan',  'Chờ TT'],
    da_huy:          ['da_huy',          'Đã hủy'],
  };
  const [cls, label] = map[status] || ['inactive', status];
  return `<span class="badge-status ${cls}">${label}</span>`;
}

/* Đơn hàng có thể sửa không? Chỉ khi còn ở trạng thái nháp */
function isEditable(order) {
  return order.trangThai === 'nhap';
}

/* ---- Toast ---- */
function showToast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : '⚠';
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icon}</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

/* ---- Modal helpers ---- */
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

/* ---- Sidebar render ---- */
function renderSidebar(activePage) {
  const user = getSession();
  if (!user) return;

  const initials = user.hoTen.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase();

  const navItems = [
    { page: 'dashboard', icon: '📊', label: 'Dashboard', href: 'dashboard.html' },
    { page: 'ban-hang', icon: '🛒', label: 'Bán hàng', href: 'ban-hang.html' },
    { page: 'san-pham', icon: '📦', label: 'Sản phẩm', href: 'san-pham.html' },
    { page: 'nhan-vien', icon: '👥', label: 'Nhân viên', href: 'nhan-vien.html' },
  ];

  const navHTML = navItems.map(item => `
    <a href="${item.href}" class="nav-item ${activePage === item.page ? 'active' : ''}">
      <span class="nav-icon">${item.icon}</span>
      <span>${item.label}</span>
    </a>
  `).join('');

  const sidebarHTML = `
    <div class="sidebar-brand">
      <div class="brand-icon">🌿</div>
      <div>
        <div class="brand-text">Khánh An ERP</div>
        <div class="brand-sub">Thực phẩm chay</div>
      </div>
    </div>
    <nav class="sidebar-nav">
      <div class="nav-section-title">Menu chính</div>
      ${navHTML}
    </nav>
    <div class="sidebar-footer">
      <div class="user-info">
        <div class="user-avatar">${initials}</div>
        <div>
          <div class="user-name">${user.hoTen}</div>
          <div class="user-role">${getVaiTroLabel(user.vaiTro)}</div>
        </div>
      </div>
      <button class="btn-logout" onclick="logout()">
        <span>🚪</span> Đăng xuất
      </button>
    </div>
  `;

  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.innerHTML = sidebarHTML;

  // Update header user
  const headerUser = document.getElementById('header-user');
  if (headerUser) headerUser.textContent = user.hoTen;
}

/* ---- Order total calculation ---- */
function calcOrderTotal(order, sanPhamList) {
  let total = 0;
  order.chiTiet.forEach(item => {
    total += item.soThungTinhTien * item.donGia;
  });
  return total;
}

function calcSoTienCanTT(order, sanPhamList) {
  const thanhTien = calcOrderTotal(order, sanPhamList);
  return thanhTien + (order.congNoTruoc || 0) - (order.daThanhToan || 0) - (order.chietKhau || 0);
}

/* ---- Export Excel (Phiếu thanh toán) — xlsx-js-style ---- */
function exportPhieuThanhToan(order, data) {
  const kh = data.khachHang.find(k => k.id === order.idKhachHang);
  const tenKH = kh ? kh.tenKH : order.idKhachHang;

  // Columns: A=Ngày, B=Số phiếu, C-L=10 sản phẩm, M=Ghi chú
  const PRODUCTS = [
    { id: 'S01', name: 'Khánh An\n1kg',      color: 'BDD7EE' },
    { id: 'S02', name: 'Khánh An\n100g',     color: 'BDD7EE' },
    { id: 'S03', name: 'Khánh An xá',        color: 'BDD7EE' },
    { id: 'S04', name: 'An Hạ\nxá',          color: 'D9B3FF' },
    { id: 'S05', name: 'Phúc An 1kg',        color: 'FFAB91' },
    { id: 'S06', name: 'Phúc An 100g',       color: 'FFAB91' },
    { id: 'S07', name: 'Gà bóng bò\n1kg',    color: '92D050' },
    { id: 'S08', name: 'Gà bóng bò\n100g',   color: '92D050' },
    { id: 'S09', name: 'Gà bóng bò\nxá',    color: '92D050' },
    { id: 'S10', name: 'Sườn đứt',           color: 'C6EFCE' },
  ];

  const chiTietMap = {};
  order.chiTiet.forEach(c => { chiTietMap[c.idSP] = c; });

  const thanhTien = calcOrderTotal(order, data.sanPham);
  const canTT     = calcSoTienCanTT(order, data.sanPham);

  // --- Style helpers ---
  const fill  = (rgb) => ({ patternType: 'solid', fgColor: { rgb } });
  const border = (style = 'thin', rgb = 'AAAAAA') => ({
    top:    { style, color: { rgb } },
    bottom: { style, color: { rgb } },
    left:   { style, color: { rgb } },
    right:  { style, color: { rgb } },
  });
  const dotBottom = () => ({ bottom: { style: 'dotted', color: { rgb: 'AAAAAA' } } });

  const CENTER = { horizontal: 'center', vertical: 'center', wrapText: true };
  const LEFT   = { horizontal: 'left',   vertical: 'center' };
  const RIGHT  = { horizontal: 'right',  vertical: 'center' };

  // Cell builder: string
  const cs = (v, s = {}) => ({ v: v ?? '', t: 's', s });
  // Cell builder: number
  const cn = (v, s = {}) => ({ v: v || 0, t: 'n', s });

  const ws = {};

  // ── ROW 1: Khách hàng (A1:L1) | Ngày (M1) ──────────────────────────
  ws['A1'] = cs(`Khách hàng: ${tenKH}`, {
    font: { bold: true, color: { rgb: '1A9AB8' }, sz: 14 },
    alignment: CENTER,
  });
  // A1:L1 merged — fill empty cells
  'BCDEFGHIJKL'.split('').forEach(col => { ws[`${col}1`] = cs(''); });
  ws['M1'] = cs(fmtDate(order.ngay), {
    font: { bold: true, color: { rgb: 'FF0000' }, sz: 11 },
    alignment: { horizontal: 'right', vertical: 'center' },
  });

  // ── ROW 2: Merged labels | "Số thùng" header (C2:L2) ──────────────────
  const labelStyle = { font: { bold: true, sz: 11 }, alignment: CENTER, border: border(), fill: fill('FFFFFF') };
  ws['A2'] = cs('Ngày',     labelStyle);
  ws['B2'] = cs('Số phiếu', labelStyle);
  ws['C2'] = cs('Số thùng (10kg/thùng)', {
    font: { bold: true, sz: 12, color: { rgb: '000000' } },
    alignment: CENTER,
    border: border(),
    fill: fill('FFFF00'),
  });
  'DEFGHIJKL'.split('').forEach(col => {
    ws[`${col}2`] = cs('', { fill: fill('FFFF00'), border: border() });
  });
  ws['M2'] = cs('Ghi chú', labelStyle);

  // ── ROW 3: Product name sub-headers ────────────────────────────────────
  ws['A3'] = cs('', { border: border(), fill: fill('FFFFFF') });
  ws['B3'] = cs('', { border: border(), fill: fill('FFFFFF') });
  PRODUCTS.forEach((p, i) => {
    const col = String.fromCharCode(67 + i); // C=67
    ws[`${col}3`] = cs(p.name, {
      font: { bold: true, sz: 10 },
      alignment: CENTER,
      border: border(),
      fill: fill(p.color),
    });
  });
  ws['M3'] = cs('', { border: border(), fill: fill('FFFFFF') });

  // ── ROWS 4-6: Data rows (3 dòng giao hàng) ─────────────────────────────
  for (let r = 0; r < 3; r++) {
    const R = r + 4; // Excel row 4, 5, 6
    ws[`A${R}`] = cs(r === 0 ? fmtDate(order.ngay) : '', { border: border(), alignment: CENTER });
    ws[`B${R}`] = cs(r === 0 ? order.soDH          : '', { border: border(), alignment: CENTER });
    PRODUCTS.forEach((p, i) => {
      const col = String.fromCharCode(67 + i);
      const item = chiTietMap[p.id];
      const val = (r === 0 && item) ? item.soThungGiao : 0;
      ws[`${col}${R}`] = cn(val, { border: border(), alignment: RIGHT, fill: fill(p.color) });
    });
    ws[`M${R}`] = cs(r === 0 ? (order.ghiChu || '') : '', { border: border(), alignment: LEFT });
  }

  // ── ROW 7: Tổng số thùng giao ──────────────────────────────────────────
  ws['A7'] = cs('Tổng số thùng giao:', { font: { sz: 10 }, border: border(), alignment: LEFT });
  ws['B7'] = cs('', { border: border() });
  PRODUCTS.forEach((p, i) => {
    const col = String.fromCharCode(67 + i);
    const item = chiTietMap[p.id];
    ws[`${col}7`] = cn(item ? item.soThungGiao : 0, { border: border(), alignment: RIGHT });
  });
  ws['M7'] = cs('', { border: border() });

  // ── ROW 8: Tổng số thùng tính tiền (ĐỎ) ───────────────────────────────
  const redStyle = { font: { bold: true, color: { rgb: 'FF0000' }, sz: 10 }, border: border() };
  ws['A8'] = cs('Tổng số thùng tính tiền:', { ...redStyle, alignment: LEFT });
  ws['B8'] = cs('', { border: border() });
  PRODUCTS.forEach((p, i) => {
    const col = String.fromCharCode(67 + i);
    const item = chiTietMap[p.id];
    ws[`${col}8`] = cn(item ? item.soThungTinhTien : 0, { ...redStyle, alignment: RIGHT });
  });
  ws['M8'] = cs('', { border: border() });

  // ── ROW 9: Đơn giá ────────────────────────────────────────────────────
  ws['A9'] = cs('Đơn giá:', { font: { sz: 10 }, border: border(), alignment: LEFT });
  ws['B9'] = cs('', { border: border() });
  PRODUCTS.forEach((p, i) => {
    const col = String.fromCharCode(67 + i);
    const item = chiTietMap[p.id];
    ws[`${col}9`] = cn(item ? item.donGia : 0, { border: border(), alignment: RIGHT });
  });
  ws['M9'] = cs('', { border: border() });

  // ── ROW 10: Đơn giá tính tiền (ĐỎ) ────────────────────────────────────
  ws['A10'] = cs('Đơn giá tính tiền:', { ...redStyle, alignment: LEFT });
  ws['B10'] = cs('', { border: border() });
  PRODUCTS.forEach((p, i) => {
    const col = String.fromCharCode(67 + i);
    const item = chiTietMap[p.id];
    ws[`${col}10`] = cn(item ? item.donGia : 0, { ...redStyle, alignment: RIGHT });
  });
  ws['M10'] = cs('', { border: border() });

  // ── ROW 11: Thành tiền ────────────────────────────────────────────────
  ws['A11'] = cs('Thành tiền:', { font: { sz: 10 }, border: border(), alignment: LEFT });
  ws['B11'] = cs('', { border: border() });
  PRODUCTS.forEach((p, i) => {
    const col = String.fromCharCode(67 + i);
    const item = chiTietMap[p.id];
    const lineTotal = item ? item.soThungTinhTien * item.donGia : 0;
    ws[`${col}11`] = cn(lineTotal, { border: border(), alignment: RIGHT });
  });
  ws['M11'] = cs('', { border: border() });

  // ── ROW 12: Tổng số tiền — GRAY, merged C12:M12 ───────────────────────
  const GRAY = fill('BFBFBF');
  ws['A12'] = cs('Tổng số tiền:', {
    font: { bold: true, color: { rgb: 'FF0000' }, sz: 12 },
    fill: GRAY, border: border(), alignment: LEFT,
  });
  ws['B12'] = cs('', { fill: GRAY, border: border() });
  ws['C12'] = cn(thanhTien, {
    font: { bold: true, color: { rgb: 'FF0000' }, sz: 13 },
    fill: GRAY, border: border(), alignment: CENTER,
    numFmt: '#,##0',
  });
  'DEFGHIJKLM'.split('').forEach(col => {
    ws[`${col}12`] = cs('', { fill: GRAY, border: border() });
  });

  // ── ROWS 13-15: Cộng nợ / Trừ đã TT / Trừ chiết khấu ────────────────
  const summaryItems = [
    { label: 'Cộng nợ cũ:',         val: order.congNoTruoc || 0 },
    { label: 'Trừ đã thanh toán:',  val: order.daThanhToan || 0 },
    { label: 'Trừ chiết khấu:',     val: order.chietKhau   || 0 },
  ];
  summaryItems.forEach(({ label, val }, idx) => {
    const R = 13 + idx;
    ws[`A${R}`] = cs(label, { font: { sz: 10 }, alignment: LEFT,
      border: { top: border().top, bottom: dotBottom().bottom, left: border().left, right: border().right } });
    ws[`B${R}`] = cn(val, { font: { sz: 10 }, alignment: RIGHT, border: dotBottom() });
    'CDEFGHIJKLM'.split('').forEach(col => {
      ws[`${col}${R}`] = cs('', { border: dotBottom() });
    });
  });

  // ── ROW 16: Tiền cần thanh toán — YELLOW, merged C16:M16 ─────────────
  const YELLOW = fill('FFFF00');
  ws['A16'] = cs('Tiền cần thanh toán:', {
    font: { bold: true, color: { rgb: 'FF0000' }, sz: 12 },
    fill: YELLOW, border: border(), alignment: LEFT,
  });
  ws['B16'] = cs('', { fill: YELLOW, border: border() });
  ws['C16'] = cn(canTT, {
    font: { bold: true, color: { rgb: 'FF0000' }, sz: 13 },
    fill: YELLOW, border: border(), alignment: CENTER,
    numFmt: '#,##0',
  });
  'DEFGHIJKLM'.split('').forEach(col => {
    ws[`${col}16`] = cs('', { fill: YELLOW, border: border() });
  });

  // ── Merges ──────────────────────────────────────────────────────────────
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } },  // A1:L1  Khách hàng
    { s: { r: 1, c: 0 }, e: { r: 2, c: 0 } },   // A2:A3  Ngày
    { s: { r: 1, c: 1 }, e: { r: 2, c: 1 } },   // B2:B3  Số phiếu
    { s: { r: 1, c: 2 }, e: { r: 1, c: 11 } },  // C2:L2  Số thùng
    { s: { r: 1, c: 12 }, e: { r: 2, c: 12 } }, // M2:M3  Ghi chú
    { s: { r: 11, c: 2 }, e: { r: 11, c: 12 } },// C12:M12 Tổng số tiền
    { s: { r: 15, c: 2 }, e: { r: 15, c: 12 } },// C16:M16 Tiền cần TT
  ];

  // ── Column widths & row heights ─────────────────────────────────────────
  ws['!cols'] = [
    { wch: 24 },                              // A: label / Ngày
    { wch: 14 },                              // B: Số phiếu
    { wch: 13 }, { wch: 13 }, { wch: 13 },   // KA
    { wch: 11 },                              // An Hạ
    { wch: 13 }, { wch: 13 },                // Phúc An
    { wch: 14 }, { wch: 14 }, { wch: 13 },   // Gà bóng bò
    { wch: 11 },                              // Sườn đứt
    { wch: 16 },                              // Ghi chú
  ];
  ws['!rows'] = [
    { hpt: 22 },                              // R1  Khách hàng
    { hpt: 24 },                              // R2  Số thùng
    { hpt: 40 },                              // R3  Product names (wrap)
    { hpt: 20 }, { hpt: 20 }, { hpt: 20 },   // R4-6  Data rows
    { hpt: 20 }, { hpt: 20 },                 // R7-8  Tổng giao / tính tiền
    { hpt: 20 }, { hpt: 20 }, { hpt: 20 },   // R9-11 Đơn giá / thành tiền
    { hpt: 26 },                              // R12 Tổng số tiền
    { hpt: 20 }, { hpt: 20 }, { hpt: 20 },   // R13-15 Cộng nợ / trừ
    { hpt: 26 },                              // R16 Tiền cần TT
  ];

  ws['!ref'] = 'A1:M16';

  const wb = { SheetNames: ['Phiếu TT'], Sheets: { 'Phiếu TT': ws } };
  XLSX.writeFile(wb, `Phieu_TT_${order.soDH}_${tenKH}.xlsx`);
  showToast('Xuất phiếu thanh toán thành công!', 'success');
}

/* ---- Init page auth check ---- */
async function initPage(pageName) {
  const user = requireAuth();
  if (!user) return null;
  CURRENT_USER = user;
  const data = await loadData();
  renderSidebar(pageName);
  return data;
}
