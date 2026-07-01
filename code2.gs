const CONFIG = {
  SOURCE_SHEET: 'クロス申請データ_新', // データ本体のシート名
  CHART_SHEET:  '_chartdata',
  AGG_SHEET:    '_集計',
  INPUT_SHEET:  '_入力',
  FY_START_MONTH: 4,  // 年度開始月（4月始まり。暦年なら 1）
  MAX_MONTHS: 12,
  COL: { DATE:'申請日', ESC:'エスカレ', CIO:'CIO確認', WL:'ホワイトリスト',
         APP:'申請者所属', SYS:'対象システム', VERDICT:'承認ステータス', SEC:'セキュリティ相談' },
  V: { ESC_NG:'NG', CIO_REQ:'要', SEC_YES:'あり', SEC_NO:'なし' },
  COLORS: { self:'#43A047', esc:'#E53935', cio:'#FB8C00', line1:'#1565C0', line2:'#8E24AA',
            approved:'#43A047', canceled:'#9E9E9E', rejected:'#E53935' },
};

const pad = n => String(n).padStart(2, '0');
const ym = (y, m) => `${y}/${pad(m)}`;
const fyOf = (y, m) => (m >= CONFIG.FY_START_MONTH ? y : y - 1);
const fyLabel = fy => 'FY' + String(fy).slice(2);

// ============================ 入口 ============================
function run() {
  const t = new Date();
  let y = t.getFullYear(), m = t.getMonth(); // getMonth(0-11) がそのまま「先月(1-12)」
  if (m === 0) { m = 12; y--; }
  generate(y, m);
}

function generate(year, month) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const src = ss.getSheetByName(CONFIG.SOURCE_SHEET);
  if (!src) return Logger.log('シートなし：' + CONFIG.SOURCE_SHEET);

  const data = src.getDataRange().getValues();
  const headers = data[0], allRows = data.slice(1);
  const col = mapCols(headers);                                   // 列→index を1回だけ確定
  const rows = allRows.filter(r => inMonth(r[col.DATE], year, month));
  if (!rows.length) return Logger.log(`${ym(year, month)} はデータなし`);
  Logger.log('抽出：' + rows.length + '件');

  writeDetail(ss, headers, rows, year, month);
  const chart = buildChartData(ss, allRows, col);
  const agg = buildAgg(ss, rows, col);

  const name = ym(year, month);
  let sh = ss.getSheetByName(name); if (sh) ss.deleteSheet(sh);
  sh = ss.insertSheet(name);
  buildReport(sh, ss, rows, col, year, month, chart, agg);

  chart.fyOrder.forEach(fy => buildFY(ss, chart, fy));

  const cfg = inputCfg(ss);
  const file = cfg.tmpl.replace('{YYYYMM}', `${year}${pad(month)}`);
  const url = exportPdf(ss, sh, cfg.folderId, file);
  Logger.log('✓ 作成：' + name + (url ? ` / PDF: ${url}` : ''));
}

// ============================ 共通ロジック ============================
// 列名→列インデックスの辞書（前提：全カラム存在。欠落はログ警告のみ）
function mapCols(headers) {
  const col = {}, miss = [];
  for (const k in CONFIG.COL) {
    const i = headers.indexOf(CONFIG.COL[k]);
    if (i < 0) miss.push(CONFIG.COL[k]);
    col[k] = i;
  }
  if (miss.length) Logger.log('⚠ 見つからない列：' + miss.join('、'));
  return col;
}

function inMonth(v, y, m) {
  if (!v) return false;
  const d = new Date(v);
  return d.getFullYear() === y && d.getMonth() + 1 === m;
}

function verdict(v) {
  const s = String(v || '').toLowerCase();
  if (s.startsWith('approv')) return 'Approved';
  if (s.startsWith('cancel')) return 'Canceled';
  if (s.startsWith('reject')) return 'Rejected';
  return '';
}

function summarize(rows, col) {
  const total = rows.length;
  const cio = rows.filter(r => r[col.CIO] === CONFIG.V.CIO_REQ).length;
  const esc = rows.filter(r => r[col.ESC] === CONFIG.V.ESC_NG && r[col.CIO] !== CONFIG.V.CIO_REQ).length;
  const self = total - esc - cio;
  const pct = n => (total ? Math.round(n / total * 100) : 0);
  return { total, self, esc, cio, selfRate: pct(self), cioRate: pct(cio) };
}

