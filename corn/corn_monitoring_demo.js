// ============================================================
// CORN (MAIZE) MONITORING SYSTEM - SUPER LITE (DEMO) V1.0 2026
// Public showcase version - Romania Corn Agriculture
// Built on Google Earth Engine using free, public satellite data:
//   - Sentinel-2 (optical vegetation indices)
//   - ERA5-Land (air temperature)
//   - CHIRPS (rainfall)
//
// This demo version shows the core concept only:
//   ✅ 5 map layers | ✅ 2 smart-circle categories | ✅ compact info panel
//   🚫 No Sentinel-1 radar fusion, no yield-prediction model, no chart/
//      data-availability panels - these live in the full production system.
//
// The full version (1000+ lines) adds multi-sensor SAR fusion for a real
// moisture/humidity proxy, a BBCH-phenology yield model, 8 smart-circle
// categories (growth x3, water stress, yield x3, disease), and a full
// diagnostic dashboard - available on request from the author.
// ============================================================

// ---- Configuration: adjust to your real field & season ----
var CONFIG = {
  START_DATE: '2026-04-15',
  END_DATE: '2026-09-30',
  CLOUD_THRESHOLD: 10,
  VERSION: 'SUPER-LITE-V1',
  BBCH_STAGE: 65,   // Flowering / Silking - most yield-critical corn stage
  CROP: 'Corn (Maize)',
  COUNTRY: 'Romania'
};

// ---- Study area: draw a Polygon on the map before running ----
if (typeof geometry === 'undefined') {
  throw new Error('⚠️ ارسم حدود الحقل بأداة Polygon قبل التشغيل. / Draw your field boundary first.');
}
var STUDY_AREA = geometry;

print('🌽 Corn Monitor - ' + CONFIG.VERSION + ' | Demo Version');
print('📅 ' + CONFIG.START_DATE + ' to ' + CONFIG.END_DATE + ' | BBCH ' + CONFIG.BBCH_STAGE);
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

// Corn Growth Index - weighted vigor indicator
var cornGrowthIndex = ndvi.multiply(0.5).add(msavi.multiply(0.3)).add(ndwi.multiply(0.2))
  .rename('CornGrowthIndex');

var waterStressIndex = ndwi.multiply(-1).add(1).multiply(0.7)
  .add(tempMean.unitScale(18, 35).multiply(0.3)).rename('WaterStressIndex');

// Simplified Corn Leaf Blight risk (spectral anomaly + optimal 18-27°C window).
// Full version also fuses Sentinel-1 radar moisture for a humidity proxy.
var blightSpectral = s2.normalizedDifference(['B3', 'B5']).rename('Blight_Spectral');
var tempFactor = tempMean.clamp(18, 27).unitScale(18, 27);
var blightIndex = blightSpectral.multiply(0.6).add(tempFactor.multiply(0.4)).rename('BlightRisk');

var maskBlight = blightSpectral.lt(-0.15)
  .and(ndvi.gt(0.45)).and(tempMean.gt(18)).and(tempMean.lt(27)).rename('class');
var maskExcellent = ndvi.gt(0.75).and(waterStressIndex.lt(0.4)).rename('class');
var maskStress = ndwi.lt(0.10).or(waterStressIndex.gt(0.5)).rename('class');

var blightImg = maskBlight.selfMask();
var excellentImg = maskExcellent.selfMask();

// ================= SMART CIRCLES (RESILIENT, ASYNC) =================
// The "smart circles" are a randomized, area-proportional density layer per
// category - a quick visual read of field conditions, not literal plant
// locations. Uses a single async evaluate() per category so a network hiccup
// on one category never blocks the others or crashes the script.

var circleCounts = {blight: 0, excellent: 0};
var stats = {farmSize: '0.00', temp: '0.00', rain: '0.00', excPct: '0.00', blightPct: '0.00', stressPct: '0.00'};
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

  ee.Dictionary({count: count.int(), area: area.divide(10000)}).evaluate(function(res, err) {
    if (err || !res) { circleCounts[key] = 0; pending--; tryShowPanel(); return; }
    Map.addLayer(circles, {color: color}, name + ' (' + res.count + ')', true, 0.85);
    circleCounts[key] = res.count;
    pending--; tryShowPanel();
  });
}

createSmartCircles(blightImg, '#FF1493', '🦠 Blight Risk', 'blight', 0.8, 4.0);
createSmartCircles(excellentImg, '#228B22', '🟢 Excellent Growth', 'excellent', 0.35, 4.5);

// ================= FARM STATISTICS =================

var farmHa = STUDY_AREA.area(1).divide(10000);
function areaHa(mask) {
  return ee.Image.pixelArea().updateMask(mask).reduceRegion({
    reducer: ee.Reducer.sum(), geometry: STUDY_AREA, scale: 10, maxPixels: 1e9, bestEffort: true
  }).get('area');
}

ee.Dictionary({
  farm: farmHa, exc: areaHa(maskExcellent), blight: areaHa(maskBlight), stress: areaHa(maskStress)
}).evaluate(function(res, err) {
  if (err || !res || !res.farm) { statsReady = true; tryShowPanel(); return; }
  var total = res.farm;
  var pct = function(v) { return (total > 0 && v) ? ((v / 10000 / total) * 100).toFixed(2) : '0.00'; };
  stats.farmSize = total.toFixed(2);
  stats.excPct = pct(res.exc); stats.blightPct = pct(res.blight); stats.stressPct = pct(res.stress);

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

  p.add(ui.Label('🌽 Corn Monitor - Demo', {fontSize: '16px', fontWeight: 'bold', color: '#228B22'}));
  p.add(ui.Label('🌽 Farm Area: ' + stats.farmSize + ' ha', {fontSize: '13px', color: '#228B22', fontWeight: 'bold'}));
  p.add(ui.Label('🌡️ ' + stats.temp + '°C   🌧️ ' + stats.rain + 'mm', {fontSize: '12px', color: '#0066CC'}));
  p.add(ui.Label('----------------------------', {margin: '4px 0'}));
  p.add(ui.Label('🦠 Blight Risk: ' + circleCounts.blight + ' circles (' + stats.blightPct + '%)', {
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
Map.addLayer(cornGrowthIndex, {
  min: -1, max: 1, palette: ['8B4513', 'D2691E', 'F4A460', '90EE90', '228B22', '006400']
}, '🌽 Corn Growth Index (MAIN)', true);
Map.addLayer(waterStressIndex, {
  min: 0, max: 1, palette: ['228B22', '90EE90', 'FFD700', 'FF8C00', 'FF0000']
}, '⭕ Water Stress', false);
Map.addLayer(blightIndex, {
  min: -1, max: 1, palette: ['228B22', '90EE90', 'FFD700', 'FF8C00', 'FF1493', '8B0000']
}, '🦠 Blight Risk', false);
Map.addLayer(STUDY_AREA.buffer(3).difference(STUDY_AREA.buffer(-2)), {color: '00FF00', width: 3}, '✅ Farm Boundary', true);

print('✅ Corn Monitor Demo Ready');
print('🌽 5 layers | 2 smart-circle categories | compact info panel');
print('🚫 Simplified for public sharing: no SAR fusion, no yield model, no charts');
print('👤 Eng. Khaled Albakour - Full 1000+ line production system available on request');
