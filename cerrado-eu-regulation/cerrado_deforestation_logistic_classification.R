# =====================================================================
# Spatial Analysis of Deforestation Dynamics and Landscape Metrics
# =====================================================================

# =====================================================================
# PART 1 - SPATIAL PREPROCESSING AND DEFORESTATION AGGREGATION
# =====================================================================

library(sf)
library(dplyr)
library(lwgeom)

sf_use_s2(FALSE)

# ---------------------------------------------------------------------
# Read spatial datasets
# ---------------------------------------------------------------------
yearly_deforestation <- st_read(
  "C:/Users/usuario/Documents/miguel/marco_uniao/cerrado_2/yearly_deforestation/yearly_deforestation.shp"
)

yearly_marco <- st_read(
  "C:/Users/usuario/Documents/miguel/marco_uniao/cerrado_2/marco/yearly_deforestation.shp"
)

residual <- st_read(
  "C:/Users/usuario/Documents/miguel/marco_uniao/cerrado_2/residual.shp"
)

output_dir <- "C:/Users/usuario/Documents/miguel/marco_uniao/cerrado_2"

# ---------------------------------------------------------------------
# Ensure all datasets share the same CRS
# ---------------------------------------------------------------------
crs_ref <- st_crs(yearly_deforestation)

yearly_marco <- st_transform(yearly_marco, crs_ref)
residual     <- st_transform(residual, crs_ref)

# ---------------------------------------------------------------------
# Select Marco Legal (reference year: 2020)
# ---------------------------------------------------------------------
marco_2020 <- yearly_marco %>%
  filter(class_name == "marco_d2020")

# ---------------------------------------------------------------------
# Filter deforestation increments by year
# ---------------------------------------------------------------------
d2021 <- yearly_deforestation %>% filter(class_name == "d2021")
d2022 <- yearly_deforestation %>% filter(class_name == "d2022")
d2023 <- yearly_deforestation %>% filter(class_name == "d2023")
d2024 <- yearly_deforestation %>% filter(class_name == "d2024")

# ---------------------------------------------------------------------
# Filter residual polygons by year
# ---------------------------------------------------------------------
r2021 <- residual %>% filter(class_name == "r2021")
r2022 <- residual %>% filter(class_name == "r2022")
r2023 <- residual %>% filter(class_name == "r2023")
r2024 <- residual %>% filter(class_name == "r2024")

# ---------------------------------------------------------------------
# Transform all layers to a projected CRS (EPSG:5880)
# Required for correct area and distance calculations
# ---------------------------------------------------------------------
marco_2020 <- st_transform(marco_2020, 5880)

d2021 <- st_transform(d2021, 5880)
d2022 <- st_transform(d2022, 5880)
d2023 <- st_transform(d2023, 5880)
d2024 <- st_transform(d2024, 5880)

r2021 <- st_transform(r2021, 5880)
r2022 <- st_transform(r2022, 5880)
r2023 <- st_transform(r2023, 5880)
r2024 <- st_transform(r2024, 5880)

# ---------------------------------------------------------------------
# Fix invalid geometries and remove empty features
# ---------------------------------------------------------------------
fix_geom <- function(x) {
  x <- st_make_valid(x)
  x <- st_buffer(x, 0)
  x[!st_is_empty(x), ]
}

marco_2020 <- fix_geom(marco_2020)

d2021 <- fix_geom(d2021)
d2022 <- fix_geom(d2022)
d2023 <- fix_geom(d2023)
d2024 <- fix_geom(d2024)

r2021 <- fix_geom(r2021)
r2022 <- fix_geom(r2022)
r2023 <- fix_geom(r2023)
r2024 <- fix_geom(r2024)

# ---------------------------------------------------------------------
# Spatial intersection between Marco Legal and deforestation increments
# ---------------------------------------------------------------------
marco_2021 <- st_filter(marco_2020, d2021, .predicate = st_intersects)
marco_2021$ano_prodes <- "prodes_21"

marco_2022 <- st_filter(marco_2020, d2022, .predicate = st_intersects)
marco_2022$ano_prodes <- "prodes_22"

marco_2023 <- st_filter(marco_2020, d2023, .predicate = st_intersects)
marco_2023$ano_prodes <- "prodes_23"

marco_2024 <- st_filter(marco_2020, d2024, .predicate = st_intersects)
marco_2024$ano_prodes <- "prodes_24"

# ---------------------------------------------------------------------
# Spatial intersection between Marco Legal and residual polygons
# ---------------------------------------------------------------------
rmarco_2021 <- st_filter(marco_2020, r2021, .predicate = st_intersects)
rmarco_2021$ano_prodes <- "residuo_21"

rmarco_2022 <- st_filter(marco_2020, r2022, .predicate = st_intersects)
rmarco_2022$ano_prodes <- "residuo_22"

