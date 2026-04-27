export default async function handler(req, res) {
  // CORS para que funcione desde cualquier origen
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Falta el campo message' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key no configurada' });
  }

  const systemPrompt = `Sos un asistente experto en MagicQ, la consola de iluminación de ChamSys.
Respondés en español argentino, de forma concisa y práctica (máximo 4 oraciones).
El usuario está usando un simulador interactivo de MagicQ para aprender a operar shows de iluminación en vivo.

Ayudás con:
- Selección de fixtures (grupos, paletas)
- Colores, posiciones, beam (zoom, iris, foco, gobo)
- Grabación de cues y cue stacks (REC, faders, playbacks)
- El Programmer y la función CLR
- FX Generator (barridos, pulsos, efectos automáticos)
- Operación en vivo: faders, GO, BLIND mode
- Problemas comunes: fixtures que no responden, cues que no reproducen, DMX

Si te preguntan algo que no es de MagicQ o iluminación, redirigí amablemente.
No uses listas largas — respondé directo, conversacional.`;

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: message }] }],
          generationConfig: { maxOutputTokens: 200, temperature: 0.7 }
        })
      }
    );

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      const errMsg = data?.error?.message || 'Error en Gemini API';
      console.error('Gemini error:', errMsg);
      return res.status(502).json({ error: errMsg });
    }

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!reply) {
      return res.status(502).json({ error: 'Respuesta vacía de Gemini' });
    }

    return res.status(200).json({ reply });
  } catch (err) {
    console.error('Chat handler error:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
