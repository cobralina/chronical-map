import { defineConfig, loadEnv } from "vite";
import { svelte, vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { resolve } from "path";
import { promises as fs, readFileSync } from "fs";

const livingdocsHtmlPlugin = ({ baseUrl }) => {
  const livingdocsPath = resolve(__dirname, "livingdocs.html");
  const iframePath = resolve(__dirname, "public/iframe.html");
  const normalized = (baseUrl || "/").replace(/\/+$/, "");
  const buildAsset = async function buildAsset(templatePath, fileName) {
    try {
      const template = await fs.readFile(templatePath, "utf-8");
      const content = template.replace(/%VITE_APP_BASE_URL%/g, normalized);
      this.emitFile({
        type: "asset",
        fileName,
        source: content,
      });
    } catch (error) {
      this.warn(`${fileName} konnte nicht erstellt werden: ${error.message}`);
    }
  };

  return {
    name: "livingdocs-html",
    apply: "build",
    async generateBundle() {
      await buildAsset.call(this, livingdocsPath, "livingdocs.html");
      await buildAsset.call(this, iframePath, "iframe.html");
    },
  };
};

const getPackageVersion = () => {
  try {
    const packageJsonPath = resolve(__dirname, "package.json");
    const contents = readFileSync(packageJsonPath, "utf-8");
    const parsed = JSON.parse(contents);
    return typeof parsed.version === "string" && parsed.version.length > 0 ? parsed.version : "0.0.0";
  } catch (error) {
    return "0.0.0";
  }
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_APP_");
  const baseUrl = env.VITE_APP_BASE_URL || "/";
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const distributionFolder = env.VITE_APP_DISTRIBUTION_FOLDER || "dist";
  const shouldGenerateSourceMap = env.VITE_APP_PRODUCTION_SOURCE_MAP === "true";
  const packageVersion = getPackageVersion();

  return {
    server: {
      port: 3000,
    },
    plugins: [
      svelte({
        preprocess: vitePreprocess({
          scss: {
            prependData: `@use "@faz/dv-globals/scss/dv-globals.scss" as *;`,
          },
        }),
      }),
      livingdocsHtmlPlugin({ baseUrl: normalizedBaseUrl }),
    ],
    base: normalizedBaseUrl,
    envPrefix: "VITE_APP_",
    build: {
      outDir: distributionFolder,
      sourcemap: shouldGenerateSourceMap,
      cssCodeSplit: false,
      assetsDir: "assets",
      rollupOptions: {
        input: {
          main: resolve(__dirname, "index.html"),
        },
        output: {
          entryFileNames: "assets/app.js",
          chunkFileNames: "assets/app.js",
          assetFileNames: (assetInfo) => {
            return assetInfo.name && assetInfo.name.endsWith(".css") ? "assets/style.css" : "assets/[name][extname]";
          },
        },
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use "@faz/dv-globals/scss/dv-globals.scss" as *;`,
        },
      },
    },
    define: {
      "process.env": env,
      __APP_VERSION__: JSON.stringify(packageVersion),
    },
  };
});
