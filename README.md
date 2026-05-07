## gas_search_records

### 概要
Google Apps Script + Bootstrap 5 で作成したデータ閲覧ツール。
スプレッドシートの複数タブを画面切り替えで一覧表示し、全列キーワード検索に対応。

### 技術構成
- Google Apps Script（サーバーサイド・HTMLテンプレート）
- Bootstrap 5（レスポンシブ表レイアウト）
- Vanilla JS（クライアントサイド検索）

### 工夫した点
- `e.parameter` でカテゴリを受け取りシート名にマッピング
- HTMLを1枚に共通化し、シート名だけ切り替える設計（AIで勉強）
- `include()` 関数でナビゲーションのコード短縮

### 背景
JavaEE / JSP での開発で使用していた、include とparameter画面切り替え、Bootstrapを GASのHTMLテンプレート構造に応用。

参考サイト：
- GAS画面遷移
  - https://web-breeze.net/htmlservice-spa-pagechange/
- スプシを表ウェブアプリ化する
  - https://web-breeze.net/spreadsheet-htmlview-tool/
- include
  -  https://developers.google.com/apps-script/guides/html/best-practices?hl=ja
-  Object.assignt
  -  https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Object/assign
-  スクリプトレッド
  -  https://developers.google.com/apps-script/guides/html/templates?hl=ja
-  BootStrap
  -  https://getbootstrap.jp/docs/5.3/layout/containers
-  DOM
  -  https://developer.mozilla.org/ja/docs/Web/API/Document/getElementById
  -  https://developer.mozilla.org/ja/docs/Web/API/EventTarget/addEventListener
  -  https://developer.mozilla.org/ja/docs/Web/API/Document/querySelectorAll 

### サンプルデータ
スプレッドシートに A〜E のシートタブを作成し、それぞれ異なる列構成のダミーデータを用意。
Appナビゲーションから切り替えると、対応するシートの表が表示される。






