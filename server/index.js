require("dotenv").config({ override: true });

const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();
const PORT = 3000;

const apiKey = process.env.OPENAI_API_KEY;

console.log("OpenAI key loaded:", Boolean(apiKey));
console.log("OpenAI key length:", apiKey ? apiKey.length : 0);

const client = new OpenAI({
  apiKey: apiKey
});

app.use(cors());
app.use(express.json({ limit: "15mb" }));

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    message: "Chris AI is awake. 👗🧠",
    hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY)
  });
});

app.post("/api/analyze-clothing", async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({
        error: "No clothing image was provided."
      });
    }

    console.log("Received clothing image.");

    const response = await client.responses.create({
      model: "gpt-5.6",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `
You are Chris, a funny but genuinely useful personal fashion stylist.

Analyze this clothing item.

Return ONLY valid JSON:

{
  "name": "short useful name",
  "category": "top | bottom | dress | outerwear | shoes | accessory",
  "color": "main color",
  "style": "best style description",
  "season": "best season or All year",
  "description": "one short description",
  "confidence": 0
}

Confidence must be a number from 0 to 100.

Do not invent a brand or exact material if you cannot clearly see it.
              `
            },
            {
              type: "input_image",
              image_url: image
            }
          ]
        }
      ]
    });

    console.log("OpenAI response received.");

    let clothing;

    try {
      clothing = JSON.parse(response.output_text);
    } catch (parseError) {
      console.error("JSON parsing failed:", response.output_text);

      return res.status(500).json({
        error: "Chris received an unexpected answer from the AI.",
        details: response.output_text
      });
    }

    res.json({
      success: true,
      clothing
    });

  } catch (error) {
    console.error("AI analysis failed.");
    console.error("Status:", error.status);
    console.error("Code:", error.code);
    console.error("Message:", error.message);

    res.status(500).json({
      error: "Chris couldn't analyze that piece.",
      details: `${error.status || 500} ${error.code || ""} ${error.message || ""}`
    });
  }
});

app.listen(PORT, () => {
  console.log(`Chris AI server running at http://localhost:${PORT}`);
});