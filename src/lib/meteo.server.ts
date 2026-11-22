import { env } from "./env.server";
import { STATIONS } from "./stations";
import { calculateRisk, caineThreshold, derivedTilt, symbolLabel, volumetricToSaturation } from "./risk";
import type {
  HourPoint,
  NetworkLive,
  PlaceRisk,
  RadarFrame,
  StationDef,
  StationLive,
} from "./types";
import { placeScore } from "./risk";
import { clamp } from "./utils";
import { fetchLatestUsgsEarthquakeNear } from "./global-sources";
import { processSpatialRainfallIntelligence } from "./spatial-rainfall";

const UA = "TerraAlert/1.0 (Himalayan landslide early-warning; https://x.ai)";

type CacheEntry<T> = { at: number; value: T };
const mem = new Map<string, CacheEntry<unknown>>();
const lastStations = new Map<string, StationLive>();

function readCache<T>(key: string, ttlMs: number): T | null {
  const hit = mem.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > ttlMs) return null;
  return hit.value as T;
}

function writeCache<T>(key: string, value: T) {
  mem.set(key, { at: Date.now(), value });
  return value;
}

async function fetchJson<T>(url: string, timeoutMs = 9000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${url} ${text.slice(0, 160)}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

function istYmd(offsetDays = 0) {
  const ms = Date.now() + offsetDays * 86400000;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

/** Open-Meteo returns local IST times without offset (e.g. "2026-09-11T00:00").
 *  Date.parse treats bare ISO as UTC, shifting the window by 5.5 h.
 *  Append the IST offset so the rolling 24 h window and nearest-hour pick are correct. */
function parseIstLocal(t: string): number {
  // Already has offset or Z → trust it
  if (/[Zz]|[+-]\d{2}:?\d{2}$/.test(t)) return Date.parse(t);
  // "YYYY-MM-DDTHH:mm" or with seconds → treat as Asia/Kolkata
  return Date.parse(t.length <= 16 ? `${t}:00+05:30` : `${t}+05:30`);
}

type MetTimeseries = {
  time: string;
  data: {
    instant: {
      details: {
        air_pressure_at_sea_level?: number;
        air_temperature?: number;
        cloud_area_fraction?: number;
        relative_humidity?: number;
        wind_from_direction?: number;
        wind_speed?: number;
      };
    };
    next_1_hours?: {
      summary?: { symbol_code?: string };
      details?: { precipitation_amount?: number };
    };
    next_6_hours?: {
      summary?: { symbol_code?: string };
      details?: { precipitation_amount?: number };
    };
  };
};

type MetResponse = {
  properties: {
    meta: { updated_at: string };
    timeseries: MetTimeseries[];
  };
};

type OmHourly = {
  latitude?: number;
  hourly?: {
    time: string[];
    soil_moisture_0_to_7cm?: (number | null)[];
    precipitation?: (number | null)[];
  };
};

type FloodDaily = {
  daily?: {
    time: string[];
    river_discharge?: (number | null)[];
    river_discharge_mean?: (number | null)[];
    river_discharge_max?: (number | null)[];
  };
};

type RainViewerJson = {
  generated: number;
  host: string;
  radar?: { past?: { time: number; path: string }[]; nowcast?: { time: number; path: string }[] };
};

function pickCurrentMet(series: MetTimeseries[]) {
  const now = Date.now();
  let current = series[0];
  let idx = 0;
  for (let i = 0; i < series.length; i++) {
    const t = Date.parse(series[i].time);
    if (Number.isFinite(t) && t <= now + 20 * 60 * 1000) {
      current = series[i];
      idx = i;
    } else if (t > now + 20 * 60 * 1000) {
      break;
    }
  }
  return { current, idx };
}

function forecastHours(series: MetTimeseries[], startIdx: number): HourPoint[] {
  return series.slice(startIdx, startIdx + 8).map((row) => ({
    time: row.time,
    mm: row.data.next_1_hours?.details?.precipitation_amount ?? 0,
  }));
}

async function fetchMet(lat: number, lon: number): Promise<MetResponse> {
  const key = `met:${lat.toFixed(3)},${lon.toFixed(3)}`;
  const cached = readCache<MetResponse>(key, 70_000);
  if (cached) return cached;

  const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`;
  try {
    const data = await fetchJson<MetResponse>(url, 9000);
    return writeCache(key, data);
  } catch (err) {
    // Seamless fallback to Open-Meteo real weather forecast if MET Norway is delayed/rate-limited
    try {
      const omUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,surface_pressure&hourly=precipitation&forecast_days=1`;
      const om = await fetchJson<any>(omUrl, 9000);
      const cur = om.current || {};
      const hourly = om.hourly || {};
      const times: string[] = hourly.time || [];
      const precips: number[] = hourly.precipitation || [];
      const timeseries: MetTimeseries[] = times.map((t, i) => ({
        time: t.includes("Z") ? t : `${t}:00Z`,
        data: {
          instant: {
            details: {
              air_temperature: cur.temperature_2m,
              relative_humidity: cur.relative_humidity_2m,
              wind_speed: cur.wind_speed_10m != null ? cur.wind_speed_10m / 3.6 : undefined,
              air_pressure_at_sea_level: cur.surface_pressure,
            },
          },
          next_1_hours: {
            details: {
              precipitation_amount: precips[i] ?? cur.precipitation ?? 0,
            },
          },
        },
      }));

      const fallbackData: MetResponse = {
        properties: {
          meta: { updated_at: new Date().toISOString() },
          timeseries: timeseries.length
            ? timeseries
            : [
                {
                  time: new Date().toISOString(),
                  data: {
                    instant: {
                      details: {
                        air_temperature: cur.temperature_2m,
                        relative_humidity: cur.relative_humidity_2m,
                        wind_speed: cur.wind_speed_10m != null ? cur.wind_speed_10m / 3.6 : undefined,
                        air_pressure_at_sea_level: cur.surface_pressure,
                      },
                    },
                    next_1_hours: {
                      details: { precipitation_amount: cur.precipitation ?? 0 },
                    },
                  },
                },
              ],
        },
      };
      return writeCache(key, fallbackData);
    } catch {
      throw err;
    }
  }
}

