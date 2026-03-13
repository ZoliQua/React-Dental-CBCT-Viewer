<p align="center">
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react" />
  <img src="https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat-square&logo=typescript" />
  <img src="https://img.shields.io/badge/Vite-5.4-646CFF?style=flat-square&logo=vite" />
  <img src="https://img.shields.io/badge/Cornerstone3D-2.0-FF6B35?style=flat-square" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=flat-square&logo=tailwindcss" />
</p>

---

# 🇭🇺 Magyar

## 🦷 DQ DICOM Viewer

CT DICOM megjelenítő és implantátum-tervező alkalmazás. Önállóan futtatható, később git submodule-ként integrálható a **DentalQuoteCreator** rendszerbe.

### ✨ Funkciók

| | Funkció | Leírás |
|---|---------|--------|
| 📂 | **DICOM betöltés** | Drag & drop fájlimport, sorozat-felismerés, betöltési folyamatjelző |
| 🖥️ | **2D MPR nézetek** | Axiális, koronális, szagittális síkok valós idejű navigációval |
| 🎛️ | **Ablak/Szint** | 6 preset (Csont, Lágyrész, Tüdő, Agy, Fogászat, Implantátum) + egérhúzás |
| 📐 | **Mérőeszközök** | Távolság, szög, ellipszis/kör/téglalap ROI, szabadkézi rajz, HU szonda, nyíl |
| 🦴 | **Panoráma OPG** | Ívelt síkú rekonstrukció 9 vezérlőpontos CatmullRom görbével |
| 🔪 | **Keresztmetszet** | Az ívgörbére merőleges szelet, ±30° dönthető |
| 🔩 | **Implantátum tervezés** | Elhelyezés, átmérő (3–6 mm), hossz (6–16 mm), szög beállítás |
| 🖼️ | **PNG export** | Panoráma és keresztmetszet mentése képként |
| ⌨️ | **Billentyűparancsok** | W/L, Pan, Zoom, Scroll, mérőeszközök egy gombnyomásra |
| 📏 | **Elrendezések** | 1×1, 2×2, 1+3, Panoráma 1×2, Panoráma 2+1 |

### 🛠️ Telepítés és futtatás

```bash
# Függőségek telepítése
npm install

# Fejlesztői szerver indítása (port 3340)
npm run dev

# Produkciós build
npm run build
```

### 📁 Projektstruktúra

```
src/
├── components/          # React UI komponensek
│   ├── layout/          #   Toolbar, ViewerShell
│   ├── viewport/        #   2D, 3D, MPR, Panoráma, Keresztmetszet
│   ├── implant/         #   Implantátum overlay és tulajdonságok
│   ├── panoramic/       #   Ívgörbe szerkesztő
│   └── tools/           #   Ablak/Szint kezelő
├── context/             # Globális állapotkezelés (React Context + useReducer)
├── core/                # DICOM betöltés, CPR motor, eszközkezelő
├── types/               # TypeScript típusdefiníciók
├── workers/             # Web Worker DICOM dekódoláshoz
└── hooks/               # Egyedi React hook-ok
```

### ⌨️ Billentyűparancsok

| Billentyű | Eszköz | | Billentyű | Eszköz |
|-----------|--------|---|-----------|--------|
| `W` | Ablak/Szint | | `L` | Távolság |
| `P` | Mozgatás | | `A` | Szög |
| `Z` | Nagyítás | | `E` | Ellipszis |
| `S` | Görgetés | | `C` | Kör |
| `X` | Szálkereszt | | `R` | Téglalap |
| `F` | Szabadkézi | | `B` | Kétirányú |
| `H` | HU szonda | | `N` | Nyíl |

---

# 🇬🇧 English

## 🦷 DQ DICOM Viewer

CT DICOM viewer and implant planning application. Runs standalone and can be integrated as a git submodule into the **DentalQuoteCreator** system.

### ✨ Features

| | Feature | Description |
|---|---------|-------------|
| 📂 | **DICOM Loading** | Drag & drop file import, series recognition, progress tracking |
| 🖥️ | **2D MPR Views** | Axial, coronal, sagittal planes with real-time navigation |
| 🎛️ | **Window/Level** | 6 presets (Bone, Soft Tissue, Lung, Brain, Dental, Implant) + mouse drag |
| 📐 | **Measurement Tools** | Length, angle, elliptical/circle/rectangle ROI, freehand, HU probe, arrow |
| 🦴 | **Panoramic OPG** | Curved planar reformation with 9-point CatmullRom spline |
| 🔪 | **Cross-Section** | Perpendicular slice to arch curve, tiltable ±30° |
| 🔩 | **Implant Planning** | Placement, diameter (3–6 mm), length (6–16 mm), angle adjustment |
| 🖼️ | **PNG Export** | Save panoramic and cross-section images |
| ⌨️ | **Keyboard Shortcuts** | W/L, Pan, Zoom, Scroll, measurement tools at a keystroke |
| 📏 | **Layouts** | 1×1, 2×2, 1+3, Panoramic 1×2, Panoramic 2+1 |

### 🛠️ Installation & Running

```bash
# Install dependencies
npm install

# Start dev server (port 3340)
npm run dev

# Production build
npm run build
```

