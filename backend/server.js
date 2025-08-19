import express from "express";
import cors from "cors";
import dotenv from "dotenv";

const app = express();
dotenv.config();

app.use(cors());
app.use(express.json());

// 1. Weather API
app.get("/api/weather/:city", async (req, res) => {
  try {
    const city = req.params.city;
    const apiKey = process.env.OPENWEATHER_KEY;
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`
    );
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch weather" });
  }
});

// 2. Market Price API (MCPs) – Stub/demo
app.get("/api/mcps/:crop", (req, res) => {
  const crop = req.params.crop.toLowerCase();
  const mockPrices = {
    tomato: { mandi: "Pune", price: "₹1800/qtl" },
    wheat: { mandi: "Delhi", price: "₹2100/qtl" },
  };
  res.json(mockPrices[crop] || { error: "No data for this crop" });
});

// 3. SMOLLM2 AI (via Ollama local API)
app.post("/ask", async (req, res) => {
  const { prompt, city } = req.body;

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Transfer-Encoding", "chunked");

  try {
    let weatherContext = "";

    // 🔹 If city is provided, fetch weather
    if (city) {
      try {
        const apiKey = process.env.OPENWEATHER_KEY;
        const weatherRes = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`
        );
        const weatherData = await weatherRes.json();

        if (weatherData.main) {
          weatherContext = `Weather in ${city}: ${weatherData.weather[0].description}, temp ${weatherData.main.temp}°C, feels like ${weatherData.main.feels_like}°C, humidity ${weatherData.main.humidity}%.`;
        }
      } catch (err) {
        console.error("Weather fetch error:", err);
      }
    }

    // 🔹 Inject weather info into final prompt
    const finalPrompt = weatherContext
      ? `${prompt}\n\nContext: ${weatherContext}`
      : prompt;

    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "smollm2:latest",
        prompt: finalPrompt,
        stream: true,
      }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter(Boolean);

      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          if (json.response) {
            res.write(json.response);
          }
        } catch (err) {
          console.error("JSON parse error:", err);
        }
      }
    }

    res.end();
  } catch (err) {
    console.error("Backend error:", err);
    res.status(500).send("Error calling Ollama");
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));