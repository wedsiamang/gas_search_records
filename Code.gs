const SHEET_MAP = {
  "A": "A",
  "B": "B",
  "C": "C",
  "D": "D",
  "E": "E",
};

function doGet(e) {
  const path = e.parameter.path || "A";
  const sheetName = SHEET_MAP[path] || "A";

  const template = HtmlService.createTemplateFromFile("index");
  template.sheetName = sheetName;
  template.url = ScriptApp.getService().getUrl();
  template.keys = Object.keys(SHEET_MAP);
  return template.evaluate()
    .setTitle(sheetName)
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function include(filename, params) {
  const t = HtmlService.createTemplateFromFile(filename);
  if (params) Object.assign(t, params);
  return t.evaluate().getContent();
}

function getSheetData(sheetName) {
  const allowed = Object.values(SHEET_MAP);
  if (allowed.indexOf(sheetName) === -1) return [["Sheet is Unknown"]];

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [["Sheet is Unknown"]];
  return sheet.getDataRange().getValues();
}

function safeUrl(value) {
  const s = String(value).trim();
  if (/^https?:\/\//i.test(s)) return encodeURI(s);
  return "";
}