rmarco_2023 <- st_filter(marco_2020, r2023, .predicate = st_intersects)
rmarco_2023$ano_prodes <- "residuo_23"

rmarco_2024 <- st_filter(marco_2020, r2024, .predicate = st_intersects)
rmarco_2024$ano_prodes <- "residuo_24"

# ---------------------------------------------------------------------
# Merge annual deforestation increments
# ---------------------------------------------------------------------
mesclado <- bind_rows(
  marco_2021,
  marco_2022,
  marco_2023,
  marco_2024
)

# ---------------------------------------------------------------------
# Calculate area in hectares
# ---------------------------------------------------------------------
mesclado$area_ha <- round(
  as.numeric(st_area(mesclado$geom)) / 10000,
  3
)

mesclado$fid <- NULL
mesclado <- st_cast(mesclado, "MULTIPOLYGON")

# ---------------------------------------------------------------------
# Save merged deforestation layer
# ---------------------------------------------------------------------
st_write(
  mesclado,
  "C:/Users/usuario/Documents/miguel/marco_uniao/cerrado_2/mesclado_cerrado.gpkg",
  delete_dsn = TRUE
)

# ---------------------------------------------------------------------
# Merge residual polygons
# ---------------------------------------------------------------------
mesclado_residuo <- bind_rows(
  rmarco_2021,
  rmarco_2022,
  rmarco_2023,
  rmarco_2024
)

mesclado_residuo$area_ha <- round(
  as.numeric(st_area(mesclado_residuo$geom)) / 10000,
  3
)

mesclado_residuo$fid <- NULL

# ---------------------------------------------------------------------
# Save merged residual layer
# ---------------------------------------------------------------------
st_write(
  mesclado_residuo,
  "C:/Users/usuario/Documents/miguel/marco_uniao/cerrado_2/mesclado_cerrado_residuo.gpkg",
  delete_dsn = TRUE
)

# =====================================================================
# PART 2 - SPATIAL DATABASE (POSTGIS)
# =====================================================================

library(DBI)
library(RPostgres)

# ---------------------------------------------------------------------
# Connect to PostgreSQL / PostGIS
# ---------------------------------------------------------------------
con <- dbConnect(
  RPostgres::Postgres(),
  dbname   = "Marco",
  host     = "localhost",
  port     = 5432,
  user     = "postgres",
  password = "123123"
)

# ---------------------------------------------------------------------
# Create multipolygon table and calculate area in database
# ---------------------------------------------------------------------
dbExecute(con, "DROP TABLE IF EXISTS mesclado_multi;")

dbExecute(con,
          "
CREATE TABLE mesclado_multi AS
SELECT
  uuid,
  ST_Multi(ST_Union(geom))::geometry(MultiPolygon,5880) AS geom
FROM mesclado_cerrado
GROUP BY uuid;
"
)

dbExecute(con, "ALTER TABLE mesclado_multi ADD COLUMN area_ha NUMERIC;")

dbExecute(con,
          "
UPDATE mesclado_multi
SET area_ha = ST_Area(geom) / 10000;
"
)

# ---------------------------------------------------------------------
# Create 1-meter buffer for polygons >= 1 ha
# ---------------------------------------------------------------------
dbExecute(con, "DROP TABLE IF EXISTS marco_buffer_1m_cerrado;")

dbExecute(con,
          "
CREATE TABLE marco_buffer_1m_cerrado AS
SELECT
  uuid,
  area_ha,
  ST_Multi(ST_Buffer(geom, 1))::geometry(MultiPolygon,5880) AS geom
FROM mesclado_multi
WHERE area_ha >= 1;
"
)

dbExecute(con,
          "
CREATE INDEX marco_buffer_1m_gist_idx_cerrado
ON marco_buffer_1m_cerrado
USING GIST (geom);
"
)

# =====================================================================
# PART 3 - LANDSCAPE METRICS
# =====================================================================

library(units)
library(purrr)

# ---------------------------------------------------------------------
# Load selected polygons
# ---------------------------------------------------------------------
shp <- st_read(
  "C:/Users/usuario/Documents/miguel/marco_uniao/cerrado_2/mesclado_selecionados.gpkg"
)

# ---------------------------------------------------------------------
# Calculate area and perimeter
# ---------------------------------------------------------------------
shp <- shp %>%
  mutate(
    area      = st_area(geom),
    perimeter = st_length(st_cast(geom, "MULTILINESTRING"))
  )

# ---------------------------------------------------------------------
# Shape metrics
# ---------------------------------------------------------------------
shp$PARA  <- shp$perimeter / shp$area
shp$SHAPE <- (0.25 * shp$perimeter) / sqrt(shp$area)
shp$FRAC  <- (2 * log(0.25 * shp$perimeter)) / log(shp$area)

