const { GoogleGenAI } = require('@google/genai');

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed"
    };
  }

  try {
    const { text, voice = "Kore" } = JSON.parse(event.body || "{}");

    if (!text || typeof text !== "string") {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Texto requerido" })
      };
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });

    const instruction = `
Habla en español latinoamericano, con pronunciación natural
y clara, adecuada para niños que están aprendiendo a leer.

Usa una voz femenina, cálida, cercana y amable, como una
maestra de primaria.

Pronuncia el texto exactamente como está escrito.
No agregues palabras, explicaciones ni sonidos.
Mantén un ritmo pausado y natural, sin separar artificialmente
las sílabas ni exagerar la entonación.

Texto que debes pronunciar:
${text}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash-tts",
      contents: [{ parts: [{ text: instruction }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voice
            }
          }
        }
      }
    });

    const parts =
      response.candidates?.[0]?.content?.parts || [];

    const audioPart = parts.find(
      part => part.inlineData?.data
    );

    if (!audioPart) {
      throw new Error("Gemini no devolvió audio");
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      },
      body: JSON.stringify({
        audio: audioPart.inlineData.data
      })
    };

  } catch (error) {
    console.error("Error en Gemini TTS:", error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        error: "No se pudo generar el audio"
      })
    };
  }
};
