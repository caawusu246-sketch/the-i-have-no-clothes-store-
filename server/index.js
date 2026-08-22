require("dotenv").config({ override: true });

const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();
const PORT = 3000;

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.use(cors());

app.use(
  express.json({
    limit: "50mb"
  })
);


/* =========================================
   HEALTH
========================================= */

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    message: "Chris AI is awake. 👗🧠",
    hasOpenAIKey: Boolean(
      process.env.OPENAI_API_KEY
    )
  });
});


/* =========================================
   ANALYSE CLOTHING
========================================= */

app.post(
  "/api/analyze-clothing",
  async (req, res) => {

    try {

      const { image } = req.body;

      if (!image) {
        return res.status(400).json({
          error:
            "No clothing image was provided."
        });
      }


      const response =
        await client.responses.create({

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


      let clothing;

      try {

        clothing =
          JSON.parse(
            response.output_text
          );

      } catch (error) {

        return res.status(500).json({
          error:
            "Chris received an unexpected answer from the AI.",
          details:
            response.output_text
        });

      }


      res.json({
        success: true,
        clothing
      });


    } catch (error) {

      console.error(
        "AI analysis failed:",
        error
      );

      res.status(500).json({
        error:
          "Chris couldn't analyze that piece.",
        details:
          error.message
      });

    }

  }
);


/* =========================================
   VIRTUAL TRY-ON
========================================= */

app.post(
  "/api/try-on",
  async (req, res) => {

    try {

const {
  avatar,
  items,
  avatarSettings = {
    gender: "female",
    bodySize: 3
  }
} = req.body;


      if (!avatar) {

        return res.status(400).json({
          error:
            "No avatar image was provided."
        });

      }


      if (
        !Array.isArray(items) ||
        items.length === 0
      ) {

        return res.status(400).json({
          error:
            "No clothing items were selected."
        });

      }


      console.log(
        "Creating virtual try-on..."
      );

      console.log(
        "Selected items:",
        items.map(
          item => item.name
        )
      );


      /*
       Build image inputs.

       Invalid images are skipped instead
       of crashing the entire request.
      */

      const imageInputs = [];


      function addImage(image) {

        if (
          !image ||
          typeof image !== "string"
        ) {
          return;
        }


        /*
         Accept normal URLs
         or valid base64 data URLs.
        */

        const isNormalUrl =
          image.startsWith("http://") ||
          image.startsWith("https://");


        const isBase64Image =
          image.startsWith("data:image/") &&
          image.includes(";base64,");


        if (
          !isNormalUrl &&
          !isBase64Image
        ) {

          console.log(
            "Skipping invalid image:",
            image.substring(0, 80)
          );

          return;
        }


        imageInputs.push({
          type: "input_image",
          image_url: image
        });

      }


      /*
       FIRST IMAGE = AVATAR
      */

      addImage(avatar);


      /*
       Remaining images = clothes
      */

      items.forEach(
        item => addImage(item.image)
      );


      if (
        imageInputs.length === 0
      ) {

        return res.status(400).json({
          error:
            "No valid images were available for the try-on."
        });

      }


      const outfitDescription =
        items
          .map(
            item =>
              `${item.category}: ${item.name}`
          )
          .join(", ");


      /*
       IMPORTANT:

       This uses the actual image generation
       tool.

       The old version only asked GPT to
       DESCRIBE the image.
      */

      const response = await client.responses.create({
      model: "gpt-5.6",

          input: [
            {
              role: "user",

              content: [

                {
                  type: "input_text",

                  text: `
Create ONE finished virtual try-on image.

The first image is the avatar.

The following images are clothing references.

Selected outfit:

${outfitDescription}

Avatar settings:

Gender: ${avatarSettings.gender}

Body shape:
${
  {
    1: "very slim, narrow body shape",
    2: "slim body shape",
    3: "medium, average body shape",
    4: "curvy, fuller body shape",
    5: "plus-size, visibly fuller body shape"
  }[avatarSettings.bodySize] || "medium, average body shape"
}

Generate a polished full-body image of the same
character wearing the selected clothing.

Respect the selected gender and body size naturally.
Keep the person's face and identity recognisable.
Do not change the person's identity.

Rules:

- Keep the character's identity consistent.
- Keep the face, hairstyle and body recognisable.
- Actually dress the character in the clothes.
- Do NOT paste clothing images onto the avatar.
- Do NOT create clothing cards.
- Do NOT show floating rectangles.
- Make the clothing follow the body naturally.
- Preserve the colour and general design of each item.
- If a dress exists, it replaces the top and bottom.
- Outerwear should layer naturally.
- Shoes should appear on the feet.
- Accessories should appear naturally.
- Use a clean fashion-editorial background.
- Return the final generated image.
                  `
                },

                ...imageInputs

              ]
            }
          ],

          tools: [
            {
  type: "image_generation",
  action: "edit",
  size: "1024x1024",
  quality: "low",
  output_format: "jpeg",
  output_compression: 70
}
          ],

          tool_choice: {
            type: "image_generation"
          }

        });


      /*
       Find the generated image.
      */

      let generatedImage = null;


      for (
        const output of response.output
      ) {

        if (
          output.type ===
          "image_generation_call"
        ) {

          if (
            output.result
          ) {

            generatedImage =
              `data:image/png;base64,${output.result}`;

            break;

          }

        }

      }


      if (!generatedImage) {

        console.error(
          "No generated image found."
        );

        console.log(
          JSON.stringify(
            response.output,
            null,
            2
          )
        );

        return res.status(500).json({
          error:
            "The AI did not return an outfit image."
        });

      }


      console.log(
        "Virtual try-on complete."
      );


      return res.json({
        success: true,
        image: generatedImage
      });


    } catch (error) {

      console.error(
        "Virtual try-on failed."
      );

      console.error(
        "Status:",
        error.status
      );

      console.error(
        "Code:",
        error.code
      );

      console.error(
        "Message:",
        error.message
      );


      return res.status(500).json({

        error:
          "Chris couldn't create the outfit preview.",

        details:
          error.message

      });

    }

  }
);


/* =========================================
   START SERVER
========================================= */

app.listen(PORT, () => {

  console.log(
    `Chris AI server running at http://localhost:${PORT}`
  );

});