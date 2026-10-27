# 🛰️ AGRI-EYE TRIO K — Romania Crop Monitoring Platform

A professional satellite-based crop monitoring platform for Romania, covering the country's three major field crops: **Wheat 🌾, Potato 🥔, and Corn/Maize 🌽**. Built on **Google Earth Engine**, each crop module fuses free public satellite data (Sentinel-2, Sentinel-1, ERA5-Land, CHIRPS) into growth-vigor mapping, crop-specific disease climate-risk models, water-stress detection, and yield-potential estimation — all delivered through an interactive map with a live "smart circles" visual dashboard.

> This repository hosts the **public demo modules** for each crop — simplified, single-sensor versions designed to showcase the system's design and methodology. The full production systems (1000+ lines each) add multi-sensor SAR fusion, phenology-aware yield models, and an 8-category diagnostic dashboard per crop, and are available on request.

## 🌾🥔🌽 Why "Trio K"?

Three crops, one consistent engineering approach: the same core architecture (data fusion → vegetation indices → crop-specific disease model → growth/water-stress classification → "smart circles" visualization → live info panel) is re-derived and **genuinely recalibrated** for each crop's biology and Romania's growing conditions — not just relabeled. Each module's README documents exactly what was recalibrated and why.

## 📦 Modules

| Module | Crop | Disease Model | Key Growth Stage | Docs |
|---|---|---|---|---|
| [`/wheat`](./wheat) | Winter Wheat 🌾 | Septoria Tritici Blotch | Zadoks GS39 (Flag Leaf) | [README](./wheat/README.md) |
| [`/potato`](./potato) | Potato 🥔 | Late Blight (*P. infestans*) | BBCH 40 (Tuber Bulking) | [README](./potato/README.md) |
| [`/corn`](./corn) | Corn / Maize 🌽 | Northern Corn Leaf Blight (*E. turcicum*) | BBCH 65 (Flowering/Silking) | [README](./corn/README.md) |

## 🛰️ Shared Data Sources (all free & public)

| Source | Purpose |
|---|---|
| `COPERNICUS/S2_SR_HARMONIZED` | Sentinel-2 optical bands → vegetation indices |
| `COPERNICUS/S1_GRD` | Sentinel-1 radar → soil/canopy moisture proxy *(full versions only)* |
| `ECMWF/ERA5_LAND/HOURLY` | Air temperature (2m) |
| `UCSB-CHG/CHIRPS/DAILY` | Rainfall totals |

## 🏗️ Platform Architecture

AGRI-EYE TRIO K is designed as a two-engine platform:
- **Online Engine** (this repository): Google Earth Engine scripts for satellite-based monitoring — no hardware required, runs entirely in-browser.
- **Offline Engine** *(companion project)*: a Python-based analysis engine for drone imagery, with a universal sensor adapter architecture, for farms needing higher-resolution, on-demand data beyond satellite revisit cycles.

A bilingual (English/Romanian) landing page introduces the platform to Romanian agribusinesses and partners.

## 🚀 How to Use Any Module

1. Open the [Google Earth Engine Code Editor](https://code.earthengine.google.com/) (free GEE account required).
2. Copy the script from the relevant crop folder into a new script.
3. Draw your field boundary with the **Polygon** tool above the map (GEE names it `geometry` automatically).
4. Adjust the `CONFIG` dates to your real planting/harvest window.
5. Click **Run** and review the map layers, info panel, and console report.

> 💻 Use a desktop/laptop browser — the GEE Code Editor is unreliable on mobile, especially with browser translation features enabled.

## ⚠️ Disclaimer

These are decision-support / research prototypes. Thresholds and weights (vegetation-index cut-points, disease-risk weighting, yield models) are expert-estimated from agronomic literature, not field-calibrated with verified ground-truth data for every specific region. Validate against real field observations before operational or commercial use.

## 📜 License

MIT — see [LICENSE](LICENSE).

## 👤 Author

**Eng. Khaled Albakour (Khaled Moussa)** — GIS & Remote Sensing Developer, KM Company.
GitHub: [@Khaled8M](https://github.com/Khaled8M)

---

# 🛰️ منصة AGRI-EYE TRIO K لمراقبة المحاصيل في رومانيا

منصة احترافية لمراقبة المحاصيل بالأقمار الصناعية مخصصة لرومانيا، تغطي ثلاثة محاصيل رئيسية: **القمح 🌾، البطاطا 🥔، والذرة 🌽**. مبنية على Google Earth Engine، وتدمج بيانات ساتلية مجانية (Sentinel-2، Sentinel-1، ERA5-Land، CHIRPS) لإنتاج خرائط حيوية النمو، ونماذج خطر مرضي مناخي خاصة بكل محصول، وكشف الإجهاد المائي، وتقدير الإنتاجية.

> يستضيف هذا المستودع **النسخ التجريبية العامة** من كل محصول — نسخ مبسّطة لعرض منهجية النظام. الأنظمة الإنتاجية الكاملة (1000+ سطر لكل محصول) تضيف اندماج رادار متعدد المستشعرات، ونماذج إنتاجية مرتبطة بأطوار النمو، ولوحة تشخيص من 8 فئات — متوفرة عند الطلب.

**لماذا "Trio K"؟** ثلاثة محاصيل، نفس المنهجية الهندسية المتسقة — لكن مع إعادة معايرة زراعية حقيقية لكل محصول حسب بيولوجيته وظروف رومانيا، موثقة بالتفصيل في README الخاص بكل وحدة.
