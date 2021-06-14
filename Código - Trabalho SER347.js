// Trabalho 7 - Programação a desastres naturais
//------------------------------------------------------------------------------------------------------------------------------//
// Sentinel-1 (R-G-B) Comp. Temp. RGB

//R
var MT = ee.ImageCollection('COPERNICUS/S1_GRD').filterBounds(geometry)
.filterDate('2021-03-01' ,'2021-03-31')
.filter(ee.Filter.eq('instrumentMode', 'IW'))
.filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'))
.select('VH');

//G
var MT1 = ee.ImageCollection('COPERNICUS/S1_GRD').filterBounds(geometry)
.filterDate('2021-03-01' ,'2021-03-31')
.filter(ee.Filter.eq('instrumentMode', 'IW'))
.filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'))
.select('VH');

//B
var MT2 = ee.ImageCollection('COPERNICUS/S1_GRD').filterBounds(geometry)
.filterDate('2021-05-01' ,'2021-05-31')
.filter(ee.Filter.eq('instrumentMode', 'IW'))
.filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'))
.select('VH');


var RGB = ee.Image.cat(MT.mean(), MT1.mean(), MT2.mean());

Map.addLayer(RGB, imageVisParam3, 'S1_RGB');

//-----------------------------------------------------------------------------------------------------------------------------//
// CÁLCULO NDWI MSI/Sentinel-2

//Máscara de nuvens
function maskS2clouds(image) {
  var qa = image.select('QA60');

  // Os bits 10 e 11 são nuvens e cirros, respectivamente.
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;

  // Ambos os sinalizadores devem ser definidos como zero, indicando condições claras.
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
      .and(qa.bitwiseAnd(cirrusBitMask).eq(0));

  return image.updateMask(mask).divide(10000);
}

// Índice NDWI  
var indice = function(image){
  var NDWI = image.expression(
    '((Green - NIR) / (Green + NIR))', {
      'NIR': image.select('B8'),
      'Green': image.select('B3'),
    });
  var water = NDWI.rename('h20');
  return water.copyProperties(image);  
};


// Cortar com a máscara de água
var area = function(image){
  return image.clip(geometry);
};


// Chamada da coleção
var imagem = ee.ImageCollection('COPERNICUS/S2_SR')
                   // Filtros --data --nuvens
                  .filterDate('2021-05-01', '2021-05-20')
                  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',98))
                  // Chamadas
                  .map(maskS2clouds)
                  .map(indice)
                  .map(area);


var h20 = imagem.select(['h20']);            
Map.addLayer(h20, imageVisParam, 'NDWI');
Map.centerObject(geometry1, 7);


//-----------------------------------------------------------------------------------------------------//
//Mapa de inundação

// Carregar a coleção Sentinel-1 C-band SAR Ground Range (Escala Log, Banda VV, Órbita descendente)

var collectionVV = ee.ImageCollection('COPERNICUS/S1_GRD')
.filter(ee.Filter.eq('instrumentMode', 'IW')) 
.filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
.filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'))
.filterMetadata('resolution_meters', 'equals' , 10)
.filterBounds(geometry)
.select('VV');
print(collectionVV, 'Coleção VV');


// Carregar a coleção Sentinel-1 C-band SAR Ground Range (Escala Log, Banda VH, Órbita descendente)
var collectionVH = ee.ImageCollection('COPERNICUS/S1_GRD')
.filter(ee.Filter.eq('instrumentMode', 'IW'))
.filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
.filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'))
.filterMetadata('resolution_meters', 'equals' , 10)
.filterBounds(geometry)
.select('VH');
print(collectionVH, 'Coleção VH');


//Filtro por data - Bandas Brutas
var beforeVV = collectionVV.filterDate('2021-03-01' ,'2021-03-31');
var afterVV = collectionVV.filterDate('2021-05-01' ,'2021-06-01');
var beforeVH = collectionVH.filterDate('2021-03-01' ,'2021-03-31');
var afterVH = collectionVH.filterDate('2021-05-01' ,'2021-05-31');
print(beforeVV, 'Antes VV');
print(afterVV, 'Depois VV');
print(beforeVH, 'Antes VH');
print(afterVH, 'Depois VH');