function count(rows, idx) {
  const map = {};
  rows.forEach(r => { const v = r[idx] || '（空白）'; map[v] = (map[v] || 0) + 1; });
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

// ============================ シート出力 ============================
function writeDetail(ss, headers, rows, y, m) {
  const name = ym(y, m) + '_明細';
  let sh = ss.getSheetByName(name); if (sh) ss.deleteSheet(sh);
  sh = ss.insertSheet(name);
  const v = [headers, ...rows];
  sh.getRange(1, 1, v.length, headers.length).setValues(v);
  sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#37474F').setFontColor('#FFF');
  sh.setFrozenRows(1);
}

// 全期間の月次トレンドを _chartdata に出力
function buildChartData(ss, allRows, col) {
  const byMonth = {};
  allRows.forEach(r => {
    const v = r[col.DATE]; if (!v) return;
    const d = new Date(v), key = ym(d.getFullYear(), d.getMonth() + 1);
    (byMonth[key] = byMonth[key] || []).push(r);
  });
  let sh = ss.getSheetByName(CONFIG.CHART_SHEET); if (sh) ss.deleteSheet(sh);
  sh = ss.insertSheet(CONFIG.CHART_SHEET);
  sh.getRange(1, 1, 1, 6).setValues([['期間', '自己解決', 'エスカレ', 'CIO', '自己解決率', 'CIO確認率']]).setFontWeight('bold');

  const rowOf = {}, fyRange = {}, fyOrder = [];
  Object.keys(byMonth).sort().forEach((key, i) => {
    const [y, m] = key.split('/').map(Number);
    const s = summarize(byMonth[key], col), row = i + 2;
    sh.getRange(row, 1, 1, 6).setValues([[key, s.self, s.esc, s.cio, s.selfRate, s.cioRate]]);
    rowOf[key] = row;
    const fy = fyOf(y, m);
    if (!fyRange[fy]) { fyRange[fy] = { first: row, last: row }; fyOrder.push(fy); }
    fyRange[fy].last = row;
  });
  sh.hideSheet();
  return { sheet: sh, rowOf, fyRange, fyOrder };
}

// 各グラフ用の集計表を _集計 に出力し、参照レンジを返す
function buildAgg(ss, rows, col) {
  let sh = ss.getSheetByName(CONFIG.AGG_SHEET); if (sh) ss.deleteSheet(sh);
  sh = ss.insertSheet(CONFIG.AGG_SHEET);

  // システム × 承認可否（対象システムをカンマ分解）
  const sys = {};
  rows.forEach(r => {
    const v = verdict(r[col.VERDICT]);
    String(r[col.SYS] || '').split(',').map(s => s.trim()).filter(Boolean).forEach(n => {
      sys[n] = sys[n] || { Approved: 0, Canceled: 0, Rejected: 0 };
      if (v) sys[n][v]++;
    });
  });
  const names = Object.keys(sys).sort();
  sh.getRange(1, 1, 1, 4).setValues([['システム', 'Approved', 'Canceled', 'Rejected']]);
  names.forEach((n, i) => sh.getRange(i + 2, 1, 1, 4).setValues([[n, sys[n].Approved, sys[n].Canceled, sys[n].Rejected]]));
  const sysRange = sh.getRange(1, 1, Math.max(names.length, 1) + 1, 4);

  // セキュリティ相談
  const yes = rows.filter(r => r[col.SEC] === CONFIG.V.SEC_YES).length;
  const no = rows.filter(r => r[col.SEC] === CONFIG.V.SEC_NO).length;
  sh.getRange(1, 6, 3, 2).setValues([['区分', '件数'], ['あり', yes], ['なし', no]]);
  const secRange = sh.getRange(1, 6, 3, 2);

  const wlRange = writeKV(sh, count(rows, col.WL), 9);   // ホワイトリスト
  const apRange = writeKV(sh, count(rows, col.APP), 12);  // 申請者所属
  sh.hideSheet();
  return { sysRange, secRange, wlRange, apRange };
}

function writeKV(sh, data, startCol) {
  sh.getRange(1, startCol, 1, 2).setValues([['カテゴリ', '件数']]);
  data.forEach((d, i) => sh.getRange(i + 2, startCol, 1, 2).setValues([[d[0], d[1]]]));
  return sh.getRange(1, startCol, data.length + 1, 2);
}

// ============================ 報告シート ============================
function buildReport(sh, ss, rows, col, year, month, chart, agg) {
  for (let c = 1; c <= 9; c++) sh.setColumnWidth(c, 90);
  sh.getRange(1, 1, 1, 9).merge().setValue(`${year}年${month}月 月次KPI報告書`)
    .setFontSize(16).setFontWeight('bold').setBackground('#F5F5F5');

  const s = summarize(rows, col);
  [['総申請件数', s.total, '#E8F4F8', '#0066CC'],
   ['自己解決率', s.selfRate + '%', '#E8F5E9', '#00AA00'],
   ['エスカレ', s.esc, '#FFE6E6', '#CC0000'],
   ['CIO確認要', s.cio, '#FFF4E6', '#FF9900']].forEach((c, i) => {
    const c0 = i * 2 + 1;
    sh.getRange(3, c0, 1, 2).merge().setValue(c[0]).setFontColor('#666').setHorizontalAlignment('center');
    sh.getRange(4, c0, 1, 2).merge().setValue(c[1]).setFontSize(16).setFontWeight('bold')
      .setBackground(c[2]).setFontColor(c[3]).setHorizontalAlignment('center');
  });

  const cm = getComment(ss, year, month);
  sh.getRange(6, 1, 1, 9).merge().setValue('📝 前月からの改善点・分析').setFontWeight('bold').setBackground('#F5F5F5');
  sh.getRange(7, 1, 4, 9).merge().setWrap(true).setVerticalAlignment('top').setBackground('#FAFAFA')
    .setValue(`【前月からの改善点】\n${cm.improve || '（_入力に記入）'}\n\n【グラフ分析・説明】\n${cm.analysis || '（_入力に記入）'}`);

  mainChart(sh, chart, year, month, 12);
  sysChart(sh, agg.sysRange, 29);
  pie(sh, agg.wlRange, 'ホワイトリスト', 46, 1);
  pie(sh, agg.apRange, '申請者所属', 46, 4);
  pie(sh, agg.secRange, 'セキュリティ相談', 46, 7);
}

function getComment(ss, y, m) {
  const sh = ss.getSheetByName(CONFIG.INPUT_SHEET);
  if (!sh) return { improve: '', analysis: '' };
  const key = ym(y, m);
  const data = sh.getRange(7, 1, Math.max(sh.getLastRow() - 6, 1), 3).getValues();
  for (const r of data) {
    const cell = r[0] instanceof Date ? ym(r[0].getFullYear(), r[0].getMonth() + 1) : String(r[0] || '').trim();
    if (cell === key) return { improve: r[1] || '', analysis: r[2] || '' };
  }
  return { improve: '', analysis: '' };
}

// ============================ グラフ ============================
function combo(sheet, header, data, title, row) {
  const C = CONFIG.COLORS;
  return sheet.newChart().setChartType(Charts.ChartType.COMBO)
    .addRange(header).addRange(data).setNumHeaders(1).setPosition(row, 1, 0, 0)
    .setOption('title', title).setOption('isStacked', true).setOption('seriesType', 'bars')
    .setOption('series', {
      0: { color: C.self }, 1: { color: C.esc }, 2: { color: C.cio },
      3: { type: 'line', targetAxisIndex: 1, color: C.line1, lineWidth: 2 },
      4: { type: 'line', targetAxisIndex: 1, color: C.line2, lineWidth: 2 },
    })
    .setOption('vAxes', { 0: { title: '件数', minValue: 0 }, 1: { title: '率(%)', minValue: 0, maxValue: 100 } })
    .setOption('legend', { position: 'bottom' }).setOption('width', 600).setOption('height', 260).build();
}

function mainChart(sh, chart, year, month, row) {
  const fy = fyOf(year, month);
  const range = chart.fyRange[fy]; if (!range) return;
  const last = chart.rowOf[ym(year, month)] || range.last;
  const data = chart.sheet.getRange(range.first, 1, last - range.first + 1, 6);
  const header = chart.sheet.getRange(1, 1, 1, 6);
  sh.insertChart(combo(sh, header, data, `${fyLabel(fy)} 対応件数の内訳と推移`, row));
}

function buildFY(ss, chart, fy) {
  const name = 'KPI_' + fyLabel(fy);
  let sh = ss.getSheetByName(name); if (sh) ss.deleteSheet(sh);
  sh = ss.insertSheet(name);
  sh.getRange(1, 1, 1, 8).merge().setValue(`${fyLabel(fy)} 年度KPI推移`)
    .setFontSize(16).setFontWeight('bold').setBackground('#F5F5F5');
  const range = chart.fyRange[fy];
  const n = Math.min(range.last - range.first + 1, CONFIG.MAX_MONTHS);
  const data = chart.sheet.getRange(range.first, 1, n, 6);
  const header = chart.sheet.getRange(1, 1, 1, 6);
  sh.insertChart(combo(sh, header, data, `${fyLabel(fy)} 推移（最大12か月）`, 3));
}

function sysChart(sh, range, row) {
  const C = CONFIG.COLORS;
  sh.insertChart(sh.newChart().setChartType(Charts.ChartType.COLUMN)
    .addRange(range).setNumHeaders(1).setPosition(row, 1, 0, 0)
    .setOption('title', 'システム × 承認可否').setOption('isStacked', true)
    .setOption('series', { 0: { color: C.approved }, 1: { color: C.canceled }, 2: { color: C.rejected } })
    .setOption('legend', { position: 'bottom' }).setOption('width', 560).setOption('height', 240).build());
}

function pie(sh, range, title, row, col) {
  sh.insertChart(sh.newChart().setChartType(Charts.ChartType.PIE)
    .addRange(range).setPosition(row, col, 0, 0)
    .setOption('title', title).setOption('legend', { position: 'bottom' })
    .setOption('width', 230).setOption('height', 170).build());
}

// ============================ _入力・PDF ============================
function setupInputSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName(CONFIG.INPUT_SHEET)) return Logger.log('既に存在：' + CONFIG.INPUT_SHEET);
  const sh = ss.insertSheet(CONFIG.INPUT_SHEET);
  sh.getRange('A1').setValue('■ 出力設定').setFontWeight('bold');
  sh.getRange('A2').setValue('出力先フォルダID');
  sh.getRange('A3').setValue('ファイル名テンプレート');
  sh.getRange('B3').setValue('KPI報告_{YYYYMM}');
  sh.getRange('A5').setValue('■ 月別コメント').setFontWeight('bold');
  sh.getRange('A6:C6').setValues([['年月(YYYY/MM)', '前月からの改善点', 'グラフ分析・説明']])
    .setFontWeight('bold').setBackground('#E8E8E8');
  sh.setColumnWidth(1, 130); sh.setColumnWidth(2, 320); sh.setColumnWidth(3, 320);
  Logger.log('✓ 作成：' + CONFIG.INPUT_SHEET + '（出力先フォルダIDとコメントを入力してください）');
}

