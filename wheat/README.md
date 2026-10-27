# 🌾 Wheat Monitoring Module — AGRI-EYE TRIO K (Romania)

Satellite-based winter wheat monitoring for Romania's grain belt (Bărăgan/Wallachian Plain), built on Google Earth Engine.

> 📄 **This folder contains the public demo script** (`wheat_monitoring_demo.js`, ~220 lines) — a simplified, single-sensor showcase of the system's design. The description below documents the **full production system** (1000+ lines); see [What's Different in the Demo](#-whats-different-in-the-demo-vs-the-full-system) for the exact gap.

## ✨ Full System Features

- **Growth vigor mapping** — NDVI/EVI/MSAVI-based classification calibrated for Romanian winter wheat's early-season tillering canopy (lower NDVI operating range than root/tuber crops).
- **Septoria Tritici Blotch climate-risk model** — combines Sentinel-1 radar-derived canopy moisture, spectral stress detection, and temperature (15–20 °C optimal infection window) to flag conditions favorable to Europe's dominant foliar wheat disease (rain-splash dispersal, high humidity).
- **Water stress detection** — NDWI + land-surface temperature fusion, calibrated for Romania's cooler spring climate (10–30 °C) vs. hotter dryland wheat regions.
- **Yield potential index** *(full version only)* — Zadoks-phenology-aware relative yield indicator, referenced to Zadoks GS39 (Flag Leaf), the key pre-heading stage for both yield potential and disease-monitoring decisions.
- **Smart Circles** — a randomized, area-proportional circle-density visualization per category (growth × 3, water stress, yield × 3, disease) for an at-a-glance field read.
- **Live Info Panel** — farm area (hectares), average temperature, total rainfall, and per-category statistics computed entirely server-side.
- **Resilience engineering** — async, error-tolerant `evaluate()` calls (no fragile synchronous `getInfo()` chains), a drawn-geometry-only study area with clear validation, and an explicit error-margin fix for `Geometry.area()`.

## 🔬 Romania Recalibration (vs. an earlier dryland-climate baseline)

| Parameter | Dryland baseline | Romania (this module) |
|---|---|---|
| Disease model | Yellow Rust (*Puccinia striiformis*), cool-dry highland pathogen | **Septoria Tritici Blotch** (*Zymoseptoria tritici*), humid-temperate pathogen |
| Disease optimal temperature | 10–15 °C | **15–20 °C** |
| Excellent-growth NDVI threshold | 0.38 | **0.50** (fertile chernozem soils + higher spring rainfall) |
| Water-stress temperature scale | 20–40 °C | **10–30 °C** |
| Area unit | Dunum (1,000 m²) | **Hectare** (10,000 m², EU standard) |
| Default monitoring season | Feb–May | **March–June** (matches Romania's winter-wheat calendar) |

## 🛰️ Data Sources

Sentinel-2 (optical), Sentinel-1 (radar, full version only), ERA5-Land (temperature), CHIRPS (rainfall) — all free and public.

## 🚀 How to Use

1. Open the [GEE Code Editor](https://code.earthengine.google.com/).
2. Copy `wheat_monitoring_demo.js` into a new script.
3. Draw your field boundary with the Polygon tool (creates the `geometry` import automatically).
4. Adjust `CONFIG.START_DATE` / `CONFIG.END_DATE` to your real season.
5. Run, and review the map layers, info panel, and console.

## 🔎 What's Different in the Demo vs. the Full System

| | Demo (this repo) | Full System |
|---|---|---|
| Map layers | 5 | 6 + True Color + Boundary |
| Smart-circle categories | 2 (Excellent Growth, Septoria Risk) | 8 |
| Disease model inputs | Spectral + Temperature (60/40) | Spectral + Temperature + Sentinel-1 radar humidity proxy (40/30/30) |
| Yield prediction model | ❌ | ✅ Zadoks-phenology-aware |
| Chart panel | ❌ | ✅ |
| Data-availability panel | ❌ | ✅ |
| Approx. length | ~220 lines | 1000+ lines |

## 📜 License

MIT — see the [repository LICENSE](../LICENSE).

## 👤 Author

Eng. Khaled Albakour — [@Khaled8M](https://github.com/Khaled8M)
