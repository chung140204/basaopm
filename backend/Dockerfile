FROM python:3.12-slim

# GDAL/GEOS cho geopandas + shapely (đọc shapefile, reproject, point-in-polygon).
RUN apt-get update && apt-get install -y --no-install-recommends \
    gdal-bin libgdal-dev gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY schema ./schema
COPY import_shp.py .
COPY build_lo.py .
COPY seed_users.py .
COPY seed_projects.py .

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
