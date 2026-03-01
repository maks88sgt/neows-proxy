import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const NASA_BASE_URL = "https://api.nasa.gov/neo/rest/v1";
const NASA_API_KEY = "LAitysI7iGzQxu3Z3JrUPFUaWedJNQdHKIokacX0";

// простейший in-memory cache
const cache = new Map();

// helper для сегодняшней даты
const getToday = () => {
  return new Date().toISOString().split("T")[0];
};

// универсальная функция запроса с кешированием
async function fetchWithCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = 60 * 60 * 1000,
): Promise<T> {
  const cached = cache.get(key) as { data: T; timestamp: number } | undefined;

  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }

  const data = await fetchFn();

  cache.set(key, {
    data,
    timestamp: Date.now(),
  });

  return data;
}

/* ---------------- HOME ---------------- */

app.get("/", (req, res) => {
  res.type("html").send(`<h1>NASA NeoWs Proxy 🚀</h1>
    <p>Go to <a href="/api/docs">/api/docs</a> for OpenAPI documentation</p>`);
});

/* ---------------- ASTEROIDS LIST ---------------- */

app.get("/api/asteroids", async (req, res) => {
  try {
    let { startDay, endDay } = req.query;

    if (!startDay) {
      startDay = getToday();
    }

    if (!endDay) {
      endDay = startDay;
    }

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

    // Vercel Edge cache
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=86400",
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

    return res.status(500).json({ error: "Unknown error" });
  }
});

/* ---------------- ASTEROID DETAILS ---------------- */

app.get("/api/asteroids/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `asteroid-${id}`;

    const data = await fetchWithCache(cacheKey, async () => {
      const response = await axios.get(`${NASA_BASE_URL}/neo/${id}`, {
        params: {
          api_key: NASA_API_KEY,
        },
      });
      return response.data;
    });

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=86400, stale-while-revalidate=604800",
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

    return res.status(500).json({ error: "Unknown error" });
  }
});

/* ---------------- OPENAPI DOCS ---------------- */

app.get("/api/docs", (req, res) => {
  res.json({
    openapi: "3.0.0",
    info: {
      title: "NASA NeoWs Proxy API",
      version: "1.0.0",
      description: "Proxy server for NASA Near Earth Object Web Service",
    },
    servers: [{ url: "https://your-vercel-domain.vercel.app" }],
    paths: {
      "/api/asteroids": {
        get: {
          summary: "Get list of asteroids",
          parameters: [
            {
              name: "startDay",
              in: "query",
              required: false,
              schema: { type: "string", format: "date" },
            },
            {
              name: "endDay",
              in: "query",
              required: false,
              schema: { type: "string", format: "date" },
            },
          ],
          responses: {
            "200": {
              description: "List of asteroids",
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
  });
});

/* ---------------- HEALTH ---------------- */

app.get("/healthz", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

export default app;
