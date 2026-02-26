import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import axios from "axios"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

const NASA_BASE_URL = 'https://api.nasa.gov/neo/rest/v1';

// Home route - HTML
app.get('/', (req, res) => {
  res.type('html').send(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <title>Express on Vercel</title>
        <link rel="stylesheet" href="/style.css" />
      </head>
      <body>
        <nav>
          <a href="/">Home</a>
          <a href="/about">About</a>
          <a href="/api-data">API Data</a>
          <a href="/healthz">Health</a>
        </nav>
        <h1>Welcome to Express on Vercel 🚀</h1>
        <p>This is a minimal example without a database or forms.</p>
        <img src="/logo.png" alt="Logo" width="120" />
      </body>
    </html>
  `)
})

app.get('/about', function (req, res) {
  res.sendFile(path.join(__dirname, '..', 'components', 'about.htm'))
})

// Example API endpoint - JSON
app.get('/api-data', (req, res) => {
  res.json({
    message: 'Here is some sample API data',
    items: ['apple', 'banana', 'cherry'],
  })
})

// Health check
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString(), MESSAGE: "IT WORKS" })
})

app.get('/api/neo-feed', async (req, res) => {
    try {
        const { start_date, end_date } = req.query;

        const response = await axios.get(`${NASA_BASE_URL}/feed`, {
            params: {
                start_date,
                end_date,
                api_key: 'LAitysI7iGzQxu3Z3JrUPFUaWedJNQdHKIokacX0'
            }
        });

        res.json(response.data);

    } catch (error) {
        if ((error as any).response) {
            return res.status((error as any)?.response?.status).json((error as any)?.response?.data);
        }

        res.status(500).json({ error: 'Internal server error' });
    }
});

export default app
