// ============================================================
// WHEAT MONITORING SYSTEM - SUPER LITE (DEMO) V1.0 2026
// Public showcase version - Romania Wheat Agriculture (Bărăgan/Wallachian Plain)
// Built on Google Earth Engine using free, public satellite data:
//   - Sentinel-2 (optical vegetation indices)
//   - ERA5-Land (air temperature)
//   - CHIRPS (rainfall)
//
// Recalibrated from the Syria Wheat version for Romania's cooler, wetter
// temperate-continental climate and EU farming conventions:
//   - Disease model switched from Yellow Rust (dry Mediterranean pathogen) to
//     Septoria Tritici Blotch (Zymoseptoria tritici) - the dominant foliar
//     wheat disease across humid temperate Europe, including Romania
//   - Growth thresholds raised (better soil fertility/moisture than dryland Syria)
//   - Water-stress temperature scale lowered for Romania's cooler spring climate
//   - Area unit changed from Dunum (Syria) to Hectare (EU/Romanian standard)
//   - Season shifted later to match Romania's winter-wheat calendar
//
// This demo version shows the core concept only:
//   ✅ 5 map layers | ✅ 2 smart-circle categories | ✅ compact info panel
//   🚫 No Sentinel-1 radar fusion, no yield-prediction model, no chart/
//      data-availability panels - these live in the full production system.
//
// The full version (1000+ lines) adds multi-sensor SAR fusion for a real
// moisture/humidity proxy, a Zadoks-phenology yield model, 8 smart-circle
// categories (growth x3, water stress, yield x3, disease), and a full
// diagnostic dashboard - available on request from the author.
// ============================================================

// ---- Configuration: adjust to your real field & season ----
var CONFIG = {
  START_DATE: '2026-03-01',   // Romanian winter wheat green-up (later/cooler than Syria)
  END_DATE: '2026-06-30',     // Covers stem elongation through pre-harvest
  CLOUD_THRESHOLD: 10,
  VERSION: 'SUPER-LITE-V1',
  GROWTH_STAGE: 39,  // Zadoks GS39 (Flag Leaf) - key pre-heading disease-monitoring stage
  CROP: 'Wheat',
  COUNTRY: 'Romania'
};

// ---- Study area: draw a Polygon on the map before running ----
if (typeof geometry === 'undefined') {
  throw new Error('⚠️ ارسم حدود الحقل بأداة Polygon قبل التشغيل. / Draw your field boundary first.');
}
var STUDY_AREA = geometry;

print('🌾 Wheat Monitor (Romania) - ' + CONFIG.VERSION + ' | Demo Version');
print('📅 ' + CONFIG.START_DATE + ' to ' + CONFIG.END_DATE + ' | Zadoks GS' + CONFIG.GROWTH_STAGE);
Map.centerObject(STUDY_AREA, 16);

// ================= DATA (CORE ONLY) =================
// Sentinel-2 optical median composite for the period, cloud-masked.

var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(STUDY_AREA).filterDate(CONFIG.START_DATE, CONFIG.END_DATE)
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', CONFIG.CLOUD_THRESHOLD))
  .map(function(img) {
    return img.updateMask(img.select('QA60').bitwiseAnd(1 << 10).eq(0)).divide(10000);
  }).median().clip(STUDY_AREA);

// ERA5-Land hourly air temperature, averaged over the period.
var tempMean = ee.ImageCollection('ECMWF/ERA5_LAND/HOURLY')
  .filterBounds(STUDY_AREA).filterDate(CONFIG.START_DATE, CONFIG.END_DATE)
  .select('temperature_2m').mean().subtract(273.15).rename('Temp_C');

// CHIRPS daily rainfall, summed over the period.
var rainTotal = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY')
  .filterBounds(STUDY_AREA).filterDate(CONFIG.START_DATE, CONFIG.END_DATE)
  .sum().rename('Rain_mm');

// ================= INDICES =================
// Core spectral vegetation indices - the building blocks of the growth index.

var ndvi = s2.normalizedDifference(['B8', 'B4']).rename('NDVI');
var ndwi = s2.normalizedDifference(['B8', 'B11']).rename('NDWI');
var msavi = s2.expression(
  '(2*NIR+1-sqrt((2*NIR+1)*(2*NIR+1)-8*(NIR-RED)))/2',
  {NIR: s2.select('B8'), RED: s2.select('B4')}
).rename('MSAVI').clamp(-1, 1);

