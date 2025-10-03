/******************************************************
 * Title: Flood Mapping and NDWI Analysis Using Sentinel-1 & Sentinel-2
 * 1. Creates RGB composites from Sentinel-1 SAR images.
 * 2. Calculates NDWI from Sentinel-2 imagery with cloud masking.
 * 3. Detects flood areas using pre- and post-event SAR imagery.
 * 4. Calculates flooded area per administrative zone in Manaus.
 ******************************************************/
//-------------------------------------------------------------//
// Sentinel-1 RGB Composite
//-------------------------------------------------------------//

// Red channel - Sentinel-1 VH polarization, March 2021
var MT = ee.ImageCollection('COPERNICUS/S1_GRD')
  .filterBounds(geometry)
  .filterDate('2021-03-01', '2021-03-31')
  .filter(ee.Filter.eq('instrumentMode', 'IW'))
  .filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'))
  .select('VH');

// Green channel - Sentinel-1 VH polarization, March 2021
var MT1 = ee.ImageCollection('COPERNICUS/S1_GRD')
  .filterBounds(geometry)
  .filterDate('2021-03-01', '2021-03-31')
  .filter(ee.Filter.eq('instrumentMode', 'IW'))
  .filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'))
  .select('VH');

// Blue channel - Sentinel-1 VH polarization, May 2021
var MT2 = ee.ImageCollection('COPERNICUS/S1_GRD')
  .filterBounds(geometry)
  .filterDate('2021-05-01', '2021-05-31')
  .filter(ee.Filter.eq('instrumentMode', 'IW'))
  .filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'))
  .select('VH');

// Combine channels to create RGB composite
var RGB = ee.Image.cat(MT.mean(), MT1.mean(), MT2.mean());
Map.addLayer(RGB, imageVisParam3, 'S1_RGB');


//-------------------------------------------------------------//
// NDWI Calculation using Sentinel-2
//-------------------------------------------------------------//

// Cloud masking function
function maskS2clouds(image) {
  var qa = image.select('QA60');

  // Bits 10 and 11 are clouds and cirrus
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;

  // Both flags must be zero to indicate clear conditions
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
      .and(qa.bitwiseAnd(cirrusBitMask).eq(0));

  return image.updateMask(mask).divide(10000);
}

// NDWI calculation function
var indice = function(image){
  var NDWI = image.expression(
    '((Green - NIR) / (Green + NIR))', {
      'NIR': image.select('B8'),
      'Green': image.select('B3'),
    });
  var water = NDWI.rename('h20');
  return water.copyProperties(image);  
};

// Clip image to study area
var area = function(image){
  return image.clip(geometry);
};

// Load Sentinel-2 collection, filter by date, cloud coverage, and apply NDWI & mask
var imagem = ee.ImageCollection('COPERNICUS/S2_SR')
  .filterDate('2021-05-01', '2021-05-20')
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',98))
  .map(maskS2clouds)
  .map(indice)
  .map(area);

// Select NDWI band and display
var h20 = imagem.select(['h20']);            
Map.addLayer(h20, imageVisParam, 'NDWI');
Map.centerObject(geometry1, 7);


//-------------------------------------------------------------//
// Flood Mapping with Sentinel-1
//-------------------------------------------------------------//

// Load Sentinel-1 VV polarization collection
var collectionVV = ee.ImageCollection('COPERNICUS/S1_GRD')
  .filter(ee.Filter.eq('instrumentMode', 'IW')) 
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
  .filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'))
  .filterMetadata('resolution_meters', 'equals' , 10)
  .filterBounds(geometry)
  .select('VV');
print(collectionVV, 'Coleção VV');

// Load Sentinel-1 VH polarization collection
var collectionVH = ee.ImageCollection('COPERNICUS/S1_GRD')
  .filter(ee.Filter.eq('instrumentMode', 'IW'))
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
  .filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'))
  .filterMetadata('resolution_meters', 'equals' , 10)
  .filterBounds(geometry)
  .select('VH');
print(collectionVH, 'Coleção VH');

// Filter collections by date
var beforeVV = collectionVV.filterDate('2021-03-01', '2021-03-31');
var afterVV = collectionVV.filterDate('2021-05-01', '2021-06-01');
var beforeVH = collectionVH.filterDate('2021-03-01', '2021-03-31');
var afterVH = collectionVH.filterDate('2021-05-01', '2021-05-31');
print(beforeVV, 'Antes VV');
print(afterVV, 'Depois VV');
print(beforeVH, 'Antes VH');
print(afterVH, 'Depois VH');