### 📁 Project Structure

```
src/
├── components/          # React UI components
│   ├── layout/          #   Toolbar, ViewerShell
│   ├── viewport/        #   2D, 3D, MPR, Panoramic, Cross-Section
│   ├── implant/         #   Implant overlay & properties
│   ├── panoramic/       #   Arch curve editor
│   └── tools/           #   Window/Level controls
├── context/             # Global state management (React Context + useReducer)
├── core/                # DICOM loading, CPR engine, tool manager
├── types/               # TypeScript type definitions
├── workers/             # Web Worker for DICOM decoding
└── hooks/               # Custom React hooks
```

### 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript 5.5 |
| Build | Vite 5.4 |
| Styling | Tailwind CSS 3.4 |
| DICOM | Cornerstone3D v2 + dicom-parser |
| State | React Context + useReducer |

### 🔧 Key Architecture Decisions

- **Canvas-based OPG/Cross-Section** — Direct canvas rendering instead of Cornerstone StackViewport for custom CPR views
- **Arc-length reparameterization** — Eliminates panoramic distortion from uneven control point spacing
- **ES Module Web Worker** — Custom decoder worker with static JS imports and lazy WASM codec loading
- **SharedArrayBuffer** — COOP/COEP headers enabled for multi-threaded DICOM decoding

### ⌨️ Keyboard Shortcuts

| Key | Tool | | Key | Tool |
|-----|------|---|-----|------|
| `W` | Window/Level | | `L` | Length |
| `P` | Pan | | `A` | Angle |
| `Z` | Zoom | | `E` | Elliptical ROI |
| `S` | Scroll | | `C` | Circle ROI |
| `X` | Crosshairs | | `R` | Rectangle ROI |
| `F` | Freehand | | `B` | Bidirectional |
| `H` | HU Probe | | `N` | Arrow |

---

# 🇩🇪 Deutsch

## 🦷 DQ DICOM Viewer

CT-DICOM-Viewer und Implantatplanungs-Anwendung. Läuft eigenständig und kann als Git-Submodul in das **DentalQuoteCreator**-System integriert werden.

### ✨ Funktionen

| | Funktion | Beschreibung |
|---|----------|-------------|
| 📂 | **DICOM-Import** | Drag & Drop, Serienerkennung, Fortschrittsanzeige |
| 🖥️ | **2D-MPR-Ansichten** | Axiale, koronale, sagittale Ebenen mit Echtzeit-Navigation |
| 🎛️ | **Fenster/Ebene** | 6 Voreinstellungen (Knochen, Weichgewebe, Lunge, Gehirn, Dental, Implantat) + Maus |
| 📐 | **Messwerkzeuge** | Strecke, Winkel, Ellipse/Kreis/Rechteck-ROI, Freihand, HU-Sonde, Pfeil |
| 🦴 | **Panorama-OPG** | Gebogene Ebenenrekonstruktion mit 9-Punkt-CatmullRom-Kurve |
| 🔪 | **Querschnitt** | Senkrechter Schnitt zur Bogenkurve, kippbar ±30° |
| 🔩 | **Implantatplanung** | Platzierung, Durchmesser (3–6 mm), Länge (6–16 mm), Winkeleinstellung |
| 🖼️ | **PNG-Export** | Panorama- und Querschnittbilder speichern |
| ⌨️ | **Tastenkürzel** | W/L, Pan, Zoom, Scroll, Messwerkzeuge per Tastendruck |
| 📏 | **Layouts** | 1×1, 2×2, 1+3, Panorama 1×2, Panorama 2+1 |

### 🛠️ Installation und Ausführung

```bash
# Abhängigkeiten installieren
npm install

# Entwicklungsserver starten (Port 3340)
npm run dev

# Produktions-Build
npm run build
```

### 📁 Projektstruktur

```
src/
├── components/          # React-UI-Komponenten
│   ├── layout/          #   Toolbar, ViewerShell
│   ├── viewport/        #   2D, 3D, MPR, Panorama, Querschnitt
│   ├── implant/         #   Implantat-Overlay und Eigenschaften
│   ├── panoramic/       #   Bogenkurven-Editor
│   └── tools/           #   Fenster/Ebene-Steuerung
├── context/             # Globale Zustandsverwaltung (React Context + useReducer)
├── core/                # DICOM-Laden, CPR-Engine, Werkzeugmanager
├── types/               # TypeScript-Typdefinitionen
├── workers/             # Web Worker für DICOM-Dekodierung
└── hooks/               # Eigene React-Hooks
```

### ⌨️ Tastenkürzel

| Taste | Werkzeug | | Taste | Werkzeug |
|-------|----------|---|-------|----------|
| `W` | Fenster/Ebene | | `L` | Strecke |
| `P` | Verschieben | | `A` | Winkel |
| `Z` | Zoom | | `E` | Ellipse |
| `S` | Scrollen | | `C` | Kreis |
| `X` | Fadenkreuz | | `R` | Rechteck |
| `F` | Freihand | | `B` | Bidirektional |
| `H` | HU-Sonde | | `N` | Pfeil |

---

<p align="center">
  <sub>Built with 🦷 for dental professionals</sub>
</p>