// Wheat Growth Index - weighted vigor indicator
var wheatGrowthIndex = ndvi.multiply(0.5).add(msavi.multiply(0.3)).add(ndwi.multiply(0.2))
  .rename('WheatGrowthIndex');

// RECALIBRATED FOR ROMANIA: cooler spring climate than Syria's hot dryland
// range (20-40°C) - Romania's wheat belt typically sees 10-30°C in this window.
var waterStressIndex = ndwi.multiply(-1).add(1).multiply(0.7)
  .add(tempMean.unitScale(10, 30).multiply(0.3)).rename('WaterStressIndex');

// RECALIBRATED FOR ROMANIA: Septoria Tritici Blotch (Zymoseptoria tritici)
// replaces Yellow Rust - this is the dominant foliar wheat disease across humid
// temperate Europe (rain-splash dispersal, high humidity, 15-20°C optimal),
// unlike Yellow Rust which favors drier Mediterranean highland conditions.
// Full version also fuses Sentinel-1 radar moisture for a humidity proxy.
var septoriaSpectral = s2.normalizedDifference(['B3', 'B5']).rename('Septoria_Spectral');
var tempFactor = tempMean.clamp(15, 20).unitScale(15, 20);
var septoriaIndex = septoriaSpectral.multiply(0.6).add(tempFactor.multiply(0.4)).rename('SeptoriaRisk');

var maskSeptoria = septoriaSpectral.lt(-0.15)
  .and(ndvi.gt(0.30)).and(tempMean.gt(15)).and(tempMean.lt(20)).rename('class');
// RECALIBRATED FOR ROMANIA: higher NDVI threshold than Syria's 0.38 - Romania's
// fertile chernozem soils and higher spring rainfall support denser tillering.
var maskExcellent = ndvi.gt(0.50).and(waterStressIndex.lt(0.4)).rename('class');
var maskStress = ndwi.lt(0.10).or(waterStressIndex.gt(0.5)).rename('class');

var septoriaImg = maskSeptoria.selfMask();
var excellentImg = maskExcellent.selfMask();

// ================= SMART CIRCLES (RESILIENT, ASYNC) =================
// The "smart circles" are a randomized, area-proportional density layer per
// category - a quick visual read of field conditions, not literal plant
// locations. Uses a single async evaluate() per category so a network hiccup
// on one category never blocks the others or crashes the script.

var circleCounts = {septoria: 0, excellent: 0};
var stats = {farmSize: '0.00', temp: '0.00', rain: '0.00', excPct: '0.00', septoriaPct: '0.00', stressPct: '0.00'};
var pending = 2, statsReady = false, panelAdded = false;

function tryShowPanel() {
  if (pending <= 0 && statsReady && !panelAdded) { panelAdded = true; createInfoPanel(); }
}

function createSmartCircles(mask, color, name, key, density, radius) {
  var area = ee.Image.pixelArea().updateMask(mask).reduceRegion({
    reducer: ee.Reducer.sum(), geometry: STUDY_AREA, scale: 10, maxPixels: 1e9, bestEffort: true
  }).get('area');
  area = ee.Number(area);
  var count = area.divide(Math.PI * radius * radius * density).floor().max(3);

  var pts = mask.stratifiedSample({
    numPoints: count.multiply(2).int(), classBand: 'class',
    region: STUDY_AREA, scale: 10, seed: 42, geometries: true
  }).limit(count.int());

  var circles = pts.map(function(f) { return f.buffer(radius); });

  // Romania area unit: Hectare (10,000 m²) - not Syria's Dunum (1,000 m²)
  ee.Dictionary({count: count.int(), area: area.divide(10000)}).evaluate(function(res, err) {
    if (err || !res) { circleCounts[key] = 0; pending--; tryShowPanel(); return; }
    Map.addLayer(circles, {color: color}, name + ' (' + res.count + ')', true, 0.85);
    circleCounts[key] = res.count;
    pending--; tryShowPanel();
  });
}

createSmartCircles(septoriaImg, '#FF1493', '🦠 Septoria Blotch Risk', 'septoria', 0.8, 4.0);
createSmartCircles(excellentImg, '#228B22', '🟢 Excellent Growth', 'excellent', 0.35, 4.5);

// ================= FARM STATISTICS =================
// 1 Hectare = 10,000 m² (EU/Romanian standard)

var farmHa = STUDY_AREA.area(1).divide(10000);
function areaHa(mask) {
  return ee.Image.pixelArea().updateMask(mask).reduceRegion({
    reducer: ee.Reducer.sum(), geometry: STUDY_AREA, scale: 10, maxPixels: 1e9, bestEffort: true
  }).get('area');
}

