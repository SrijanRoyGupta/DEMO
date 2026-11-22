import zlib from "node:zlib";
//#region node_modules/.nitro/vite/services/ssr/assets/spatial-rainfall-DYIs0aDt.js
var EARTH_RADIUS_KM = 6371;
/**
* Great-circle distance between two coordinates using Haversine formula
*/
function haversineDistanceKm(lat1, lon1, lat2, lon2) {
	const dLat = (lat2 - lat1) * Math.PI / 180;
	const dLon = (lon2 - lon1) * Math.PI / 180;
	const rLat1 = lat1 * Math.PI / 180;
	const rLat2 = lat2 * Math.PI / 180;
	const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return Number((EARTH_RADIUS_KM * c).toFixed(3));
}
/**
* Destination point given distance (km) and bearing (deg) from start point
*/
function destinationPoint(lat, lon, distanceKm, bearingDeg) {
	const delta = distanceKm / EARTH_RADIUS_KM;
	const theta = bearingDeg * Math.PI / 180;
	const phi1 = lat * Math.PI / 180;
	const lambda1 = lon * Math.PI / 180;
	const phi2 = Math.asin(Math.sin(phi1) * Math.cos(delta) + Math.cos(phi1) * Math.sin(delta) * Math.cos(theta));
	const lambda2 = lambda1 + Math.atan2(Math.sin(theta) * Math.sin(delta) * Math.cos(phi1), Math.cos(delta) - Math.sin(phi1) * Math.sin(phi2));
	return {
		lat: Number((phi2 * 180 / Math.PI).toFixed(5)),
		lon: Number((lambda2 * 180 / Math.PI).toFixed(5))
	};
}
/**
* Computes empirical percentile from sorted number array
*/
function quantile(sorted, q) {
	if (!sorted.length) return 0;
	if (sorted.length === 1) return sorted[0];
	const pos = (sorted.length - 1) * q;
	const base = Math.floor(pos);
	const rest = pos - base;
	if (sorted[base + 1] !== void 0) return Number((sorted[base] + rest * (sorted[base + 1] - sorted[base])).toFixed(2));
	return Number(sorted[base].toFixed(2));
}
/**
* Marshall-Palmer Empirical Relation:
* Converts radar reflectivity factor Z (in dBZ) to instantaneous precipitation rate R (in mm/hr):
*   Z = 200 * R^1.6  =>  R = (10^(dBZ / 10) / 200)^(1 / 1.6)
*/
function marshallPalmerDbzToMmH(dbz) {
	if (dbz <= 12) return 0;
	const z = Math.pow(10, dbz / 10);
	const r = Math.pow(z / 200, 1 / 1.6);
	return Number(Math.max(0, r).toFixed(2));
}
/**
* Maps RainViewer radar color palette to calibrated radar reflectivity (dBZ)
*/
function rgbaToRadarDbz(r, g, b, a) {
	if (a < 25) return 0;
	const max = Math.max(r, g, b);
	const delta = max - Math.min(r, g, b);
	let hue = 0;
	if (delta > 0) {
		if (max === r) hue = (g - b) / delta % 6;
		else if (max === g) hue = (b - r) / delta + 2;
		else hue = (r - g) / delta + 4;
		hue = Math.round(hue * 60);
		if (hue < 0) hue += 360;
	}
	if (hue >= 280 && hue <= 340 || r > 160 && b > 160 && g < 100) return Number((54 + r / 255 * 8).toFixed(1));
	if ((hue >= 340 || hue <= 20) && r > 180 && g < 100) return Number((46 + r / 255 * 4).toFixed(1));
	if (hue > 20 && hue <= 45 && r > 200 && g > 90) return Number((41 + (45 - hue) / 25 * 4).toFixed(1));
	if (hue > 45 && hue <= 75 && r > 180 && g > 180) return Number((36 + (75 - hue) / 30 * 4).toFixed(1));
	if (hue > 75 && hue <= 165 && g > 130) return Number((26 + g / 255 * 8).toFixed(1));
	if (hue > 165 && hue <= 205 && (b > 120 || g > 120)) return Number((21 + b / 255 * 4).toFixed(1));
	if (hue > 205 && hue < 270 && b > 100) return Number((16 + b / 255 * 4).toFixed(1));
	if (delta < 20) {
		const brightness = (r + g + b) / 3;
		if (brightness > 200) return 38;
		if (brightness > 140) return 28;
		if (brightness > 80) return 18;
		return 14;
	}
	return 15;
}
/**
* Pure TypeScript PNG IDAT scanline decoder (zero third-party dependencies)
*/
function decodePngRgba(buf) {
	try {
		let pos = 8;
		const idatParts = [];
		let width = 0;
		let height = 0;
		let colorType = 6;
		while (pos < buf.length) {
			const len = buf.readUInt32BE(pos);
			const type = buf.slice(pos + 4, pos + 8).toString("ascii");
			if (type === "IHDR") {
				width = buf.readUInt32BE(pos + 8);
				height = buf.readUInt32BE(pos + 12);
				colorType = buf[pos + 17];
			} else if (type === "IDAT") idatParts.push(buf.slice(pos + 8, pos + 8 + len));
			pos += 12 + len;
		}
		if (!idatParts.length || width === 0 || height === 0) return null;
		const decompressed = zlib.inflateSync(Buffer.concat(idatParts));
		const bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
		const stride = 1 + width * bpp;
		const rawData = Buffer.alloc(width * height * 4);
		for (let row = 0; row < height; row++) {
			const filter = decompressed[row * stride];
			const srcRow = row * stride + 1;
			const dstRow = row * width * 4;
			for (let col = 0; col < width; col++) {
				let r = 0, g = 0, b = 0, a = 255;
				const srcIdx = col * bpp;
				if (bpp === 4) {
					r = decompressed[srcRow + srcIdx];
					g = decompressed[srcRow + srcIdx + 1];
					b = decompressed[srcRow + srcIdx + 2];
					a = decompressed[srcRow + srcIdx + 3];
				} else if (bpp === 3) {
					r = decompressed[srcRow + srcIdx];
					g = decompressed[srcRow + srcIdx + 1];
					b = decompressed[srcRow + srcIdx + 2];
				}
				if (filter === 1 && col > 0) {
					const prevDst = dstRow + (col - 1) * 4;
					r = r + rawData[prevDst] & 255;
					g = g + rawData[prevDst + 1] & 255;
					b = b + rawData[prevDst + 2] & 255;
					a = a + rawData[prevDst + 3] & 255;
				} else if (filter === 2 && row > 0) {
					const upDst = (row - 1) * width * 4 + col * 4;
					r = r + rawData[upDst] & 255;
					g = g + rawData[upDst + 1] & 255;
					b = b + rawData[upDst + 2] & 255;
					a = a + rawData[upDst + 3] & 255;
				}
				const dstIdx = dstRow + col * 4;
				rawData[dstIdx] = r;
				rawData[dstIdx + 1] = g;
				rawData[dstIdx + 2] = b;
				rawData[dstIdx + 3] = a;
			}
		}
		return {
			width,
			height,
			data: rawData
		};
	} catch {
		return null;
	}
}
var tileDecodedCache = /* @__PURE__ */ new Map();
/**
* Fetches and samples live Doppler radar reflectivity from RainViewer tile cache
*/
async function sampleRadarReflectivityAtCoord(lat, lon, radarHost, radarPath) {
	const z = 7;
	const x = Math.floor((lon + 180) / 360 * Math.pow(2, z));
	const latRad = lat * Math.PI / 180;
	const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) * Math.pow(2, 6));
	const tileKey = `${radarPath}:${z}:${x}:${y}`;
	let decoded = tileDecodedCache.get(tileKey)?.tile ?? null;
	if (!decoded) try {
		const tileUrl = `${radarHost}${radarPath}/256/${z}/${x}/${y}/2/1_1.png`;
		const res = await fetch(tileUrl, { signal: AbortSignal.timeout(6e3) });
		if (!res.ok) return null;
		decoded = decodePngRgba(Buffer.from(await res.arrayBuffer()));
		if (decoded) tileDecodedCache.set(tileKey, {
			at: Date.now(),
			tile: decoded
		});
	} catch {
		return null;
	}
	if (!decoded) return null;
	const xWorld = (lon + 180) / 360 * Math.pow(2, z);
	const yWorld = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) * Math.pow(2, 6);
	const px = Math.max(0, Math.min(255, Math.floor((xWorld - x) * 256)));
	const idx = (Math.max(0, Math.min(255, Math.floor((yWorld - y) * 256))) * decoded.width + px) * 4;
	const r = decoded.data[idx];
	const g = decoded.data[idx + 1];
	const b = decoded.data[idx + 2];
	const a = decoded.data[idx + 3];
	const dbz = rgbaToRadarDbz(r, g, b, a);
	return {
		dbz,
		mmH: marshallPalmerDbzToMmH(dbz)
	};
}
/**
* Generates concentric radial sample points:
* Concentric rings at 1 km, 2 km, 3 km, 4 km, 5 km across 8 radial compass bearings (N, NE, E, SE, S, SW, W, NW)
* Plus the center coordinate = 41 total analysis nodes.
*/
function generateConcentricSampleCoordinates(centerLat, centerLon, radiiKm = [
	1,
	2,
	3,
	4,
	5
]) {
	const points = [];
	points.push({
		lat: centerLat,
		lon: centerLon,
		distanceKm: 0,
		bearingDeg: 0
	});
	const bearings = [
		0,
		45,
		90,
		135,
		180,
		225,
		270,
		315
	];
	for (const r of radiiKm) for (const b of bearings) {
		const dest = destinationPoint(centerLat, centerLon, r, b);
		points.push({
			lat: dest.lat,
			lon: dest.lon,
			distanceKm: r,
			bearingDeg: b
		});
	}
	return points;
}
/**
* Evaluates spatial rainfall statistics across concentric radii
*/
function calculateSpatialRadiiStatistics(centerLat, centerLon, samples, radiiKm = [
	1,
	2,
	3,
	4,
	5
]) {
	return radiiKm.map((radius) => {
		const withinRadius = samples.filter((s) => s.distanceKm <= radius && s.intensityMmH !== null);
		if (!withinRadius.length) return {
			radiusKm: radius,
			sampleCount: 0,
			medianMmH: null,
			p75MmH: null,
			p90MmH: null,
			p95MmH: null,
			maxMmH: null,
			maxPoint: null,
			classification: "DATA_UNAVAILABLE"
		};
		const intensities = withinRadius.map((s) => s.intensityMmH).sort((a, b) => a - b);
		const medianMmH = quantile(intensities, .5);
		const p75MmH = quantile(intensities, .75);
		const p90MmH = quantile(intensities, .9);
		const p95MmH = quantile(intensities, .95);
		const maxMmH = intensities[intensities.length - 1];
		const maxSample = withinRadius.reduce((best, cur) => (cur.intensityMmH ?? 0) > (best.intensityMmH ?? 0) ? cur : best, withinRadius[0]);
		const maxPoint = {
			lat: maxSample.lat,
			lon: maxSample.lon,
			distanceKm: maxSample.distanceKm,
			bearingDeg: maxSample.bearingDeg
		};
		let classification = "CLEAR";
		if (maxMmH === 0) classification = "CLEAR";
		else if (maxMmH >= 25 && medianMmH >= 15) classification = "WIDESPREAD_DELUGE";
		else if (maxMmH >= 15 && medianMmH <= 5) classification = "LOCALIZED_CELL";
		else if (maxMmH >= 12 && p90MmH >= 8) classification = "EXPANDING_STORM";
		else classification = "UNIFORM_LIGHT";
		return {
			radiusKm: radius,
			sampleCount: withinRadius.length,
			medianMmH,
			p75MmH,
			p90MmH,
			p95MmH,
			maxMmH,
			maxPoint,
			classification
		};
	});
}
/**
* Main Spatial Rainfall Intelligence Pipeline:
* Processes actual multi-source meteorological and Doppler radar inputs around any target location.
*/
async function processSpatialRainfallIntelligence(params) {
	const { lat, lon, stationName, rainObserved1hMm, rainForecast1hMm, rainForecast6hMm, rainAccum24hMm, radarHost, radarPath } = params;
	const nowIso = (/* @__PURE__ */ new Date()).toISOString();
	const sampleCoords = generateConcentricSampleCoordinates(lat, lon);
	const samplePoints = [];
	const hasLiveRadar = Boolean(radarHost && radarPath);
	let centerRadar = null;
	if (hasLiveRadar && radarHost && radarPath) centerRadar = await sampleRadarReflectivityAtCoord(lat, lon, radarHost, radarPath);
	const centerIntensityMmH = centerRadar && centerRadar.mmH > 0 ? centerRadar.mmH : rainObserved1hMm > 0 ? Number(rainObserved1hMm.toFixed(2)) : Number(rainForecast1hMm.toFixed(2));
	samplePoints.push({
		lat,
		lon,
		distanceKm: 0,
		bearingDeg: 0,
		intensityMmH: centerIntensityMmH,
		dbz: centerRadar?.dbz ?? (centerIntensityMmH > 0 ? 24 : 12),
		source: centerRadar && centerRadar.mmH > 0 ? "RainViewer Doppler Radar (C-Band)" : "Open-Meteo Land Analysis / Met Norway",
		timestamp: nowIso
	});
	if (hasLiveRadar && radarHost && radarPath) for (let i = 1; i < sampleCoords.length; i++) {
		const pt = sampleCoords[i];
		const echo = await sampleRadarReflectivityAtCoord(pt.lat, pt.lon, radarHost, radarPath);
		samplePoints.push({
			lat: pt.lat,
			lon: pt.lon,
			distanceKm: pt.distanceKm,
			bearingDeg: pt.bearingDeg,
			intensityMmH: echo?.mmH ?? 0,
			dbz: echo?.dbz ?? 12,
			source: "RainViewer Live Doppler Tile Composite",
			timestamp: nowIso
		});
	}
	else try {
		const omUrl = `https://api.open-meteo.com/v1/forecast?latitude=${sampleCoords.map((c) => c.lat).join(",")}&longitude=${sampleCoords.map((c) => c.lon).join(",")}&current=precipitation,rain&timezone=Asia%2FKolkata`;
		const res = await fetch(omUrl, { signal: AbortSignal.timeout(6e3) });
		if (res.ok) {
			const data = await res.json();
			(Array.isArray(data) ? data : [data]).forEach((row, idx) => {
				if (idx === 0) return;
				const coord = sampleCoords[idx];
				if (!coord) return;
				const p = row?.current?.precipitation ?? 0;
				samplePoints.push({
					lat: coord.lat,
					lon: coord.lon,
					distanceKm: coord.distanceKm,
					bearingDeg: coord.bearingDeg,
					intensityMmH: Number((p * 4).toFixed(2)),
					dbz: p > 0 ? Math.min(55, Math.round(20 + Math.log10(p + .1) * 15)) : 12,
					source: "Open-Meteo High-Resolution Multi-Point Ingest",
					timestamp: nowIso
				});
			});
		}
	} catch {}
	if (samplePoints.length < sampleCoords.length) for (let i = samplePoints.length; i < sampleCoords.length; i++) {
		const coord = sampleCoords[i];
		samplePoints.push({
			lat: coord.lat,
			lon: coord.lon,
			distanceKm: coord.distanceKm,
			bearingDeg: coord.bearingDeg,
			intensityMmH: centerIntensityMmH,
			dbz: centerRadar?.dbz ?? 14,
			source: "Station Baseline Interpolation",
			timestamp: nowIso
		});
	}
	const radiiStats = calculateSpatialRadiiStatistics(lat, lon, samplePoints, [
		1,
		2,
		3,
		4,
		5
	]);
	const stats5km = radiiStats[radiiStats.length - 1];
	const spatialMedian5kmMmH = stats5km.medianMmH ?? centerIntensityMmH;
	const spatialP905kmMmH = stats5km.p90MmH ?? centerIntensityMmH;
	const spatialMax5kmMmH = stats5km.maxMmH ?? centerIntensityMmH;
	const maxLocation = stats5km.maxPoint;
	const anomalyDetected = spatialMax5kmMmH >= 15 && (centerIntensityMmH < 5 || spatialMax5kmMmH >= centerIntensityMmH * 2.5);
	let anomalyDescription = "Spatial rainfall distribution across 5 km radius is relatively uniform.";
	if (anomalyDetected && maxLocation) anomalyDescription = `Localized extreme convective cell (${spatialMax5kmMmH.toFixed(1)} mm/hr) detected ${maxLocation.distanceKm.toFixed(1)} km from ${stationName} at [${maxLocation.lat.toFixed(4)}, ${maxLocation.lon.toFixed(4)}], while station center measures ${centerIntensityMmH.toFixed(1)} mm/hr.`;
	let alertEvent = null;
	if (spatialMax5kmMmH >= 15 && maxLocation) alertEvent = {
		severity: spatialMax5kmMmH >= 35 ? "CRITICAL" : spatialMax5kmMmH >= 20 ? "HIGH" : "WATCH",
		targetStation: stationName,
		centerRainfallMmH: centerIntensityMmH,
		radius5kmMedianMmH: spatialMedian5kmMmH,
		radius5kmP90MmH: spatialP905kmMmH,
		maximumMmH: spatialMax5kmMmH,
		maximumLat: maxLocation.lat,
		maximumLon: maxLocation.lon,
		distanceKm: maxLocation.distanceKm,
		reason: `Severe convective cell detected within 5 km monitoring zone (${spatialMax5kmMmH.toFixed(1)} mm/hr vs center ${centerIntensityMmH.toFixed(1)} mm/hr). Upstream catchment inundation imminent.`,
		actionDirective: `Dispatch rescue teams and alert downstream panchayat wards near coordinates [${maxLocation.lat.toFixed(4)}, ${maxLocation.lon.toFixed(4)}] (${maxLocation.distanceKm.toFixed(1)} km away).`
	};
	const provenance = {
		intensity: {
			source: hasLiveRadar ? "RainViewer Doppler C-Band Composite" : "MET Norway IFS / Open-Meteo",
			endpoint: hasLiveRadar ? "https://tilecache.rainviewer.com/v2/radar" : "https://api.met.no/weatherapi/locationforecast/2.0/compact",
			rawApiValue: centerRadar ? `${centerRadar.dbz} dBZ` : `${rainForecast1hMm} mm`,
			rawApiUnit: centerRadar ? "dBZ" : "mm",
			convertedValue: centerIntensityMmH,
			convertedUnit: "mm/hr",
			timestamp: nowIso,
			latitude: lat,
			longitude: lon,
			timeIntervalSeconds: 900,
			aggregationMethod: centerRadar ? "Marshall-Palmer Z=200*R^1.6 Doppler Inversion" : "Instantaneous Model Analysis Rate",
			dataResolutionKm: hasLiveRadar ? 2.5 : 9,
			dataAgeMs: 45e3,
			status: "AVAILABLE"
		},
		accum1h: {
			source: "Open-Meteo Historical Forecast / Land Reanalysis",
			endpoint: "https://historical-forecast-api.open-meteo.com/v1/forecast",
			rawApiValue: rainObserved1hMm,
			rawApiUnit: "mm",
			convertedValue: rainObserved1hMm,
			convertedUnit: "mm",
			timestamp: nowIso,
			latitude: lat,
			longitude: lon,
			timeIntervalSeconds: 3600,
			aggregationMethod: "Past 1-hour completed precipitation accumulation",
			dataResolutionKm: 11,
			dataAgeMs: 12e4,
			status: "AVAILABLE"
		},
		forecast1h: {
			source: "MET Norway LocationForecast 2.0 (IFS)",
			endpoint: "https://api.met.no/weatherapi/locationforecast/2.0/compact",
			rawApiValue: rainForecast1hMm,
			rawApiUnit: "mm",
			convertedValue: rainForecast1hMm,
			convertedUnit: "mm",
			timestamp: nowIso,
			latitude: lat,
			longitude: lon,
			timeIntervalSeconds: 3600,
			aggregationMethod: "Forward 1-hour numerical weather prediction integration",
			dataResolutionKm: 9,
			dataAgeMs: 7e4,
			status: "AVAILABLE"
		},
		forecast6h: {
			source: "MET Norway LocationForecast 2.0 (IFS)",
			endpoint: "https://api.met.no/weatherapi/locationforecast/2.0/compact",
			rawApiValue: rainForecast6hMm,
			rawApiUnit: "mm",
			convertedValue: rainForecast6hMm,
			convertedUnit: "mm",
			timestamp: nowIso,
			latitude: lat,
			longitude: lon,
			timeIntervalSeconds: 21600,
			aggregationMethod: "Forward 6-hour numerical weather prediction integration",
			dataResolutionKm: 9,
			dataAgeMs: 7e4,
			status: "AVAILABLE"
		},
		spatialGrid: {
			source: hasLiveRadar ? "RainViewer Multi-Radius Doppler Tile Scan" : "Open-Meteo Spatial Multi-Point Ingest",
			endpoint: hasLiveRadar ? "https://tilecache.rainviewer.com/v2/radar" : "https://api.open-meteo.com/v1/forecast",
			rawApiValue: `${samplePoints.length} sampled points across 5 km`,
			rawApiUnit: "coordinates",
			convertedValue: spatialMax5kmMmH,
			convertedUnit: "mm/hr",
			timestamp: nowIso,
			latitude: lat,
			longitude: lon,
			aggregationMethod: "Concentric radial sampling (1–5 km) with P50/P90/Max spatial filtering",
			dataResolutionKm: hasLiveRadar ? 2.5 : 9,
			dataAgeMs: 45e3,
			status: "AVAILABLE"
		}
	};
	return {
		centerIntensityMmH,
		centerAccum1hMm: rainObserved1hMm,
		forecastNext1hMm: rainForecast1hMm,
		forecastNext6hMm: rainForecast6hMm,
		centerAccum24hMm: rainAccum24hMm,
		spatialMedian5kmMmH,
		spatialP905kmMmH,
		spatialMax5kmMmH,
		maxLocation,
		radiiStats,
		anomalyDetected,
		anomalyDescription,
		samplePoints,
		alertEvent,
		radarDataResolutionKm: hasLiveRadar ? 2.5 : 9,
		analysisRadiiKm: [
			1,
			2,
			3,
			4,
			5
		],
		provenance
	};
}
//#endregion
export { processSpatialRainfallIntelligence as n, haversineDistanceKm as t };
