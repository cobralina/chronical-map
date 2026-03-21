<script>
  import { onDestroy, onMount, tick } from "svelte";
  import maplibregl from "maplibre-gl";
  import { Protocol } from "pmtiles";

  // ─── Konstanten ───────────────────────────────────────────────────────────

  const MAP_SOURCE_ID = "acled-events";
  const BASES_SOURCE_ID = "us-bases";

  const BOUNDS_MOBILE = [
    [28, -4],
    [72, 43],
  ];
  const BOUNDS_DESKTOP = [
    [18, 22],
    [70, 41],
  ];
  const MIN_ZOOM = 3;
  const MAX_ZOOM = 8;
  const THUMB_SIZE = 18;
  const MIN_EVENT_CIRCLE_RADIUS = 6;
  const MAX_EVENT_CIRCLE_RADIUS = 20;

  const ACLED_DATA_URL = import.meta.env.VITE_APP_ACLED_DATA_URL || `${import.meta.env.BASE_URL}acled_map_data.json`;
  const COUNTRIES_FILL_URL = `${import.meta.env.BASE_URL}countries_fill.geojson`;
  const COUNTRIES_HATCH_URL = `${import.meta.env.BASE_URL}countries_hatch.geojson`;
  const COUNTRIES_LABELS_URL = `${import.meta.env.BASE_URL}countries_labels.geojson`;
  const BASES_URL = `${import.meta.env.BASE_URL}us_bases.json`;

  const MAP_PMTILES_URL = import.meta.env.VITE_APP_MAP_PMTILES_URL || "";
  const MAP_PMTILES_TYPE = import.meta.env.VITE_APP_MAP_PMTILES_TYPE || "raster";

  const ACTOR_COLORS = {
    light: { IRN: "#A82424", US_ISR: "#2962A3", fallback: "#6b7280" },
    dark: { IRN: "#f87171", US_ISR: "#60a5fa", fallback: "#9ca3af" },
  };

  const MAP_CONTROL_ICONS = {
    zoomIn: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/>
        <path fill-rule="evenodd" clip-rule="evenodd" d="M12 20.25C16.5563 20.25 20.25 16.5563 20.25 12C20.25 7.44365 16.5563 3.75 12 3.75C7.44365 3.75 3.75 7.44365 3.75 12C3.75 16.5563 7.44365 20.25 12 20.25ZM21.75 12C21.75 17.3848 17.3848 21.75 12 21.75C6.61522 21.75 2.25 17.3848 2.25 12C2.25 6.61522 6.61522 2.25 12 2.25C17.3848 2.25 21.75 6.61522 21.75 12Z" fill="currentColor"/>
        <path fill-rule="evenodd" clip-rule="evenodd" d="M7.25 11.75C7.25 11.3358 7.58579 11 8 11H16C16.4142 11 16.75 11.3358 16.75 11.75C16.75 12.1642 16.4142 12.5 16 12.5H8C7.58579 12.5 7.25 12.1642 7.25 11.75Z" fill="currentColor"/>
        <path fill-rule="evenodd" clip-rule="evenodd" d="M12 7.25C12.4142 7.25 12.75 7.58579 12.75 8V16C12.75 16.4142 12.4142 16.75 12 16.75C11.5858 16.75 11.25 16.4142 11.25 16V8C11.25 7.58579 11.5858 7.25 12 7.25Z" fill="currentColor"/>
      </svg>`,
    zoomOut: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/>
        <path fill-rule="evenodd" clip-rule="evenodd" d="M12 3.75C7.44365 3.75 3.75 7.44365 3.75 12C3.75 16.5563 7.44365 20.25 12 20.25C16.5563 20.25 20.25 16.5563 20.25 12C20.25 7.44365 16.5563 3.75 12 3.75ZM2.25 12C2.25 6.61522 6.61522 2.25 12 2.25C17.3848 2.25 21.75 6.61522 21.75 12C21.75 17.3848 17.3848 21.75 12 21.75C6.61522 21.75 2.25 17.3848 2.25 12ZM7.25 12C7.25 11.5858 7.58579 11.25 8 11.25H16C16.4142 11.25 16.75 11.5858 16.75 12C16.75 12.4142 16.4142 12.75 16 12.75H8C7.58579 12.75 7.25 12.4142 7.25 12Z" fill="currentColor"/>
      </svg>`,
    reset: `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/>
        <path d="M7.67578 10.2499L7.67578 7.92553L10.0001 7.92553" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M14 7.92566L16.3243 7.92566L16.3243 10.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M10 16.0741L7.67565 16.0741L7.67565 13.7497" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M16.3242 13.7499L16.3242 16.0742L13.9999 16.0742" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
  };

  // ─── State ─────────────────────────────────────────────────────────────────

  let pmtilesProtocolRegistered = false;
  let colorSchemeQuery;
  let mapContainer;
  let map;
  let activePopup = null;
  let mapData = null;
  let dates = [];
  let selectedIndex = 0;
  let selectedDate = "";
  let isLoading = true;
  let loadError = "";
  let currentMapTheme = "light";
  let maxEventCount = 1;
  let containerEl;
  let labelEl;
  let labelLeft = "0px";

  // ─── Hilfsfunktionen ───────────────────────────────────────────────────────

  const getActorColors = (theme = currentMapTheme) => ACTOR_COLORS[theme] ?? ACTOR_COLORS.light;

  const getMapBounds = () => (window.innerWidth < 768 ? BOUNDS_MOBILE : BOUNDS_DESKTOP);

  const formatDate = (value) => {
    if (!value) return "";
    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(`${value}T00:00:00`));
  };

  const formatDateShort = (value) => {
    if (!value) return "";
    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "long",
    }).format(new Date(`${value}T00:00:00`));
  };

  const formatActor = (actor) => ({ US_ISR: "USA und Israel", IRN: "Iran" })[actor] ?? actor;

  const thumbPercent = (index, total) => (total <= 1 ? 0 : (index / (total - 1)) * 100);

  const updateLabelLeft = async (index, total) => {
    await tick(); // warten bis DOM aktualisiert ist
    if (!labelEl || !containerEl) {
      labelLeft = `${thumbPercent(index, total)}%`;
      return;
    }

    const containerWidth = containerEl.offsetWidth;
    const labelWidth = labelEl.offsetWidth;

    const thumbRadius = 18;
    const trackWidth = containerWidth - thumbRadius * 2;

    const percent = total <= 1 ? 0 : index / (total - 1);
    const idealLeft = thumbRadius + percent * trackWidth - labelWidth / 2;
    const clampedLeft = Math.max(0, Math.min(idealLeft, containerWidth - labelWidth));

    labelLeft = `${clampedLeft}px`;
  };

  // ─── Intro-Animation ───────────────────────────────────────────────────────

  let isAnimating = false;
  let appShellEl;
  let intersectionObserver;

  const runIntroAnimation = async () => {
    if (isAnimating || dates.length === 0) return;
    isAnimating = true;

    const totalSteps = dates.length;
    const totalDuration = 5000; // ms für den kompletten Durchlauf
    const stepDelay = totalDuration / totalSteps;

    for (let i = 0; i < totalSteps; i++) {
      selectedIndex = i;
      selectedDate = dates[i];
      updateMapData();
      await new Promise((resolve) => setTimeout(resolve, stepDelay));
    }

    // Am Ende auf letztes Datum stehen bleiben (oder zurück: selectedIndex = dates.length - 1)
    isAnimating = false;
  };

  const initIntersectionObserver = () => {
    intersectionObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          runIntroAnimation();
          intersectionObserver.disconnect(); // nur einmal auslösen
        }
      },
      { threshold: 0.5 }, // App muss zu 50% sichtbar sein
    );

    if (appShellEl) intersectionObserver.observe(appShellEl);
  };

  // ─── Kartendaten ───────────────────────────────────────────────────────────

  const getFeaturesForDate = (date) =>
    (mapData?.days?.[date] ?? []).map((entry, index) => ({
      type: "Feature",
      id: `${date}-${index}`,
      properties: { actorGroup: entry.actorGroup, count: entry.count },
      geometry: {
        type: "Point",
        coordinates: [entry.longitude, entry.latitude],
      },
    }));

  const getGeoJsonForDate = (date) => ({
    type: "FeatureCollection",
    features: getFeaturesForDate(date),
  });

  const getMaxEventCount = () =>
    Math.max(1, ...Object.values(mapData?.days ?? {}).flatMap((entries) => entries.map((e) => Number(e.count) || 0)));

  const buildEventCircleRadiusExpression = () => {
    const maxCount = getMaxEventCount();
    if (maxCount <= 1) {
      return ["interpolate", ["linear"], ["get", "count"], 1, MIN_EVENT_CIRCLE_RADIUS];
    }

    const stopCount = 5;
    const stops = new Map([[1, MIN_EVENT_CIRCLE_RADIUS]]);

    for (let i = 1; i < stopCount; i++) {
      const t = i / (stopCount - 1);
      const count = Math.round(1 + (maxCount - 1) * t ** 2);
      const radius = Math.round(MIN_EVENT_CIRCLE_RADIUS + (MAX_EVENT_CIRCLE_RADIUS - MIN_EVENT_CIRCLE_RADIUS) * t);
      stops.set(count, radius);
    }

    stops.set(maxCount, MAX_EVENT_CIRCLE_RADIUS);
    return ["interpolate", ["linear"], ["get", "count"], ...Array.from(stops.entries()).flat()];
  };

  // ─── Karten-Update ─────────────────────────────────────────────────────────

  const updateMapData = () => {
    if (!map || !selectedDate) return;
    map.getSource(MAP_SOURCE_ID)?.setData(getGeoJsonForDate(selectedDate));
  };

  const closeActivePopup = () => {
    activePopup?.remove();
    activePopup = null;
  };

  const resetMapView = () => {
    map?.fitBounds(getMapBounds(), {
      padding: 24,
      duration: 800,
      bearing: 0,
      pitch: 0,
      maxZoom: MAX_ZOOM,
    });
  };

  // ─── Pattern & Icons ───────────────────────────────────────────────────────

  const createHatchPattern = () => {
    const size = 18;
    const stripeWidth = 3;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, size, size);
    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;
    const [r, g, b, a] = [116, 146, 154, 100];

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if ((x + y) % (stripeWidth * 2) < stripeWidth) {
          const idx = (y * size + x) * 4;
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = a;
        }
      }
    }
    return imageData;
  };

  const createBaseIcon = (size = 10, color = "#717171", borderWidth = 1, borderColor = "#ffffff", radius = 2) => {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    // Weißer Border (gerundetes Rechteck außen)
    ctx.fillStyle = borderColor;
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, radius);
    ctx.fill();

    // Farbiges Innere (etwas kleinerer Radius damit es nicht überlappt)
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(
      borderWidth,
      borderWidth,
      size - borderWidth * 2,
      size - borderWidth * 2,
      Math.max(0, radius - borderWidth),
    );
    ctx.fill();

    return ctx.getImageData(0, 0, size, size);
  };

  // ─── Layer Setup ───────────────────────────────────────────────────────────

  const ensureCountryLayer = () => {
    if (!map) return;

    // Fill-Länder
    if (!map.getSource("country-fill-source")) {
      map.addSource("country-fill-source", { type: "geojson", data: COUNTRIES_FILL_URL });
    }
    if (!map.getLayer("country-fills-solid")) {
      map.addLayer({
        id: "country-fills-solid",
        type: "fill",
        source: "country-fill-source",
        paint: { "fill-color": ["coalesce", ["get", "color"], "#cccccc"], "fill-opacity": 0.5 },
      });
    }
    if (!map.getLayer("country-borders-fill")) {
      map.addLayer({
        id: "country-borders-fill",
        type: "line",
        source: "country-fill-source",
        paint: {
          "line-color": ["coalesce", ["get", "color"], "#cccccc"],
          "line-width": 1,
          "line-opacity": 0.6,
        },
      });
    }

    // Schraffur-Länder
    if (!map.hasImage("hatch-pattern")) {
      const imageData = createHatchPattern();
      map.addImage("hatch-pattern", {
        width: imageData.width,
        height: imageData.height,
        data: imageData.data,
      });
    }
    if (!map.getSource("country-hatch-source")) {
      map.addSource("country-hatch-source", { type: "geojson", data: COUNTRIES_HATCH_URL });
    }
    if (!map.getLayer("country-fills-hatch")) {
      map.addLayer({
        id: "country-fills-hatch",
        type: "fill",
        source: "country-hatch-source",
        paint: { "fill-pattern": "hatch-pattern", "fill-opacity": 0.8 },
      });
    }
    if (!map.getLayer("country-borders-hatch")) {
      map.addLayer({
        id: "country-borders-hatch",
        type: "line",
        source: "country-hatch-source",
        paint: { "line-color": "#74929a", "line-width": 1, "line-opacity": 0.6 },
      });
    }

    // Labels
    if (!map.getSource("country-labels-source")) {
      map.addSource("country-labels-source", { type: "geojson", data: COUNTRIES_LABELS_URL });
    }
    if (!map.getLayer("country-labels")) {
      map.addLayer({
        id: "country-labels",
        type: "symbol",
        source: "country-labels-source",
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["Open Sans Regular"],
          "text-size": 13,
          "text-anchor": "center",
        },
        paint: { "text-color": "#3a3a3a", "text-halo-color": "#ffffff", "text-halo-width": 1.5 },
      });
    }
  };

  const ensureBasesLayer = () => {
    if (!map) return;

    if (!map.getSource(BASES_SOURCE_ID)) {
      map.addSource(BASES_SOURCE_ID, { type: "geojson", data: BASES_URL });
    }

    if (!map.hasImage("base-icon")) {
      const icon = createBaseIcon(12, "#717171");
      map.addImage("base-icon", { width: icon.width, height: icon.height, data: icon.data });
    }

    if (!map.getSource(BASES_SOURCE_ID)) {
      map.addSource(BASES_SOURCE_ID, { type: "geojson", data: basesGeoJSON });
    }

    if (!map.getLayer("bases-layer")) {
      map.addLayer({
        id: "bases-layer",
        type: "symbol",
        source: BASES_SOURCE_ID,
        layout: {
          "icon-image": "base-icon",
          "icon-size": 1,
          "icon-allow-overlap": true,
        },
      });
    }
  };

  const ensureEventLayer = () => {
    if (!map) return;

    ensureCountryLayer();
    ensureBasesLayer(); // Basen unter den Angriffspunkten

    const actorColors = getActorColors();

    if (!map.getSource(MAP_SOURCE_ID)) {
      map.addSource(MAP_SOURCE_ID, {
        type: "geojson",
        data: getGeoJsonForDate(selectedDate),
      });
    }

    if (!map.getLayer("acled-events-circles")) {
      map.addLayer({
        id: "acled-events-circles",
        type: "circle",
        source: MAP_SOURCE_ID,
        paint: {
          "circle-color": [
            "match",
            ["get", "actorGroup"],
            "IRN",
            actorColors.IRN,
            "US_ISR",
            actorColors.US_ISR,
            actorColors.fallback,
          ],
          "circle-radius": buildEventCircleRadiusExpression(),
          "circle-opacity": 0.75,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#ffffff",
        },
      });
    }
  };

  // ─── Event Handler ─────────────────────────────────────────────────────────

  const handleSliderInput = (event) => {
    closeActivePopup();
    selectedIndex = Number(event.currentTarget.value);
    selectedDate = dates[selectedIndex] ?? "";
    updateMapData();
  };

  const handleMapThemeChange = async (event) => {
    const nextTheme = event.matches ? "dark" : "light";
    if (!map || currentMapTheme === nextTheme) {
      currentMapTheme = nextTheme;
      return;
    }
    currentMapTheme = nextTheme;
    closeActivePopup();
    map.setStyle(await loadMapStyle());
  };

  // ─── Karten-Initialisierung ────────────────────────────────────────────────

  const registerPmtilesProtocol = () => {
    if (pmtilesProtocolRegistered || !MAP_PMTILES_URL) return;
    maplibregl.addProtocol("pmtiles", new Protocol().tile);
    pmtilesProtocolRegistered = true;
  };

  const getPreferredMapTheme = () => (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

  const getMapStyleUrl = (theme = currentMapTheme) => `${import.meta.env.BASE_URL}map_style.${theme}.json`;

  const loadMapStyle = async () => {
    if (!MAP_PMTILES_URL || MAP_PMTILES_TYPE === "raster") {
      return MAP_PMTILES_URL
        ? {
            version: 8,
            sources: { basemap: { type: "raster", url: `pmtiles://${MAP_PMTILES_URL}`, tileSize: 256 } },
            layers: [{ id: "basemap", type: "raster", source: "basemap" }],
          }
        : getMapStyleUrl();
    }

    const response = await fetch(getMapStyleUrl());
    if (!response.ok) throw new Error(`Map style konnte nicht geladen werden: HTTP ${response.status}`);
    const style = await response.json();

    const sources = Object.fromEntries(
      Object.entries(style.sources ?? {}).map(([id, src]) =>
        src?.url?.startsWith("pmtiles://") ? [id, { ...src, url: `pmtiles://${MAP_PMTILES_URL}` }] : [id, src],
      ),
    );

    return { ...style, sources };
  };

  const applyControlIcons = () => {
    if (!mapContainer) return;
    const selectors = {
      ".maplibregl-ctrl-zoom-in": "zoomIn",
      ".maplibregl-ctrl-zoom-out": "zoomOut",
      ".map-reset-control": "reset",
    };
    Object.entries(selectors).forEach(([selector, key]) => {
      const el = mapContainer.querySelector(selector);
      if (el) el.innerHTML = MAP_CONTROL_ICONS[key];
    });
  };

  const attachResetButton = () => {
    const controlGroup = mapContainer?.querySelector(".maplibregl-ctrl-top-right .maplibregl-ctrl-group");
    if (!controlGroup || controlGroup.querySelector(".map-reset-control")) return;

    const button = document.createElement("button");
    button.className = "maplibregl-ctrl-icon map-reset-control";
    button.type = "button";
    button.title = "Reset Ansicht";
    button.setAttribute("aria-label", "Reset Ansicht");
    button.innerHTML = MAP_CONTROL_ICONS.reset;
    button.addEventListener("click", resetMapView);
    controlGroup.appendChild(button);
  };

  const initializeMap = async () => {
    if (!mapContainer || map || !selectedDate) return;

    registerPmtilesProtocol();
    currentMapTheme = getPreferredMapTheme();

    map = new maplibregl.Map({
      container: mapContainer,
      style: await loadMapStyle(),
      bounds: getMapBounds(),
      maxBounds: getMapBounds(),
      fitBoundsOptions: { padding: 24, maxZoom: MAX_ZOOM },
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    attachResetButton();
    applyControlIcons();

    map.on("load", () => {
      ensureEventLayer();

      // Klick auf Angriffspunkte
      map.on("click", "acled-events-circles", (event) => {
        const feature = event.features?.[0];
        if (!feature) return;
        closeActivePopup();

        const count = feature.properties.count;
        activePopup = new maplibregl.Popup({ offset: 12 })
          .setLngLat(feature.geometry.coordinates)
          .setHTML(
            `
            <strong>${formatDateShort(selectedDate)}</strong><br />
            ${count} ${count > 1 ? "Angriffe" : "Angriff"} von ${formatActor(feature.properties.actorGroup)}
          `,
          )
          .addTo(map);
      });

      // Klick auf Militärbasen
      map.on("click", "bases-layer", (event) => {
        const feature = event.features?.[0];
        if (!feature) return;
        closeActivePopup();

        activePopup = new maplibregl.Popup({ offset: 12 })
          .setLngLat(feature.geometry.coordinates)
          .setHTML(`<strong>${feature.properties.name}</strong>`)
          .addTo(map);
      });

      // Cursor-Verhalten
      ["acled-events-circles", "bases-layer"].forEach((layerId) => {
        map.on("mouseenter", layerId, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layerId, () => {
          map.getCanvas().style.cursor = "";
        });
      });
    });

    map.on("style.load", () => ensureEventLayer());
  };

  // ─── Daten laden ───────────────────────────────────────────────────────────

  const loadData = async () => {
    isLoading = true;
    loadError = "";
    try {
      const response = await fetch(ACLED_DATA_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      mapData = await response.json();
      console.log("Kartendaten geladen:", mapData);
      console.log("counts", getMaxEventCount());
      maxEventCount = getMaxEventCount();
      dates = Object.keys(mapData.days ?? {}).sort();
      selectedIndex = Math.max(dates.length - 1, 0);
      selectedDate = dates[selectedIndex] ?? "";
      await initializeMap();
    } catch (error) {
      loadError = "Daten konnten nicht geladen werden.";
      console.error(error);
    } finally {
      isLoading = false;
      initIntersectionObserver();
    }
  };

  // ─── Reaktivität ───────────────────────────────────────────────────────────

  $: selectedDate && map && updateMapData();

  $: updateLabelLeft(selectedIndex, dates.length);

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  onMount(() => {
    colorSchemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    colorSchemeQuery.addEventListener("change", handleMapThemeChange);
    loadData();
  });

  onDestroy(() => {
    colorSchemeQuery?.removeEventListener("change", handleMapThemeChange);
    closeActivePopup();
    map?.remove();
    intersectionObserver?.disconnect();
  });
</script>

<svelte:head>
  <title>ACLED Karte</title>
</svelte:head>

<main class="app-shell" bind:this={appShellEl}>
  <div class="intro">
    <h2>Luftangriffe in der Golfregion</h2>
    <p>
      Die Kreise auf den Karten zeigen erfolgreiche als auch abgefangene Raketen-, Drohnen- und Luftangriffe, die Größe
      der Kreise entspricht der Anzahl der Angriffe.
    </p>
  </div>

  <div class="controls__meta">
    <div class="legend">
      <span class="legend__item">
        <i class="legend__dot legend__dot--small legend__box--base"></i>
        US-Militärbasis
      </span>
      <span class="legend__item">
        Angriffe von
        <i class="legend__dot legend__dot--us-isr"></i>
        USA oder Israel
      </span>
      <span class="legend__item">
        <i class="legend__dot legend__dot--irn"></i>
        Iran und Verbündeten
      </span>

      <span class="legend__item legend__item--size">
        <!-- <span class="legend__item"> Anzahl: </span> -->
        <span class="legend__dot-wrap" data-value="1">
          <i class="legend__dot legend__dot--small legend__dot--size"></i>
        </span>
        <span class="legend__dot-wrap" data-value={maxEventCount / 2}>
          <i class="legend__dot legend__dot--medium legend__dot--size"></i>
        </span>
        <span class="legend__dot-wrap" data-value={maxEventCount}>
          <i class="legend__dot legend__dot--large legend__dot--size"></i>
        </span>
      </span>
    </div>
  </div>

  {#if loadError}
    <p class="status status--error">{loadError}</p>
  {:else}
    <section class="map-panel">
      <div class="map-wrapper" data-theme={currentMapTheme}>
        <div bind:this={mapContainer} class="map-frame">
          {#if isLoading}
            <div class="map-overlay">Lade Kartendaten…</div>
          {/if}
        </div>
      </div>

      <div class="controls" data-theme={currentMapTheme}>
        <div class="slider-wrapper">
          <!--  <div class="slider-label" bind:this={labelEl} style="left: {labelLeft}">
            {formatDateShort(selectedDate)}
          </div> -->

          <div class="slider-track-wrap" bind:this={containerEl}>
            <!-- Ticks -->
            {#each dates as _, i}
              <span class="slider-tick" style="left: {(i / Math.max(dates.length - 1, 1)) * 100}%"></span>
            {/each}

            <!-- Custom Thumb -->
            <div
              class="slider-thumb"
              class:is-first={selectedIndex === 0}
              class:is-last={selectedIndex === dates.length - 1}
              style="left: {thumbPercent(selectedIndex, dates.length)}%"
              aria-hidden="true"
            >
              <span class="slider-label">{formatDateShort(selectedDate)}</span>
              <span>&#8249;&nbsp;&nbsp;&#8250;</span>
            </div>

            <input
              type="range"
              min="0"
              max={Math.max(dates.length - 1, 0)}
              step="1"
              value={selectedIndex}
              on:input={handleSliderInput}
              disabled={dates.length === 0 || isAnimating}
            />
          </div>

          <div class="controls__dates">
            <span>{formatDateShort(dates[0])}</span>
            <span>{formatDateShort(dates[dates.length - 1])}</span>
          </div>
        </div>
      </div>
    </section>
  {/if}

  <div class="footnote">
    Die Daten vom {formatDate(dates[dates.length - 1])} umfassen nur den Zeitraum von 0 bis 10 Uhr. Zu den Angriffen zählen
    sowohl erfolgreiche als auch abgefangene Raketen-, Drohnen- und Luftangriffe. / Grafik...
  </div>
</main>

<style lang="scss">
</style>