//Filtro por data - Bandas Brutas .mosaic()
var beforeVV = collectionVV.filterDate('2021-03-01' ,'2021-03-31').mosaic();
var afterVV = collectionVV.filterDate('2021-05-01' ,'2021-05-31').mosaic();
var beforeVH = collectionVH.filterDate('2021-03-01' ,'2021-03-31').mosaic();
var afterVH = collectionVH.filterDate('2021-05-01' ,'2021-05-31').mosaic();

Map.addLayer(beforeVH.addBands(afterVH).addBands(beforeVH), {min: -25, max: -8},
'Antes.VH/Depois.VV/Depois.VH');

//Aplicação defiltro para reduzir o speckle
var SMOOTHING_RADIUS = 50;
var beforeVV_filtered = beforeVV.focal_mean(SMOOTHING_RADIUS, 'circle', 'meters');
var beforeVH_filtered = beforeVH.focal_mean(SMOOTHING_RADIUS, 'circle', 'meters');
var afterVV_filtered = afterVV.focal_mean(SMOOTHING_RADIUS, 'circle', 'meters');
var afterVH_filtered = afterVH.focal_mean(SMOOTHING_RADIUS, 'circle', 'meters');

//Visualização das imagens filtradas
Map.addLayer(beforeVV_filtered, {min:-15,max:0}, 'Antes Inundação VV Filtrado',0);
Map.addLayer(beforeVH_filtered, {min:-25,max:0}, 'Antes Inundação VH Filtrado',0);
Map.addLayer(afterVV_filtered, {min:-15,max:0}, 'Depois Inundação VV Filtrado',0);
Map.addLayer(afterVH_filtered, {min:-25,max:0}, 'Depois Inundação VH Filtrado',0);

// Divisão (afterVH / beforeVH)
var differenceVH=
afterVH_filtered.divide(beforeVH_filtered);
Map.addLayer(differenceVH, {min: 0,max:2}, 'VH - Diferença Filtrada');

//Aplicando Limiar
var DIFF_UPPER_THRESHOLD = 1.25;
var differenceVH_thresholded = differenceVH.gt(DIFF_UPPER_THRESHOLD);

//Visualização Inundação
Map.addLayer(differenceVH_thresholded.updateMask(differenceVH_thresholded),
{palette:"0000FF"},'Inundação - Azul',1);


print(collectionVH, 'Coleção VH'); 

//----------------------------------------------------------------------------------------------------------------------------

// Cálculo de áreas inundadas por Bairros de Manaus

var inundacao = differenceVH_thresholded.updateMask(differenceVH_thresholded);

/// Zona Norte
var meanDictionary = inundacao.reduceRegion({
  reducer: ee.Reducer.count(),
  geometry: Zona_norte,
  scale: 10,
});
// O resultado é um dicionário. 
print(meanDictionary, 'Região Norte'); // Quantidade de pixels (10m x 10m)
print('Zona_norte_srtKM: ', Zona_norte.area().divide(1000 * 1000));


/// Zona Leste
var meanDictionary = inundacao.reduceRegion({
  reducer: ee.Reducer.count(),
  geometry: Zona_leste,
  scale: 10,
});
print(meanDictionary, 'Região Leste');
print('Zona_leste_srtKM: ', Zona_leste.area().divide(1000 * 1000));


/// Zona Central 
var meanDictionary = inundacao.reduceRegion({
  reducer: ee.Reducer.count(),
  geometry: Zona_central,
  scale: 10,
});
print(meanDictionary, 'Região Central');
print('Zona_central_srtKM: ',Zona_central.area().divide(1000 * 1000));


/// Zona Centro-Sul
var meanDictionary = inundacao.reduceRegion({
  reducer: ee.Reducer.count(),
  geometry: Zona_centro_sul,
  scale: 10,
});
print(meanDictionary, 'Região Centro-Sul');
print('Zona_centro_sul_srtKM: ',Zona_centro_sul.area().divide(1000 * 1000));


/// Zona Centro-Oeste
var meanDictionary = inundacao.reduceRegion({
  reducer: ee.Reducer.count(),
  geometry: Zona_centro_oeste,
  scale: 10,
});
print(meanDictionary, 'Região Centro-Oeste');
print('Zona_centro_oeste_srtKM: ',Zona_centro_oeste.area().divide(1000 * 1000));


/// Zona Oeste
var meanDictionary = inundacao.reduceRegion({
  reducer: ee.Reducer.count(),
  geometry: Zona_oeste,
  scale: 10,
});
print(meanDictionary, 'Região Oeste');
print('Zona_oeste_srtKM: ',Zona_oeste.area().divide(1000 * 1000));