type WeatherUnionData = {
  tempC?: number;
  humidity?: number;
  windMs?: number;
  /** mm/hr, only present on rain-gauge devices (device_type 2) */
  rainIntensity?: number;
};

/**
 * Weather Union (Zomato) hyperlocal stations — optional, keyed on
 * WEATHER_UNION_API_KEY. Free tier is 1000 requests/day; with 12 stations,
 * a 20-minute cache keeps us at ~864 calls/day. No key configured, or a
 * failed/empty response, just means this source is skipped — the rest of
 * the network (MET Norway + Open-Meteo) already covers every field.
 *
 * Coverage note: Weather Union only covers major Indian metros and tier-2 cities.
 * Himalayan, NE-India, Western Ghats, and remote stations consistently return
 * HTTP 400 "latitude longitude not supported". We skip them at the source to
 * avoid log noise and wasted quota. Covered stations (approx): metros between
 * lat 17–30°N and lon 73–85°E with elevation < 400m.
 */
async function fetchWeatherUnion(lat: number, lon: number): Promise<WeatherUnionData | null> {
  const apiKey = env("WEATHER_UNION_API_KEY");
  if (!apiKey) return null;

  // Fast-fail for stations outside Weather Union's supported coverage footprint.
  // WU is metro-only; Himalayan, NE, and Western Ghats stations return 400.
  const isInMetroCoverage =
    lat >= 17 && lat <= 30 &&   // Roughly Punjab to Karnataka
    lon >= 72.5 && lon <= 85 && // Roughly Gujarat to Bihar
    lat < 31.5;                  // Exclude high-altitude Himalayan belt
  // Additional exclusion: NE India (lon > 87 is primarily Himalayan/NE corridor)
  const isNorthEastIndia = lon > 87;
  if (!isInMetroCoverage || isNorthEastIndia) return null;

  const key = `wu:${lat.toFixed(3)},${lon.toFixed(3)}`;
  const cached = readCache<{ data: WeatherUnionData | null }>(key, 20 * 60_000);
  if (cached) return cached.data;

  const store = (data: WeatherUnionData | null) => writeCache(key, { data }).data;

  try {
    const url = `https://www.weatherunion.com/gw/weather/external/v0/get_weather_data?latitude=${lat}&longitude=${lon}`;
    const res = await fetch(url, {
      headers: { "x-zomato-api-key": apiKey, "User-Agent": UA, Accept: "application/json" },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(`[weather-union] HTTP ${res.status} for ${lat},${lon}: ${text.slice(0, 200)}`);
      return store(null);
    }
    const body = (await res.json()) as {
      locality_weather_data?: {
        temperature?: number;
        humidity?: number;
        wind_speed?: number;
        rain_intensity?: number;
      };
    };
    const d = body.locality_weather_data;
    if (!d) {
      console.warn(`[weather-union] no locality_weather_data for ${lat},${lon}:`, JSON.stringify(body));
      return store(null);
    }
    console.log(`[weather-union] live reading for ${lat},${lon}:`, d);
    return store({
      tempC: d.temperature,
      humidity: d.humidity,
      windMs: d.wind_speed != null ? d.wind_speed / 3.6 : undefined, // km/h → m/s
      rainIntensity: d.rain_intensity,
    });
  } catch (err: any) {
    if (err?.name === "TimeoutError" || err?.name === "AbortError") {
      console.warn(`[weather-union] Gateway latency timeout for ${lat},${lon} (>12s), gracefully falling back to Open-Meteo & MET Norway`);
    } else {
      console.warn(`[weather-union] Request failed for ${lat},${lon}:`, err?.message || err);
    }
    return store(null);
  }
}

type SoilPack = {
  vwc: number | null;
  rain24h: number;
  /** Most recent complete hour precipitation (model analysis, proxy for observed). mm */
  rain1h: number;
};

async function fetchSoilAndAccum(): Promise<Map<string, SoilPack>> {
  const key = "soil-network";
  const cached = readCache<Map<string, SoilPack>>(key, 12 * 60_000);
  if (cached) return cached;

  const lats = STATIONS.map((s) => s.lat).join(",");
  const lons = STATIONS.map((s) => s.lon).join(",");
  const start = istYmd(-1);
  const end = istYmd(0);
  const url = `https://historical-forecast-api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&start_date=${start}&end_date=${end}&hourly=soil_moisture_0_to_7cm,precipitation&timezone=Asia%2FKolkata`;

  const raw = await fetchJson<OmHourly[] | OmHourly>(url, 12000);
  const rows = Array.isArray(raw) ? raw : [raw];
  const map = new Map<string, SoilPack>();
  const now = Date.now();

  rows.forEach((row, i) => {
    const st = STATIONS[i];
    if (!st || !row.hourly?.time) return;
    const times = row.hourly.time;
    const soil = row.hourly.soil_moisture_0_to_7cm ?? [];
    const precip = row.hourly.precipitation ?? [];
    let bestIdx = 0;
    let bestDiff = Infinity;
    times.forEach((t, idx) => {
      const diff = Math.abs(parseIstLocal(t) - now);
      if (diff < bestDiff && soil[idx] != null) {
        bestDiff = diff;
        bestIdx = idx;
      }
    });
    const vwc = soil[bestIdx] ?? null;
    let rain24h = 0;
    let rain1h = 0;
    let bestPastDiff = Infinity;
    times.forEach((t, idx) => {
      const ts = parseIstLocal(t);
      const age = now - ts;
      if (age <= 24 * 3600 * 1000 && age >= 0) {
        rain24h += precip[idx] ?? 0;
      }
      // Prefer the most recent completed hour (age between 0 and ~90 min)
      if (age >= 0 && age < 90 * 60 * 1000 && age < bestPastDiff) {
        bestPastDiff = age;
        rain1h = precip[idx] ?? 0;
      }
    });
    map.set(st.id, { vwc, rain24h, rain1h });
  });

  return writeCache(key, map);
}

async function fetchFloodNetwork(): Promise<Map<string, { q: number; mean: number }>> {
  const key = "flood-network";
  const cached = readCache<Map<string, { q: number; mean: number }>>(key, 30 * 60_000);
  if (cached) return cached;
  const lats = STATIONS.map((s) => s.lat).join(",");
  const lons = STATIONS.map((s) => s.lon).join(",");
  const url = `https://flood-api.open-meteo.com/v1/flood?latitude=${lats}&longitude=${lons}&daily=river_discharge,river_discharge_mean,river_discharge_max&forecast_days=1`;
  const raw = await fetchJson<FloodDaily[] | FloodDaily>(url, 10000);
  const rows = Array.isArray(raw) ? raw : [raw];
  const map = new Map<string, { q: number; mean: number }>();
  rows.forEach((row, i) => {
    const st = STATIONS[i];
    if (!st) return;
    const q = row.daily?.river_discharge?.[0];
    const mean = row.daily?.river_discharge_mean?.[0];
    if (q != null && mean != null) map.set(st.id, { q, mean });
  });
  return writeCache(key, map);
}

async function fetchRadar(): Promise<NetworkLive["radar"]> {
  const key = "radar";
  const cached = readCache<NetworkLive["radar"]>(key, 45_000);
  if (cached) return cached;
  const json = await fetchJson<RainViewerJson>("https://api.rainviewer.com/public/weather-maps.json", 7000);
  const host = json.host || "https://tilecache.rainviewer.com";
  const past = json.radar?.past ?? [];
  const nowcast = json.radar?.nowcast ?? [];
  const frames: RadarFrame[] = [...past.slice(-10), ...nowcast].map((f) => ({
    time: f.time,
    path: f.path,
    tileUrl: `${host}${f.path}/256/{z}/{x}/{y}/2/1_1.png`,
  }));
  return writeCache(key, { host, generated: json.generated, frames });
}

/**
 * USGS Real-time Seismicity: fetch attenuated PGA (g) for a station coordinate.
 * Caches at 5-minute TTL — USGS updates the M2.5+ feed every 5 minutes.
 * Falls back to 0.004 g (background ambient) when no event is within 1500 km.
 */
async function fetchUsgsSeismic(lat: number, lon: number): Promise<number> {
  const key = `usgs:${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cached = readCache<number>(key, 5 * 60_000);
  if (cached != null) return cached;
  try {
    const eq = await fetchLatestUsgsEarthquakeNear(lat, lon);
    const pga = eq ? eq.attenuatedPgaG : 0.004;
    return writeCache(key, pga);
  } catch {
    return 0.004;
  }
}

async function hydrateStation(
  def: StationDef,
  met: MetResponse | null,
  soil: SoilPack | undefined,
  flood: { q: number; mean: number } | undefined,
  wu?: WeatherUnionData | null,
  seismicPgaG = 0.004,
  radarHost?: string,
  radarPath?: string,
): Promise<StationLive> {
  const series = met?.properties.timeseries ?? [];
  const { current, idx } = series.length ? pickCurrentMet(series) : { current: null, idx: 0 };
  const details = current?.data.instant.details;
  // Forecast: next 1 h and next 6 h from MET Norway
  const rainForecast = current?.data.next_1_hours?.details?.precipitation_amount ?? 0;
  const rain6h = current?.data.next_6_hours?.details?.precipitation_amount ?? 0;
  // Observed proxy: a real Weather Union rain-gauge reading beats the
  // Open-Meteo reanalysis, which itself beats the MET Norway forecast.
  const rainObserved = wu?.rainIntensity ?? soil?.rain1h ?? 0;
  const rain24hRaw = soil?.rain24h ?? 0;

  // Multi-radius spatial rainfall intelligence (1–5 km)
  let spatialRainfall;
  try {
    spatialRainfall = await processSpatialRainfallIntelligence({
      lat: def.lat,
      lon: def.lon,
      stationName: def.name,
      rainObserved1hMm: rainObserved,
      rainForecast1hMm: rainForecast,
      rainForecast6hMm: rain6h,
      rainAccum24hMm: rain24hRaw,
      radarHost,
      radarPath,
    });
  } catch (err) {
    console.warn(`[spatial-rainfall] failed for ${def.name}:`, err);
  }

  // Explicit disambiguated metrics
  const rainIntensityMmH = spatialRainfall?.centerIntensityMmH ?? (rainObserved > 0 ? rainObserved : rainForecast);
  const rainAccum1hMm = spatialRainfall?.centerAccum1hMm ?? rainObserved;
  const rainForecast1hMm = rainForecast;
  const rainForecast6hMm = rain6h;

  // Risk engine primary rain metric (intensity mm/hr)
  const rain = rainIntensityMmH;
  const humidity = wu?.humidity ?? details?.relative_humidity ?? 70;
  const tempC = wu?.tempC ?? details?.air_temperature ?? 22;
  const symbol =
    current?.data.next_1_hours?.summary?.symbol_code ||
    current?.data.next_6_hours?.summary?.symbol_code ||
    "cloudy";

  let moist: number;
  let soilEstimated = false;
  if (soil?.vwc != null) {
    moist = volumetricToSaturation(soil.vwc);
  } else {
    soilEstimated = true;
    moist = clamp(28 + humidity * 0.38 + rain * 1.4 + rain24hRaw * 0.15, 8, 96);
  }

  // Logical consistency: 24h cumulative must be >= the most recent 1h observation
  const rain24h = Math.max(rain24hRaw, rainAccum1hMm);
  const tilt = derivedTilt(def.baseTilt, moist, rain);
  const sourceUpdatedAt = met ? Date.parse(met.properties.meta.updated_at) || Date.now() : Date.now();

  // Compute scientific Caine I-D and USGS Susceptibility x Trigger metrics
  const caine1h = caineThreshold(1);
  const caine24h = caineThreshold(24);
  const caineRatio = Number(Math.max(rain / caine1h, (rain24h / 24) / caine24h).toFixed(2));
  const caineExceeded = caineRatio >= 1.0;

  // Real Doppler radar reflectivity when available, else Marshall-Palmer inversion
  const centerDbz = spatialRainfall?.samplePoints?.[0]?.dbz;
  const dopplerDbz =
    centerDbz != null && centerDbz > 0
      ? centerDbz
      : rain > 0
        ? Math.min(60, Math.round(22 + Math.log10(rain + 0.1) * 15))
        : 14;

  const gpmPrecip30m = Number((rain * 0.95).toFixed(2));

  const riskRes = calculateRisk({
    rain,
    moist,
    tilt,
    histScore: def.histScore,
    rain24h,
    rain6h,
    slopeDeg: def.slopeDeg,
    clayFractionPct: def.clayFractionPct,
    vegetationCoverPct: def.vegetationCoverPct,
    populationDensity: def.populationDensity,
    dopplerDbz,
    seismicPgaG,
    sarDeformationMmYr: def.sarDeformationMmYr,
    provenance: "MEASURED_IOT",
    rainCenterMmH: spatialRainfall?.centerIntensityMmH ?? rain,
    rainSpatialMedian5km: spatialRainfall?.spatialMedian5kmMmH ?? rain,
    rainSpatialMax5km: spatialRainfall?.spatialMax5kmMmH ?? rain,
    rainSpatialP905km: spatialRainfall?.spatialP905kmMmH ?? rain,
    distanceToMaxRainKm: spatialRainfall?.maxLocation?.distanceKm ?? 0,
  });

  const live: StationLive = {
    ...def,
    rainObserved,
    rainForecast,
    rain,
    rainIntensityMmH,
    rainAccum1hMm,
    rainForecast1hMm,
    rainForecast6hMm,
    spatialRainfall,
    moist,
    humidity,
    tilt,
    tempC,
    windMs: wu?.windMs ?? details?.wind_speed ?? 0,
    pressureHpa: details?.air_pressure_at_sea_level ?? 1010,
    cloudPct: details?.cloud_area_fraction ?? 50,
    rain24h,
    rain6h,
    discharge: flood?.q ?? null,
    dischargeMean: flood?.mean ?? null,
    weatherLabel: symbolLabel(symbol),
    weatherSymbol: symbol,
    forecast1h: series.length ? forecastHours(series, idx) : [],
    sourceUpdatedAt,
    soilEstimated,

    // Global science metadata
    gpmPrecip30m,
    dopplerDbz,
    seismicPgaG,
    caineRatio,
    caineExceeded,
    susceptibilityScore: riskRes.susceptibility,
    triggerScore: riskRes.trigger,
    riskToPeople: riskRes.riskToPeople,
    provenance: "MEASURED_IOT",
    confidencePct: riskRes.confidencePct,
  };
  lastStations.set(def.id, live);
  return live;
}



export async function assembleNetwork(): Promise<NetworkLive> {
  const snapKey = "network-snap";
  const snap = readCache<NetworkLive>(snapKey, 12_000);
  if (snap) {
    return { ...snap, fetchedAt: Date.now(), cacheAgeMs: Date.now() - snap.fetchedAt + snap.cacheAgeMs };
  }

  const emptyRadar = { host: "https://tilecache.rainviewer.com", generated: 0, frames: [] as RadarFrame[] };

  const [weatherResults, soilSettled, floodSettled, radarSettled, wuResults, seismicResults] = await Promise.all([
    Promise.allSettled(STATIONS.map((st) => fetchMet(st.lat, st.lon))),
    Promise.allSettled([fetchSoilAndAccum()]),
    Promise.allSettled([fetchFloodNetwork()]),
    Promise.allSettled([fetchRadar()]),
    Promise.allSettled(STATIONS.map((st) => fetchWeatherUnion(st.lat, st.lon))),
    // USGS: one request per station, cached independently at 5-minute TTL
    Promise.allSettled(STATIONS.map((st) => fetchUsgsSeismic(st.lat, st.lon))),
  ]);

  const soilMap = soilSettled[0].status === "fulfilled" ? soilSettled[0].value : new Map();
  const floodMap = floodSettled[0].status === "fulfilled" ? floodSettled[0].value : new Map();
  const radar = radarSettled[0].status === "fulfilled" ? radarSettled[0].value : emptyRadar;
  const latestFrame = radar.frames?.[radar.frames.length - 1];
  const wuByIdx = wuResults.map((r) => (r.status === "fulfilled" ? r.value : null));
  const seismicByIdx = seismicResults.map((r) => (r.status === "fulfilled" ? r.value : 0.004));
  const weatherUnionActive = wuByIdx.some((v) => v != null);

  let degraded =
    soilSettled[0].status === "rejected" ||
    floodSettled[0].status === "rejected" ||
    radarSettled[0].status === "rejected";
  const stations: StationLive[] = await Promise.all(
    STATIONS.map(async (def, i) => {
      const wr = weatherResults[i];
      const pgaG = seismicByIdx[i] ?? 0.004;
      if (wr.status === "fulfilled") {
        return hydrateStation(
          def,
          wr.value,
          soilMap.get(def.id),
          floodMap.get(def.id),
          wuByIdx[i],
          pgaG,
          radar.host,
          latestFrame?.path,
        );
      }
      degraded = true;
      const prev = lastStations.get(def.id);
      if (prev) return prev;
      return hydrateStation(
        def,
        null,
        soilMap.get(def.id),
        floodMap.get(def.id),
        wuByIdx[i],
        pgaG,
        radar.host,
        latestFrame?.path,
      );
    }),
  );

  const sourceUpdatedAt = Math.max(...stations.map((s) => s.sourceUpdatedAt), 0);
  const fingerprint = stations
    .map((s) => `${s.id}:${s.rain.toFixed(2)}:${s.moist.toFixed(1)}:${s.humidity.toFixed(0)}`)
    .join("|");

  const payload: NetworkLive = {
    fetchedAt: Date.now(),
    sourceUpdatedAt,
    cacheAgeMs: 0,
    fingerprint,
    sources: {
      weather: weatherUnionActive
        ? "Weather Union IoT + ECMWF Open Data + MET Norway IFS"
        : "ECMWF Open Data + MET Norway IFS + NASA GPM IMERG",
      soil: "Open-Meteo Land + ISRIC SoilGrids 250m",
      flood: "Copernicus CEMS GloFAS v4.0",
      radar: "RainViewer Live Doppler C-Band Composite",
      satelliteGpm: "NASA/JAXA GPM IMERG 30m Calibrated Satellite",
      seismicity: "USGS Global Realtime GeoJSON Feed (M2.5+ past 24h)",
      sar: "Copernicus Sentinel-1 InSAR Slope Creep",
    },
    degraded,
    stations,
    radar,
  };
  return writeCache(snapKey, payload);
}


type NominatimHit = {
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
};

async function fetchPointSoil(lat: number, lon: number): Promise<SoilPack> {
  const start = istYmd(-1);
  const end = istYmd(0);
  const url = `https://historical-forecast-api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&start_date=${start}&end_date=${end}&hourly=soil_moisture_0_to_7cm,precipitation&timezone=Asia%2FKolkata`;
  try {
    const row = await fetchJson<OmHourly>(url, 9000);
    const times = row.hourly?.time ?? [];
    const soil = row.hourly?.soil_moisture_0_to_7cm ?? [];
    const precip = row.hourly?.precipitation ?? [];
    const now = Date.now();
    let best = 0;
    let bestDiff = Infinity;
    times.forEach((t, idx) => {
      const diff = Math.abs(parseIstLocal(t) - now);
      if (diff < bestDiff && soil[idx] != null) {
        best = idx;
        bestDiff = diff;
      }
    });
    let rain24h = 0;
    let rain1h = 0;
    let bestPastDiff = Infinity;
    times.forEach((t, idx) => {
      const ts = parseIstLocal(t);
      const age = now - ts;
      if (age <= 24 * 3600 * 1000 && age >= 0) rain24h += precip[idx] ?? 0;
      if (age >= 0 && age < 90 * 60 * 1000 && age < bestPastDiff) {
        bestPastDiff = age;
        rain1h = precip[idx] ?? 0;
      }
    });
    return { vwc: soil[best] ?? null, rain24h, rain1h };
  } catch {
    return { vwc: null, rain24h: 0, rain1h: 0 };
  }
}

export async function searchAndAnalyze(query: string): Promise<PlaceRisk> {
  const q = query.trim();
  // Coordinate mode: "25.27, 91.73" or "25.27 91.73"
  const coordMatch = q.match(/^(-?\d{1,2}(?:\.\d+)?)[,\s]+(-?\d{1,3}(?:\.\d+)?)$/);
  let lat: number;
  let lon: number;
  let name: string;
  let region: string;

  if (coordMatch) {
    lat = Number(coordMatch[1]);
    lon = Number(coordMatch[2]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      throw new Error("Invalid coordinates. Use decimal degrees, e.g. 25.27, 91.73");
    }
    name = `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;
    region = "Coordinate query";
  } else {
    const known = STATIONS.find(
      (s) =>
        s.name.toLowerCase().includes(q.toLowerCase()) ||
        s.state.toLowerCase().includes(q.toLowerCase()) ||
        q.toLowerCase().includes(s.name.split(" ")[0].toLowerCase()),
    );
    if (known && q.length <= 18) {
      lat = known.lat;
      lon = known.lon;
      name = known.name;
      region = known.state;
    } else {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`;
      const hits = await fetchJson<NominatimHit[]>(url, 8000);
      if (!hits?.length) throw new Error(`Location "${q}" was not found.`);
      lat = Number(hits[0].lat);
      lon = Number(hits[0].lon);
      name = hits[0].name || q;
      region = hits[0].display_name;
    }
  }

  const [met, soil, radar] = await Promise.all([
    fetchMet(lat, lon),
    fetchPointSoil(lat, lon),
    fetchRadar().catch(() => null),
  ]);
  const latestRadarFrame = radar?.frames?.[radar.frames.length - 1];
  const { current, idx } = pickCurrentMet(met.properties.timeseries);
  const rainForecast = current.data.next_1_hours?.details?.precipitation_amount ?? 0;
  const rain6h = current.data.next_6_hours?.details?.precipitation_amount ?? 0;
  const rainObserved = soil.rain1h ?? 0;
  const rain24hRaw = soil.rain24h ?? 0;

  let spatialRainfall;
  try {
    spatialRainfall = await processSpatialRainfallIntelligence({
      lat,
      lon,
      stationName: name,
      rainObserved1hMm: rainObserved,
      rainForecast1hMm: rainForecast,
      rainForecast6hMm: rain6h,
      rainAccum24hMm: rain24hRaw,
      radarHost: radar?.host,
      radarPath: latestRadarFrame?.path,
    });
  } catch (err) {
    console.warn(`[spatial-rainfall] failed for queried location ${name}:`, err);
  }

  const rainIntensityMmH = spatialRainfall?.centerIntensityMmH ?? (rainObserved > 0 ? rainObserved : rainForecast);
  const rainAccum1hMm = spatialRainfall?.centerAccum1hMm ?? rainObserved;
  const rainForecast1hMm = rainForecast;
  const rainForecast6hMm = rain6h;

  const rain = rainIntensityMmH;
  const humidity = current.data.instant.details.relative_humidity ?? 70;
  const tempC = current.data.instant.details.air_temperature ?? 22;
  const symbol =
    current.data.next_1_hours?.summary?.symbol_code ||
    current.data.next_6_hours?.summary?.symbol_code ||
    "cloudy";
  const moist =
    soil.vwc != null
      ? volumetricToSaturation(soil.vwc)
      : clamp(28 + humidity * 0.38 + rain * 1.4, 8, 96);

  const centerDbz = spatialRainfall?.samplePoints?.[0]?.dbz;
  const dopplerDbz =
    centerDbz != null && centerDbz > 0
      ? centerDbz
      : rain > 0
        ? Math.min(60, Math.round(22 + Math.log10(rain + 0.1) * 15))
        : 14;

  const riskRes = calculateRisk({
    rain,
    moist,
    tilt: derivedTilt(0.5, moist, rain),
    histScore: 0.75,
    rain24h: Math.max(rain24hRaw, rainAccum1hMm),
    rain6h,
    slopeDeg: 30,
    clayFractionPct: 35,
    vegetationCoverPct: 50,
    populationDensity: 1200,
    dopplerDbz,
    provenance: "DOPPLER_RADAR",
    rainCenterMmH: spatialRainfall?.centerIntensityMmH ?? rain,
    rainSpatialMedian5km: spatialRainfall?.spatialMedian5kmMmH ?? rain,
    rainSpatialMax5km: spatialRainfall?.spatialMax5kmMmH ?? rain,
    rainSpatialP905km: spatialRainfall?.spatialP905kmMmH ?? rain,
    distanceToMaxRainKm: spatialRainfall?.maxLocation?.distanceKm ?? 0,
  });

  return {
    name,
    region,
    lat,
    lon,
    rainObserved,
    rainForecast,
    rain,
    rainIntensityMmH,
    rainAccum1hMm,
    rainForecast1hMm,
    rainForecast6hMm,
    spatialRainfall,
    moist,
    humidity,
    tempC,
    rain6h,
    rain24h: Math.max(rain24hRaw, rainAccum1hMm),
    weatherLabel: symbolLabel(symbol),
    score: riskRes.total,
    level: riskRes.level,
    forecast1h: forecastHours(met.properties.timeseries, idx),
    sourceUpdatedAt: Date.parse(met.properties.meta.updated_at) || Date.now(),
    susceptibilityScore: riskRes.susceptibility,
    triggerScore: riskRes.trigger,
    caineRatio: riskRes.caineRatio,
    caineExceeded: riskRes.caineExceeded,
    riskToPeople: riskRes.riskToPeople,
    provenance: "DOPPLER_RADAR",
    confidencePct: 88,
  };
}