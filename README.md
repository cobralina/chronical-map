# iran-war-chronology

Svelte/Vite-Projekt fuer eine eingebettete Karte zur Chronik des Iran-Kriegs 2026. Die Anwendung laedt taeglich aggregierte ACLED-Ereignisdaten, visualisiert sie mit MapLibre als Punkte auf einer Zeitleiste.

## Tech-Stack

- `Svelte` fuer die UI
- `Vite` als Build- und Dev-Tooling
- `MapLibre GL` fuer die Karten-Engine
- `pmtiles` fuer optionale Basiskarten aus PMTiles

## Lokale Entwicklung

### Voraussetzungen

- `Node.js`
- `npm`

### Start

```bash
npm install
npm run dev
```

Standardmaessig laeuft die App danach unter `http://localhost:3000`.

## Skripte

| Skript               | Funktion                                        |
| -------------------- | ----------------------------------------------- |
| `npm run dev`        | lokaler Vite-Dev-Server                         |
| `npm run build`      | Produktionsbuild mit aktivem Modus `production` |
| `npm run production` | Alias fuer `vite build`                         |
| `npm run release`    | Alias fuer `vite build`                         |
| `npm run stage`      | Build im Modus `stage`                          |
| `npm run test`       | Build im Modus `test`                           |
| `npm run preview`    | Vorschau des letzten Builds                     |

## Environment-Variablen

Die App verwendet ausschliesslich Variablen mit Prefix `VITE_APP_`. Eine Vorlage liegt in [.env.example](/Users/rstierli/fazit/2026_Iran_Krieg_Chronik/.env.example).

| Variable                         | Beschreibung                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------- |
| `VITE_APP_BASE_URL`              | Base-URL fuer Assets, `index.html`, `iframe.html` und `livingdocs.html`               |
| `VITE_APP_ACLED_DATA_URL`        | URL zur ACLED-JSON-Datei; lokal meist `./acled_map_data.json`                         |
| `VITE_APP_MAP_PMTILES_URL`       | optionale URL zu einer PMTiles-Datei                                                  |
| `VITE_APP_MAP_PMTILES_TYPE`      | `vector` fuer Style-JSON-basierte PMTiles, `raster` fuer direkten Raster-Source-Modus |
| `VITE_APP_DISTRIBUTION_FOLDER`   | Zielordner des Builds, z. B. `dist/stage` oder `dist/release`                         |
| `VITE_APP_PRODUCTION_SOURCE_MAP` | `true` aktiviert Source Maps im Build                                                 |
| `VITE_APP_ENV`                   | freies Kennzeichen fuer die Umgebung, aktuell ohne direkte Laufzeitlogik              |

### Beispiel

```env
VITE_APP_BASE_URL=.
VITE_APP_ACLED_DATA_URL=./acled_map_data.json
VITE_APP_MAP_PMTILES_URL=
VITE_APP_MAP_PMTILES_TYPE=vector
VITE_APP_ENV=development
VITE_APP_PRODUCTION_SOURCE_MAP=true
VITE_APP_DISTRIBUTION_FOLDER=dist/development
```

## Datenformat

Die Karte erwartet ein JSON mit einem Objekt `days`, dessen Keys ISO-Datumswerte sind. Jeder Tag enthaelt ein Array aus aggregierten Punkten:

```json
{
  "days": {
    "2026-02-28": [
      {
        "latitude": 24.1,
        "longitude": 47.6,
        "actorGroup": "IRN",
        "count": 1
      }
    ]
  }
}
```

Verwendete Felder:

- `latitude`
- `longitude`
- `actorGroup`
- `count`

Die Beispielstruktur liegt in [public/acled_map_data.json](/Users/rstierli/fazit/2026_Iran_Krieg_Chronik/public/acled_map_data.json).

## Kartenlogik

- Die Daten werden beim Start geladen und die verfuegbaren Tage sortiert.
- Der Slider wechselt zwischen den Tagen und aktualisiert die GeoJSON-Source live.
- Die Kreisgroessen werden dynamisch aus dem groessten vorhandenen `count` berechnet.
- Klicks auf Punkte oeffnen ein Popup mit Datum, Akteursgruppe und Anzahl.
- Die Kartenansicht nutzt unterschiedliche Bounds fuer Mobile und Desktop.
- Zusaetzlich zu den Standard-Zoom-Controls wird ein eigener Reset-Button eingefuegt.

## PMTiles und Kartenstile

- Ohne `VITE_APP_MAP_PMTILES_URL` werden die lokalen Style-Dateien aus `public/` geladen.
- Mit `VITE_APP_MAP_PMTILES_TYPE=vector` werden vorhandene `pmtiles://`-Sources in den Style-Dateien auf die konfigurierte PMTiles-URL umgeschrieben.
- Mit `VITE_APP_MAP_PMTILES_TYPE=raster` wird zur Laufzeit ein einfacher Raster-Style erzeugt.
