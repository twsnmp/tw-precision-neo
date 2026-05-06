# tw-precision-neo
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Python](https://img.shields.io/badge/Python-3.14+-blue.svg)](https://www.python.org/)

**A modern, lightweight data analyst for FreeStyle Precision Neo & Optium Neo.**

[日本語のREADMEはこちら](./README_ja.md)

`tw-precision-neo` is a privacy-first desktop application designed for users of the FreeStyle Precision Neo and Optium Neo blood glucose meters. As the official "FreeStyle Auto-Assist" software has become incompatible with modern operating systems, this tool provides a reliable, open-source alternative to keep your health data accessible.

---

## 🌟 Key Features

- **Modern OS Support**: Fully compatible with **macOS (Apple Silicon M1/M2/M3)** and **Windows 11**.
- **Privacy First**: Your health data belongs to you. All readings are stored in a local SQLite database on your computer. No cloud, no tracking.
- **Global Ready**: Supports both `mg/dL` (Japan/US) and `mmol/L` (International) units.
- **Interactive Visualization**: View your glucose trends with smooth, zoomable charts powered by Chart.js.
- **Clinical Insights**: Automatically calculates "Time in Range" (TIR) to help you understand your management quality.
- **Lightweight & Fast**: Built with Python and `pywebview` for a native-like experience without the bloat.

## 📱 Supported Devices

- **Abbott FreeStyle Precision Neo** (Common in Japan)
- **Abbott FreeStyle Optium Neo** (Common internationally)

## 📦 Installation

### macOS (Recommended)
Install via [Homebrew](https://brew.sh/):
```bash
brew tap twsnmp/homebrew-taps
brew install --cask tw-precision-neo
```
*Note: The app is notarized by Apple for a secure installation.*

### Windows
- **Via Scoop**:
  ```powershell
  scoop bucket add twsnmp https://github.com/twsnmp/scoop-bucket
  scoop install tw-precision-neo
  ```
- **Manual**: Download the latest `.msi` or `.zip` from the [GitHub Releases](https://github.com/twsnmp/tw-precision-neo/releases) page.

## 🚀 How to Use

1.  **Connect**: Plug your FreeStyle device into your computer using a standard Micro-USB cable.
2.  **Sync**: Open the app and click the **"Sync Device"** button.
3.  **Analyze**: View your latest readings and interactive trend charts immediately.

## 📸 Screenshots

*(Placeholder: Add screenshots of the dashboard here)*

## ⚠️ Disclaimer

**This software is NOT a Medical Device (SaMD).**
It is intended for personal data logging and informational purposes only. Do not use the information provided by this software to make treatment decisions (such as insulin dosage adjustments). Always consult with a qualified healthcare professional or physician for any medical diagnosis or treatment.

## 🛠 For Developers

This project is part of the **'tw' series**, maintained by the developer of [TWSNMP](https://github.com/twsnmp).

To set up the development environment (requires [mise](https://mise.jdx.dev/)):
```bash
mise install
mise run setup
mise run dev
```

## 📄 License

Licensed under the **Apache License 2.0**. See [LICENSE](LICENSE) for details.
