# Flood Mapping and NDWI Analysis (Sentinel-1 & Sentinel-2) — Google Earth Engine

This project was developed as part of the SER-247 course at INPE (National Institute for Space Research, Brazil). It explores an integration workflow for RADAR and optical satellite products within the Google Earth Engine (GEE) environment, focusing on large-scale flood mapping in urban areas.

## Overview

There is a growing international trend of collaboration between space agencies to support satellite missions aimed at monitoring and responding to natural disasters. This field has advanced significantly in recent years, especially through initiatives such as the International Charter “Space and Major Disasters”.

This repository provides a flood mapping workflow using:
- **Sentinel-1 (SAR)** for water detection independent of clouds
- **Sentinel-2 (optical)** for NDWI-based surface water mapping

## Objectives

- Test the integration of RADAR and optical datasets in GEE
- Map large flooded urban areas
- Evaluate NDWI as a flood indicator using Sentinel-2
- Support rapid mapping workflows for disaster response scenarios

## Methods

- Data acquisition from GEE collections:
  - Sentinel-1 GRD (SAR)
  - Sentinel-2 MSI (optical)
- Pre-processing steps (typical):
  - Cloud masking (Sentinel-2)
  - SAR filtering and polarization selection (Sentinel-1)
- NDWI computation:
  - NDWI = (Green - NIR) / (Green + NIR)
- Thresholding and spatial masking to extract flooded areas

## Requirements

- A Google Earth Engine account
- Basic knowledge of JavaScript and the GEE Code Editor

## Outputs

- NDWI maps and water masks
- Flood extent visualization layers
- Exportable flood polygons or rasters (depending on implementation)

## Notes

This project is intended for educational and research purposes and can be adapted for operational rapid mapping workflows.