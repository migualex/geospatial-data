# Cerrado Deforestation Edge Calculation (EU Regulation 2023/1115) — PRODES Method Adaptation

This project addresses a methodological adaptation of Brazil’s PRODES deforestation monitoring approach in response to the **European Union Regulation (EU) 2023/1115**.

The regulation requires traceability for commodities such as:
- timber
- cocoa
- coffee
- rubber

and ensures that products placed on the EU market do not originate from areas deforested after **December 2020**.

## Context

The original PRODES methodology traditionally relied on Landsat imagery (e.g., Landsat-8) and mapped only deforestation polygons larger than **1 hectare**.

However, in order to meet the EU regulation requirements — especially regarding stricter traceability and detection thresholds — the methodology was improved using higher spatial and temporal resolution datasets, particularly:
- **Sentinel-2 (optical)**
- **Sentinel-1 (SAR)**

This is especially relevant for monitoring the **Cerrado biome**, where deforestation patterns can be smaller, fragmented, and strongly seasonal.

## Objectives

- Improve deforestation detection sensitivity and spatial detail in the Cerrado
- Support compliance workflows under EU Regulation 2023/1115
- Enhance temporal monitoring using multi-sensor time series
- Compute and analyze **deforestation edge/border metrics** (spatial structure)
- Identify spatial-temporal patterns through unsupervised learning

## Methodology

### 1) Data Sources
- Sentinel-2: spectral time series and vegetation indices
- Sentinel-1: backscatter time series to reduce cloud dependency

### 2) Pre-processing
Typical steps include:
- cloud masking (Sentinel-2)
- radiometric calibration and filtering (Sentinel-1)
- time series normalization and harmonization
- spatial masking and biome boundary constraints

### 3) Time Series Clustering (Unsupervised Learning)
After initial analysis, the time series are classified into clusters using:
- **Self-Organizing Maps (SOM)**
- **Hierarchical Agglomerative Clustering (HCA)**

This step aims to identify meaningful spatial-temporal patterns and improve the interpretation of deforestation dynamics.

### 4) Edge / Border Calculation
A key improvement in this workflow is the inclusion of spatial metrics related to the deforestation polygon geometry, such as:
- edge length
- fragmentation patterns
- spatial adjacency and border complexity

These metrics help improve characterization and monitoring of deforestation beyond simple area thresholds.

## Outputs

- Cluster maps (SOM / HCA)
- Spatial-temporal deforestation pattern maps
- Edge and fragmentation metrics
- Results supporting traceability and compliance assessment

## Notes

This repository is designed for research and methodological development. It can be adapted to operational monitoring pipelines depending on data availability, computational infrastructure, and target compliance needs.