// Mosaic images for visualization
var beforeVV = collectionVV.filterDate('2021-03-01' ,'2021-03-31').mosaic();
var afterVV = collectionVV.filterDate('2021-05-01' ,'2021-05-31').mosaic();
var beforeVH = collectionVH.filterDate('2021-03-01' ,'2021-03-31').mosaic();
var afterVH = collectionVH.filterDate('2021-05-01' ,'2021-05-31').mosaic();

Map.addLayer(beforeVH.addBands(afterVH).addBands(beforeVH), {min: -25, max: -8},
'Antes.VH/Depois.VV/Depois.VH');

// Apply speckle filter to reduce noise
var SMOOTHING_RADIUS = 50;
var beforeVV_filtered = beforeVV.focal_mean(SMOOTHING_RADIUS, 'circle', 'meters');
var beforeVH_filtered = beforeVH.focal_mean(SMOOTHING_RADIUS, 'circle', 'meters');
var afterVV_filtered = afterVV.focal_mean(SMOOTHING_RADIUS, 'circle', 'meters');
var afterVH_filtered = afterVH.focal_mean(SMOOTHING_RADIUS, 'circle', 'meters');

// Display filtered images
Map.addLayer(beforeVV_filtered, {min:-15,max:0}, 'Antes Inundação VV Filtrado',0);
Map.addLayer(beforeVH_filtered, {min:-25,max:0}, 'Antes Inundação VH Filtrado',0);
Map.addLayer(afterVV_filtered, {min:-15,max:0}, 'Depois Inundação VV Filtrado',0);
Map.addLayer(afterVH_filtered, {min:-25,max:0}, 'Depois Inundação VH Filtrado',0);

// Calculate difference ratio (After / Before)
var differenceVH = afterVH_filtered.divide(beforeVH_filtered);
Map.addLayer(differenceVH, {min: 0,max:2}, 'VH - Diferença Filtrada');

// Apply threshold to detect flooded areas
var DIFF_UPPER_THRESHOLD = 1.25;
var differenceVH_thresholded = differenceVH.gt(DIFF_UPPER_THRESHOLD);

// Display flood map
Map.addLayer(differenceVH_thresholded.updateMask(differenceVH_thresholded),
{palette:"0000FF"},'Inundação - Azul',1);

print(collectionVH, 'Coleção VH'); 

//-------------------------------------------------------------//
// Calculate flooded areas by Manaus neighborhoods
//-------------------------------------------------------------//

var inundacao = differenceVH_thresholded.updateMask(differenceVH_thresholded);

// North Zone
var meanDictionary = inundacao.reduceRegion({
  reducer: ee.Reducer.count(),
  geometry: Zona_norte,
  scale: 10,
});
print(meanDictionary, 'Região Norte'); 
print('Zona_norte_srtKM: ', Zona_norte.area().divide(1000 * 1000));

// East Zone
var meanDictionary = inundacao.reduceRegion({
  reducer: ee.Reducer.count(),
  geometry: Zona_leste,
  scale: 10,
});
print(meanDictionary, 'Região Leste');
print('Zona_leste_srtKM: ', Zona_leste.area().divide(1000 * 1000));

// Central Zone
var meanDictionary = inundacao.reduceRegion({
  reducer: ee.Reducer.count(),
  geometry: Zona_central,
  scale: 10,
});
print(meanDictionary, 'Região Central');
print('Zona_central_srtKM: ',Zona_central.area().divide(1000 * 1000));

// South-Central Zone
var meanDictionary = inundacao.reduceRegion({
  reducer: ee.Reducer.count(),
  geometry: Zona_centro_sul,
  scale: 10,
});
print(meanDictionary, 'Região Centro-Sul');
print('Zona_centro_sul_srtKM: ',Zona_centro_sul.area().divide(1000 * 1000));

// West-Central Zone
var meanDictionary = inundacao.reduceRegion({
  reducer: ee.Reducer.count(),
  geometry: Zona_centro_oeste,
  scale: 10,
});
print(meanDictionary, 'Região Centro-Oeste');
print('Zona_centro_oeste_srtKM: ',Zona_centro_oeste.area().divide(1000 * 1000));

// West Zone
var meanDictionary = inundacao.reduceRegion({
  reducer: ee.Reducer.count(),
  geometry: Zona_oeste,
  scale: 10,
});
print(meanDictionary, 'Região Oeste');
print('Zona_oeste_srtKM: ',Zona_oeste.area().divide(1000 * 1000));
