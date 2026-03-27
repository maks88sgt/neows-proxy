import express from "express";
import axios from "axios";
import swaggerUi from "swagger-ui-express";
import { OpenAPIV3 } from "openapi-types";
import cors from "cors"; 

const app = express();

app.use(
  cors())

const NASA_BASE_URL = "https://api.nasa.gov/neo/rest/v1";
const NASA_API_KEY = process.env.NASA_API_KEY || "DEMO_KEY";

const cache = new Map<string, { data: unknown; timestamp: number }>();

const getToday = () => new Date().toISOString().split("T")[0];

async function fetchWithCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = 60 * 60 * 1000
): Promise<T> {
  const cached = cache.get(key) as { data: T; timestamp: number } | undefined;

  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }

  const data = await fetchFn();

  cache.set(key, { data, timestamp: Date.now() });

  return data;
}

/* ---------------- ASTEROIDS LIST ---------------- */

app.get("/api/asteroids", async (req, res) => {
  try {
    let { startDay, endDay } = req.query as {
      startDay?: string;
      endDay?: string;
    };

    if (!startDay) startDay = getToday();
    if (!endDay) endDay = startDay;

    const cacheKey = `feed-${startDay}-${endDay}`;

    const data = await fetchWithCache(cacheKey, async () => {
      const response = await axios.get(`${NASA_BASE_URL}/feed`, {
        params: {
          start_date: startDay,
          end_date: endDay,
          api_key: NASA_API_KEY,
        },
      });
      return response.data;
    });

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=86400"
    );

    res.json(data);
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      return res
        .status(error.response?.status || 500)
        .json(error.response?.data || { error: "NASA API error" });
    }

    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(500).json({ error: "Unknown error" });
  }
});

/* ---------------- ASTEROID DETAILS ---------------- */

app.get("/api/asteroids/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const data = await fetchWithCache(`asteroid-${id}`, async () => {
      const response = await axios.get(`${NASA_BASE_URL}/neo/${id}`, {
        params: { api_key: NASA_API_KEY },
      });
      return response.data;
    });

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=86400, stale-while-revalidate=604800"
    );

    res.json(data);
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      return res
        .status(error.response?.status || 500)
        .json(error.response?.data || { error: "NASA API error" });
    }

    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(500).json({ error: "Unknown error" });
  }
});

/* ---------------- SWAGGER ---------------- */

const swaggerDocument: OpenAPIV3.Document = {
  openapi: "3.0.0",
  info: {
    title: "NASA NeoWs Proxy API",
    version: "1.0.0",
    description: "Proxy server with caching for NASA Near Earth Objects API",
  },
  servers: [
    {
      url: process.env.VERCEL_URL
        ? `https://neows-proxy.vercel.app`
        : "http://localhost:3000",
    },
  ],
  paths: {
    "/api/asteroids": {
      get: {
        summary: "Get list of asteroids",
        parameters: [
          {
            name: "startDay",
            in: "query",
            schema: { type: "string", format: "date" },
          },
          {
            name: "endDay",
            in: "query",
            schema: { type: "string", format: "date" },
          },
        ],
        responses: {
          "200": {
            description: "Asteroid feed",
          },
        },
      },
    },
    "/api/asteroids/{id}": {
      get: {
        summary: "Get asteroid details",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Asteroid details",
          },
        },
      },
    },
  },
};

app.get("/api/docs.json", (_, res) => {
  res.json(swaggerDocument);
});

app.get("/api/docs", (_, res) => {
  res.type("html").send(`
<!DOCTYPE html>
<html>
<head>
  <title>NASA NeoWs Proxy API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>

  <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = () => {
      SwaggerUIBundle({
        url: "/api/docs.json",
        dom_id: "#swagger-ui",
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>
  `);
});

/* ---------------- HEALTH ---------------- */

app.get("/api/healthz", (_, res) => {
  res.json({ status: "ok" });
});

export default app;