/**
 * CesiumJS Client-Side Dynamic Loader
 * ====================================
 * Safely loads CesiumJS in browser environments for TanStack Start / SSR applications.
 * Prevents SSR crashes ("window is not defined") and eliminates Vite worker bundler conflicts.
 * 
 * Provides:
 * - Standalone Cesium UMD module with all WebAssembly terrain workers
 * - ArcGIS WorldElevation3D Terrain3D provider (Real global 3D DEM, no Ion token needed)
 * - Cesium World Terrain fallback
 * - ArcGIS World Imagery & Sentinel basemaps
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Cesium?: any;
    CESIUM_BASE_URL?: string;
  }
}

const CESIUM_VERSION = "1.120.0";
const CESIUM_CDN_BASE = `https://cdnjs.cloudflare.com/ajax/libs/cesium/${CESIUM_VERSION}/`;
const CESIUM_JS_URL = `${CESIUM_CDN_BASE}Cesium.js`;
const CESIUM_CSS_URL = `${CESIUM_CDN_BASE}Widgets/widgets.css`;

let cesiumPromise: Promise<any> | null = null;

export function loadCesium(): Promise<any> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Cesium can only be loaded in a browser context."));
  }

  if (window.Cesium) {
    return Promise.resolve(window.Cesium);
  }

  if (cesiumPromise) {
    return cesiumPromise;
  }

  cesiumPromise = new Promise((resolve, reject) => {
    try {
      // 1. Set global base URL before loading scripts so workers resolve properly
      window.CESIUM_BASE_URL = CESIUM_CDN_BASE;

      // 2. Inject CSS if not already present
      if (!document.querySelector(`link[href="${CESIUM_CSS_URL}"]`)) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = CESIUM_CSS_URL;
        document.head.appendChild(link);
      }

      // 3. Inject JS if not already present
      const existingScript = document.querySelector(`script[src="${CESIUM_JS_URL}"]`) as HTMLScriptElement | null;
      if (existingScript) {
        existingScript.addEventListener("load", () => {
          if (window.Cesium) resolve(window.Cesium);
          else reject(new Error("Cesium script loaded but window.Cesium not defined"));
        });
        existingScript.addEventListener("error", (e) => reject(e));
        return;
      }

      const script = document.createElement("script");
      script.src = CESIUM_JS_URL;
      script.async = true;

      // 30s timeout protection
      const timeoutTimer = setTimeout(() => {
        reject(new Error("Cesium load timed out after 30 seconds."));
      }, 30000);

      script.onload = () => {
        clearTimeout(timeoutTimer);
        if (window.Cesium) {
          console.log(`[CesiumLoader] CesiumJS ${CESIUM_VERSION} initialized successfully.`);
          resolve(window.Cesium);
        } else {
          reject(new Error("Cesium script loaded but window.Cesium is not defined."));
        }
      };

      script.onerror = (err) => {
        clearTimeout(timeoutTimer);
        reject(new Error(`Failed to load CesiumJS from CDN: ${err}`));
      };

      document.body.appendChild(script);
    } catch (err) {
      reject(err);
    }
  });

  return cesiumPromise;
}

/**
 * Creates genuine 3D Terrain Provider for India & the world.
 * Primary: ArcGIS WorldElevation3D (Public, genuine DEM, no token needed)
 * Secondary: Cesium World Terrain
 * Tertiary: EllipsoidTerrainProvider (graceful offline fallback)
 */
export async function createIndiaTerrainProvider(Cesium: any): Promise<any> {
  // 1. Try ArcGIS Tiled Elevation Terrain (Real 3D DEM across Himalayas, Western Ghats, NE India)
  try {
    if (Cesium.ArcGISTiledElevationTerrainProvider) {
      const arcgisTerrain = await Cesium.ArcGISTiledElevationTerrainProvider.fromUrl(
        "https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer"
      );
      console.log("[Terrain3D] Streamed real 3D DEM via ArcGIS WorldElevation3D.");
      return arcgisTerrain;
    }
  } catch (err) {
    console.warn("[Terrain3D] ArcGIS WorldElevation3D unavailable, attempting Cesium World Terrain fallback:", err);
  }

  // 2. Try Cesium World Terrain
  try {
    if (Cesium.createWorldTerrainAsync) {
      const worldTerrain = await Cesium.createWorldTerrainAsync({
        requestWaterMask: true,
        requestVertexNormals: true,
      });
      console.log("[Terrain3D] Loaded Cesium World Terrain.");
      return worldTerrain;
    }
  } catch (err) {
    console.warn("[Terrain3D] Cesium World Terrain fallback failed:", err);
  }

  // 3. Graceful fallback
  console.log("[Terrain3D] Using Ellipsoidal terrain fallback.");
  return new Cesium.EllipsoidTerrainProvider();
}

/**
 * Creates High-Resolution Satellite & Aerial Imagery Layer.
 * Primary: ArcGIS World Imagery (real satellite textures of mountain slopes)
 */
export async function createIndiaSatelliteImagery(Cesium: any): Promise<any> {
  try {
    if (Cesium.ArcGisMapServerImageryProvider) {
      const arcgisImagery = await Cesium.ArcGisMapServerImageryProvider.fromUrl(
        "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer",
        { enablePickFeatures: false }
      );
      return arcgisImagery;
    }
  } catch (err) {
    console.warn("[Terrain3D] ArcGIS World Imagery fallback failed, using OSM:", err);
  }

  // Fallback to OpenStreetMap
  return new Cesium.OpenStreetMapImageryProvider({
    url: "https://tile.openstreetmap.org/",
  });
}

