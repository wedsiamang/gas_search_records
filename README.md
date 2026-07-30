## gas_search_records

### Overview
A data-viewing tool built with Google Apps Script and Bootstrap 5.
It displays multiple spreadsheet tabs as switchable table views, with keyword search across all columns.

### Tech Stack
- Google Apps Script (server-side, HTML templates)
- Bootstrap 5 (responsive table layout)
- Vanilla JS (client-side search)

### Design Highlights
- Receives a category via `e.parameter` and maps it to a sheet name through `SHEET_MAP`; unexpected values fall back to the default tab
- `SHEET_MAP` is the single source of config — the navigation tabs are generated from its keys by looping, so adding a tab means editing the map only
- The HTML is shared as a single template; only the passed sheet name changes
- `include()` separates out the navigation partial — the same idea as JSP's `<%@ include %>`, ported to GAS templates
- URL cells go through `safeUrl()`, which rejects non-`http/https` schemes and applies `encodeURI()` before output

### Security Notes
- `getSheetData` rejects any name not in `SHEET_MAP`'s values, so an arbitrary sheet name passed through the template is still blocked
- Publish using the web app's `/exec` URL; `/dev` is for testing only

### Background
This applies concepts I used in JavaEE / JSP development — sharing parts via `include`, switching views by parameter, and Bootstrap — to the HTML template structure of GAS.

References:
- GAS page navigation
    - https://web-breeze.net/htmlservice-spa-pagechange/
- Turning a spreadsheet into a table web app
    - https://web-breeze.net/spreadsheet-htmlview-tool/
- include
    - https://developers.google.com/apps-script/guides/html/best-practices?hl=ja
- Object.assign
    - https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Object/assign
- Scriptlets
    - https://developers.google.com/apps-script/guides/html/templates?hl=ja
- Bootstrap
    - https://getbootstrap.jp/docs/5.3/layout/containers
- CSS
    - https://developer.mozilla.org/ja/docs/Web/CSS/Reference/Properties/table-layout
- DOM
    - https://developer.mozilla.org/ja/docs/Web/API/Document/getElementById
    - https://developer.mozilla.org/ja/docs/Web/API/EventTarget/addEventListener
    - https://developer.mozilla.org/ja/docs/Web/API/Document/querySelectorAll

### Known Limitations
- Every request fetches all rows and renders them all before filtering on the client, so it's not suited to large datasets
- Authentication and access control depend on the web app's deployment settings; there is no row-level permission handling

### Sample Data
Create sheet tabs A–E in the spreadsheet, each with dummy data using a different column layout.
Switching from the navigation displays the table for the corresponding sheet.

---

## gas_search_records

### 概要
Google Apps Script + Bootstrap 5 で作成したデータ閲覧ツール。
スプレッドシートの複数タブを画面切り替えで一覧表示し、全列キーワード検索に対応。

### 技術構成
- Google Apps Script（サーバーサイド・HTMLテンプレート）
- Bootstrap 5（レスポンシブ表レイアウト）
- Vanilla JS（クライアントサイド検索）

### 工夫した点
- `e.parameter` でカテゴリを受け取り、`SHEET_MAP` でシート名にマッピング。想定外の値は既定タブにフォールバック
- `SHEET_MAP` を唯一の設定源とし、ナビゲーションのタブもキーからループ生成（追加はマップ1箇所の変更で済む）
- HTMLを1枚に共通化し、渡すシート名だけ切り替える設計
- `include()` でナビゲーション部分を分離。JSP の `<%@ include %>` に相当する発想を GAS のテンプレートに置き換えた
- URL セルは `safeUrl()` で `http/https` 以外を弾き、`encodeURI()` を通してから出力

### セキュリティ上の注意
- `getSheetData` は `SHEET_MAP` の値以外を拒否する（テンプレート経由で任意シート名を渡されても弾く）
- 公開は Web アプリの `/exec` URL を使用。`/dev` はテスト用

### 背景
JavaEE / JSP での開発で使っていた「include によるパーツ共通化」「パラメータでの画面切り替え」「Bootstrap」の考え方を、GAS の HTML テンプレート構造に応用した。

参考サイト：
- GAS画面遷移
    - https://web-breeze.net/htmlservice-spa-pagechange/
- スプシを表ウェブアプリ化する
    - https://web-breeze.net/spreadsheet-htmlview-tool/
- include
    - https://developers.google.com/apps-script/guides/html/best-practices?hl=ja
- Object.assign
    - https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Object/assign
- スクリプトレット
    - https://developers.google.com/apps-script/guides/html/templates?hl=ja
- Bootstrap
    - https://getbootstrap.jp/docs/5.3/layout/containers
- CSS
    - https://developer.mozilla.org/ja/docs/Web/CSS/Reference/Properties/table-layout
- DOM
    - https://developer.mozilla.org/ja/docs/Web/API/Document/getElementById
    - https://developer.mozilla.org/ja/docs/Web/API/EventTarget/addEventListener
    - https://developer.mozilla.org/ja/docs/Web/API/Document/querySelectorAll

### 既知の制限
- 全行を毎リクエスト取得し、クライアントで全行描画してから検索でフィルタするため、大量データには不向き
- 認証・アクセス制御は Web アプリの公開設定に依存（行レベルの権限管理はしていない）

### サンプルデータ
スプレッドシートに A〜E のシートタブを作成し、それぞれ異なる列構成のダミーデータを用意。
ナビゲーションから切り替えると、対応するシートの表が表示される。