function inputCfg(ss) {
  const sh = ss.getSheetByName(CONFIG.INPUT_SHEET);
  if (!sh) return { folderId: '', tmpl: 'KPI報告_{YYYYMM}' };
  return { folderId: String(sh.getRange('B2').getValue() || '').trim(),
           tmpl: String(sh.getRange('B3').getValue() || 'KPI報告_{YYYYMM}').trim() };
}

function exportPdf(ss, sheet, folderId, name) {
  try {
    const m = 0.4;
    const p = ['format=pdf', 'gid=' + sheet.getSheetId(), 'size=A4', 'portrait=true', 'fitw=true',
      'scale=4', 'gridlines=false', 'sheetnames=false', 'printtitle=false', 'fzr=false',
      `top_margin=${m}`, `bottom_margin=${m}`, `left_margin=${m}`, `right_margin=${m}`].join('&');
    const url = `https://docs.google.com/spreadsheets/d/${ss.getId()}/export?${p}`;
    const res = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) { Logger.log('PDF失敗:' + res.getResponseCode()); return null; }
    const blob = res.getBlob().setName(name + '.pdf');
    let folder;
    try { folder = folderId ? DriveApp.getFolderById(folderId) : DriveApp.getRootFolder(); }
    catch (e) { Logger.log('フォルダID不正→マイドライブ：' + e); folder = DriveApp.getRootFolder(); }
    return folder.createFile(blob).getUrl();
  } catch (e) { Logger.log('PDFエラー：' + e); return null; }
}
