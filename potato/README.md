# 🥔 Potato Monitoring Module — AGRI-EYE TRIO K (Romania)

Satellite-based potato monitoring for Romania, built on Google Earth Engine.

> 📄 **This folder contains the public demo script** (`potato_monitoring_demo.js`, ~210 lines) — a simplified, single-sensor showcase of the system's design. The description below documents the **full production system** (1000+ lines); see [What's Different in the Demo](#-whats-different-in-the-demo-vs-the-full-system) for the exact gap.

## ✨ Full System Features

- **Growth vigor mapping** — NDVI/EVI/MSAVI-based classification calibrated for potato's dense full-canopy cover (higher NDVI operating range than early-season wheat).
- **Late Blight climate-risk model** — combines Sentinel-1 radar-derived canopy moisture, spectral stress detection, and temperature (10–20 °C optimal sporulation window) to flag conditions favorable to *Phytophthora infestans*, the most destructive potato disease in Europe.
- **Water stress detection** — NDWI + land-surface temperature fusion, calibrated for Romania's temperate climate (15–32 °C).
- **Yield potential index** *(full version only)* — BBCH-phenology-aware relative yield indicator, referenced to BBCH 40 (Tuber Bulking), the key rapid-growth stage.
- **Smart Circles** — a randomized, area-proportional circle-density visualization per category (growth × 3, water stress, yield × 3, disease) for an at-a-glance field read.
- **Live Info Panel** — farm area (hectares), average temperature, total rainfall, and per-category statistics computed entirely server-side.
- **Resilience engineering** — async, error-tolerant `evaluate()` calls (no fragile synchronous `getInfo()` chains), a drawn-geometry-only study area with clear validation, and an explicit error-margin fix for `Geometry.area()`.

## 🔬 Romania Recalibration Highlights

| Parameter | Value |
|---|---|
| Disease model | Late Blight (*Phytophthora infestans*), 10–20 °C optimal window |
| Excellent-growth NDVI threshold | 0.65 (dense full-canopy cover) |
| Sentinel-1 SAR moisture scaling | -22 to -9 dB (calibrated for Romania's temperate climate) |
| Water-stress temperature scale | 15–32 °C |
| Yield model reference NDVI | 0.75 (potato full-canopy peak) |
| Area unit | Hectare (10,000 m², EU standard) |
| Default monitoring season | May–September |

## 🛰️ Data Sources

Sentinel-2 (optical), Sentinel-1 (radar, full version only), ERA5-Land (temperature), CHIRPS (rainfall) — all free and public.

## 🚀 How to Use

1. Open the [GEE Code Editor](https://code.earthengine.google.com/).
2. Copy `potato_monitoring_demo.js` into a new script.
3. Draw your field boundary with the Polygon tool (creates the `geometry` import automatically).
4. Adjust `CONFIG.START_DATE` / `CONFIG.END_DATE` to your real season.
5. Run, and review the map layers, info panel, and console.

## 🔎 What's Different in the Demo vs. the Full System

| | Demo (this repo) | Full System |
|---|---|---|
| Map layers | 5 | 6 + True Color + Boundary |
| Smart-circle categories | 2 (Excellent Growth, Blight Risk) | 8 |
| Disease model inputs | Spectral + Temperature (60/40) | Spectral + Temperature + Sentinel-1 radar humidity proxy (40/30/30) |
| Yield prediction model | ❌ | ✅ BBCH-phenology-aware |
| Chart panel | ❌ | ✅ |
| Data-availability panel | ❌ | ✅ |
| Approx. length | ~210 lines | 1000+ lines |

## 📜 License

MIT — see the [repository LICENSE](../LICENSE).

## 👤 Author

Eng. Khaled Albakour — [@Khaled8M](https://github.com/Khaled8M)
