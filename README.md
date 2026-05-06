# tw-precision-neo
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Python](https://img.shields.io/badge/Python-3.14+-blue.svg)](https://www.python.org/)

**FreeStyle Precision Neo / Optium Neo ユーザーのための、現代的なデータ管理アプリ。**

[English README is here](./README.md)

`tw-precision-neo` は、公式ソフト（FreeStyle Auto-Assist）が最新のOSで動作しなくなったことに困っているユーザーのために開発された、オープンソースのデスクトップアプリです。

---

## 🌟 主な特徴

- **最新OS対応**: Apple Silicon (M1/M2/M3) Mac および Windows 11 に完全対応しています。
- **プライバシー重視**: 血糖データはクラウドには送信されず、あなたのPC内のローカルデータベース (SQLite) にのみ保存されます。
- **単位の自動変換**: 日本国内で一般的な `mg/dL` と、海外で使われる `mmol/L` の両方に対応。
- **インタラクティブな推移グラフ**: Chart.js を使用した、スムーズでズーム可能なグラフ表示。
- **臨床指標の自動計算**: 目標範囲内時間 (TIR) を自動計算し、管理の質を可視化します。
- **信頼の 'tw' シリーズ**: ネットワーク管理ツール「TWSNMP」シリーズの開発者による、透明性の高いプロジェクトです。

## 📱 対応デバイス

- **Abbott FreeStyle Precision Neo** (日本国内で一般的)
- **Abbott FreeStyle Optium Neo** (海外で一般的)

## 📦 インストール方法

### macOS (推奨)
[Homebrew](https://brew.sh/) 経由でインストールできます：
```bash
brew tap twsnmp/homebrew-taps
brew install --cask tw-precision-neo
```
*注意: アプリは Apple による公証(Notarized)を受けており、安全に実行できます。*

### Windows
- **Scoop を使う**:
  ```powershell
  scoop bucket add twsnmp https://github.com/twsnmp/scoop-bucket
  scoop install tw-precision-neo
  ```
- **手動インストール**: [GitHub Releases](https://github.com/twsnmp/tw-precision-neo/releases) ページから最新の `.msi` または `.zip` をダウンロードしてください。

## 🚀 使い方

1.  **接続**: お手持ちの Precision Neo を標準の Micro-USB ケーブルで PC に接続します。
2.  **同期**: アプリを起動し、**"Sync Device"** ボタンをクリックします。
3.  **分析**: 取得されたデータと推移グラフをすぐに確認できます。

## 💾 データの保存場所

すべてのデータは、お使いの PC 内のローカル SQLite データベースに保存されます。ファイルは以下の場所にあります：

- **macOS**: `~/Library/Application Support/tw_precision_neo/tw_precision_neo.db`
- **Windows**: `%LOCALAPPDATA%\tw_precision_neo\tw_precision_neo.db`

## 📸 スクリーンショット

*(プレースホルダー: ここにダッシュボードのスクリーンショットを追加)*

## ⚠️ 免責事項

**本ソフトウェアは「プログラム医療機器（SaMD）」ではありません。**
個人のログ管理および情報参照のみを目的としています。本ソフトが提供する情報を、インスリン投与量の調整など治療に関する決定に使用しないでください。治療に関する決定は、必ず主治医の診断と指導に基づいて行ってください。

## 🛠 開発者向け

このプロジェクトは、[TWSNMP](https://github.com/twsnmp) の開発者によって維持されている **'tw' シリーズ**の一部です。

開発環境のセットアップ ([mise](https://mise.jdx.dev/) が必要):
```bash
mise install
mise run setup
mise run dev
```

## 📄 ライセンス

**Apache License 2.0** の下で公開されています。詳細は [LICENSE](LICENSE) を参照してください。
