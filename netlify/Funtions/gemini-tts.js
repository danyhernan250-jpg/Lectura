
const { GoogleGenAI } = require('@google/genai');

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed"
    };
  }

  try {
    const {
      text,
      voice = "Kore",
      language = "es-SV",
      style = ""
    } = JSON.parse(event.body || "{}");

    if (!text || typeof text !== "string" || !text.trim()) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Texto requerido" })
      };
    }

    if (text.length > 2000) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "El texto supera el límite permitido"
        })
      };
    }

    if (!process.env.GEMINI_API_KEY) {
      throw new Error("No está configurada GEMINI_API_KEY");
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });

    // Configuración del acento
    let accentInstruction = "";

    if (language === "es-SV") {
      accentInstruction = `
Utiliza español latinoamericano con pronunciación natural
de El Salvador. Evita exagerar el acento regional.
`;
    } else if (language === "es-MX") {
      accentInstruction = `
Utiliza español mexicano neutro, claro y natural.
`;
    } else {
      accentInstruction = `
Utiliza español latinoamericano neutro.
`;
    }

    const defaultStyle = `
Habla como una maestra de primaria que enseña a niños
a aprender a leer.

Utiliza una voz femenina, cálida, amable, cercana y paciente.

Mantén un ritmo conversacional medio, natural y fluido.
No hables demasiado rápido ni demasiado lento.

Pronuncia claramente las palabras y las sílabas,
sin separarlas artificialmente ni exagerar los sonidos.

Realiza pausas breves y naturales cuando sean necesarias.
`;

    const instruction = `
${defaultStyle}

${accentInstruction}

Indicaciones adicionales:
${style || "Pronuncia con claridad y naturalidad."}

Reglas importantes:
- Pronuncia exactamente el texto proporcionado.
- No agregues palabras ni explicaciones.
- No repitas el texto.
- No agregues saludos ni comentarios.
- No leas las instrucciones.
- Mantén una pronunciación clara y apropiada para niños.

Texto que debes pronunciar:
${text.trim()}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash-tts",
      contents: [
        {
          parts: [{ text: instruction }]
        }
      ],
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