ee.Dictionary({
  farm: farmHa, exc: areaHa(maskExcellent), septoria: areaHa(maskSeptoria), stress: areaHa(maskStress)
}).evaluate(function(res, err) {
  if (err || !res || !res.farm) { statsReady = true; tryShowPanel(); return; }
  var total = res.farm;
  var pct = function(v) { return (total > 0 && v) ? ((v / 10000 / total) * 100).toFixed(2) : '0.00'; };
  stats.farmSize = total.toFixed(2);
  stats.excPct = pct(res.exc); stats.septoriaPct = pct(res.septoria); stats.stressPct = pct(res.stress);

  tempMean.reduceRegion({reducer: ee.Reducer.mean(), geometry: STUDY_AREA, scale: 1000, maxPixels: 1e9})
    .get('Temp_C').evaluate(function(t) {
      stats.temp = t ? t.toFixed(1) : 'N/A';
      rainTotal.reduceRegion({reducer: ee.Reducer.sum(), geometry: STUDY_AREA, scale: 5000, maxPixels: 1e9})
        .get('Rain_mm').evaluate(function(r) {
          stats.rain = r ? r.toFixed(1) : 'N/A';
          statsReady = true; tryShowPanel();
        });
    });
});

// ================= COMPACT INFO PANEL =================

function createInfoPanel() {
  var p = ui.Panel({style: {
    position: 'bottom-left', padding: '12px', width: '280px',
    backgroundColor: 'rgba(255,255,255,0.95)', border: '3px solid #228B22'
  }});

  p.add(ui.Label('🌾 Wheat Monitor (Romania) - Demo', {fontSize: '16px', fontWeight: 'bold', color: '#228B22'}));
  p.add(ui.Label('🌾 Farm Area: ' + stats.farmSize + ' ha', {fontSize: '13px', color: '#228B22', fontWeight: 'bold'}));
  p.add(ui.Label('🌡️ ' + stats.temp + '°C   🌧️ ' + stats.rain + 'mm', {fontSize: '12px', color: '#0066CC'}));
  p.add(ui.Label('----------------------------', {margin: '4px 0'}));
  p.add(ui.Label('🦠 Septoria Blotch Risk: ' + circleCounts.septoria + ' circles (' + stats.septoriaPct + '%)', {
    fontSize: '11px', color: '#FF1493', fontWeight: 'bold'
  }));
  p.add(ui.Label('🟢 Excellent Growth: ' + circleCounts.excellent + ' circles (' + stats.excPct + '%)', {
    fontSize: '11px', color: '#228B22', fontWeight: 'bold'
  }));
  p.add(ui.Label('⭕ Water Stress: ' + stats.stressPct + '%', {fontSize: '11px', color: '#FF0000'}));
  p.add(ui.Label('----------------------------', {margin: '4px 0'}));
  p.add(ui.Label('Eng. Khaled Albakour - Demo Version', {
    fontSize: '10px', fontWeight: 'bold', color: '#FF0000', backgroundColor: '#000000',
    padding: '4px 8px', textAlign: 'center', border: '1px solid #FF0000'
  }));

  Map.add(p);
}

// ================= VISUALIZATION - 5 CORE LAYERS =================

Map.addLayer(s2, {bands: ['B4', 'B3', 'B2'], min: 0, max: 0.4, gamma: 1.2}, '📷 True Color', false);
Map.addLayer(wheatGrowthIndex, {
  min: -1, max: 1, palette: ['8B4513', 'D2691E', 'F4A460', '90EE90', '228B22', '006400']
}, '🌾 Wheat Growth Index (MAIN)', true);
Map.addLayer(waterStressIndex, {
  min: 0, max: 1, palette: ['228B22', '90EE90', 'FFD700', 'FF8C00', 'FF0000']
}, '⭕ Water Stress', false);
Map.addLayer(septoriaIndex, {
  min: -1, max: 1, palette: ['228B22', '90EE90', 'FFD700', 'FF8C00', 'FF1493', '8B0000']
}, '🦠 Septoria Blotch Risk', false);
Map.addLayer(STUDY_AREA.buffer(3).difference(STUDY_AREA.buffer(-2)), {color: '00FF00', width: 3}, '✅ Farm Boundary', true);

print('✅ Wheat Monitor (Romania) Demo Ready');
print('🌾 5 layers | 2 smart-circle categories | compact info panel');
print('🚫 Simplified for public sharing: no SAR fusion, no yield model, no charts');
print('👤 Eng. Khaled Albakour - Full 1000+ line production system available on request');