# ---------------------------------------------------------------------
# Core Area Index (multiple edge distances)
# ---------------------------------------------------------------------
calc_cai <- function(geom, area, edge) {
  core_geom <- st_buffer(geom, -edge)
  core_area <- st_area(core_geom)
  as.numeric((core_area / area) * 100)
}

shp$CAI10  <- calc_cai(shp$geom, shp$area, 10)
shp$CAI15  <- calc_cai(shp$geom, shp$area, 15)
shp$CAI25  <- calc_cai(shp$geom, shp$area, 25)
shp$CAI50  <- calc_cai(shp$geom, shp$area, 50)
shp$CAI100 <- calc_cai(shp$geom, shp$area, 100)

# ---------------------------------------------------------------------
# Circularity
# ---------------------------------------------------------------------
mbc <- st_minimum_bounding_circle(shp)
circle_area <- st_area(mbc)
shp$CIRCLE <- 1 - as.numeric(shp$area / circle_area)

# ---------------------------------------------------------------------
# Elongation (safe PCA + bounding box fallback)
# ---------------------------------------------------------------------
elong_safe <- function(geom) {
  coords <- st_coordinates(geom)
  
  if (nrow(coords) >= 5) {
    pca <- try(prcomp(coords[, 1:2]), silent = TRUE)
    if (!inherits(pca, "try-error") && pca$sdev[2] > 0) {
      return(pca$sdev[1] / pca$sdev[2])
    }
  }
  
  bb <- st_bbox(geom)
  dx <- bb$xmax - bb$xmin
  dy <- bb$ymax - bb$ymin
  
  if (dx > 0 && dy > 0) {
    return(max(dx, dy) / min(dx, dy))
  }
  
  NA_real_
}

shp$ELONG_2 <- sapply(shp$geom, elong_safe)

# ---------------------------------------------------------------------
# Solidity
# ---------------------------------------------------------------------
hull <- st_convex_hull(shp$geom)
shp$SOLIDITY <- shp$area / st_area(hull)

# ---------------------------------------------------------------------
# Round metrics
# ---------------------------------------------------------------------
shp <- shp %>%
  mutate(
    PARA     = round(as.numeric(PARA), 3),
    SHAPE    = round(as.numeric(SHAPE), 3),
    FRAC     = round(as.numeric(FRAC), 3),
    CIRCLE   = round(as.numeric(CIRCLE), 3),
    ELONG_2  = round(as.numeric(ELONG_2), 3),
    SOLIDITY = round(as.numeric(SOLIDITY), 3),
    CAI10    = round(as.numeric(CAI10), 3),
    CAI15    = round(as.numeric(CAI15), 3),
    CAI25    = round(as.numeric(CAI25), 3),
    CAI50    = round(as.numeric(CAI50), 3),
    CAI100   = round(as.numeric(CAI100), 3)
  )

# =====================================================================
# PART 4 - LOGISTIC REGRESSION MODEL
# =====================================================================

# ---------------------------------------------------------------------
# Load training samples
# ---------------------------------------------------------------------
leo <- st_read(
  "C:/Users/usuario/Documents/miguel/marco_uniao/cerrado_2/amostras/leo.gpkg"
)

noeli <- st_read(
  "C:/Users/usuario/Documents/miguel/marco_uniao/cerrado_2/amostras/noeli.gpkg"
)

amostras <- bind_rows(leo, noeli) %>%
  st_drop_geometry() %>%
  select(
    classe, PARA, SHAPE, FRAC, CIRCLE,
    CAI10, CAI25, CAI50, CAI100,
    ELONG_2, SOLIDITY
  ) %>%
  mutate(
    classe2 = case_when(
      classe == "IN" ~ 0,
      classe == "B"  ~ 1
    )
  )

# ---------------------------------------------------------------------
# Fit logistic regression model
# ---------------------------------------------------------------------
model <- glm(
  classe2 ~ PARA + SHAPE + CIRCLE + FRAC +
    CAI25 + CAI50 + SOLIDITY + ELONG_2,
  data = amostras,
  family = binomial
)

# ---------------------------------------------------------------------
# Apply model to spatial data
# ---------------------------------------------------------------------
shp$prob_incremento <- predict(
  model,
  newdata = shp,
  type = "response"
)

shp$classe_pred <- ifelse(
  shp$prob_incremento < 0.5,
  "incremento",
  "borda"
)

# ---------------------------------------------------------------------
# Save final classified dataset
# ---------------------------------------------------------------------
st_write(
  shp,
  "C:/Users/usuario/Documents/miguel/marco_uniao/cerrado_2/cerrado_classificado_final.gpkg",
  delete_dsn = TRUE
)
