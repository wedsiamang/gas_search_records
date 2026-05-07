//sheetNameをオブジェクト key(parameterとして使う) : value (実際のsheetName)
const SHEET_MAP = {
  "A": "A",
  "B": "B",
  "C": "C",
  "D": "D",
  "E": "E",
};

function doGet(e) {
  //選択されたparameterを受け取る
  const path = e.parameter.path || "A";
  //SHEET_MAPからpathと一致するものを取得
  const sheetName = SHEET_MAP[path] || "A";
//htmlオブジェクトの作成
  const template = HtmlService.createTemplateFromFile("index");
  //sheetName をindexに渡す準備
  template.sheetName = sheetName;
  //webapp 画面urlをindexに渡す準備
  template.url = ScriptApp.getService().getUrl();

  return template.evaluate()
    .setTitle(sheetName)
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function include(filename, params) {
  const t = HtmlService.createTemplateFromFile(filename);
  if (params) Object.assign(t, params);
  return t.evaluate().getContent();
}
/*解説
index で呼んでいるinclude関数の裏側の処理)
include(filename,params)filename(html)のparams(url+sheetName)を取得する : https://developers.google.com/apps-script/guides/html/best-practices?hl=ja
Object.assign(t,params) tをparamsで上書きする : https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Object/assign
HTMLテキストとして返す
*/

function getSheetData(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [["Sheet is Unknown"]];
  return sheet.getDataRange().getValues();
}
/*
指定されたスプレッドシート・シート名のデータを全行返す
*/