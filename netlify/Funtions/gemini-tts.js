const { GoogleGenAI } = require('@google/genai');

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  try {
    const { text, voice = 'Kore' } = JSON.parse(event.body);

    // Inicializar el cliente de Gemini con la API Key desde las variables de entorno
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice }
          }
        }
      }
    });

    // Extraer el audio en base64 de la respuesta
    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (!audioData) {
      throw new Error("No se recibió audio de Gemini");
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audio: audioData }),
    };
  } catch (error) {
    console.error("Error en Gemini TTS:", error);
    return { statusCode: 500, body: JSON.stringify({ error: "Error al generar audio" }) };
  }
};