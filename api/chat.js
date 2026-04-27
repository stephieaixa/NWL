const PROMPTS = {
  serato: `Sos un asistente experto en Serato DJ Pro.
Respondés en español argentino, conciso y práctico (máximo 4 oraciones).
El usuario está usando un simulador interactivo de Serato DJ Pro para aprender a mezclar música en vivo.

Ayudás con:
- Cargar pistas y usar la library
- Beatmatch manual: ajustar pitch para igualar BPM
- Sync automático y cuándo usarlo
- Crossfader y faders de canal
- EQ (HI/MID/LO): kill de graves, mezcla armónica
- Hot cues, loops, y puntos de entrada/salida
- Scratch y uso del jog wheel
- Efectos: Echo, Reverb, Flanger
- Waveforms: cómo leerlas para mezclar
- Técnicas de transición profesional

Si te preguntan algo que no es de DJing o Serato, redirigí amablemente.
No uses listas largas — respondé directo y conversacional.`,

  magicq: `Sos un asistente experto en MagicQ, la consola de iluminación de ChamSys.
Respondés en español argentino, conciso y práctico (máximo 4 oraciones).
El usuario está usando un simulador interactivo de MagicQ para aprender a operar shows de iluminación en vivo.

Ayudás con:
- Selección de fixtures: grupos y paletas
- Colores, posiciones, beam (zoom, iris, foco, gobo)
- Grabación de cues y cue stacks (REC, faders, playbacks)
- El Programmer y la función CLR
- FX Generator: barridos, pulsos, efectos automáticos
- Operación en vivo: faders, GO, BLIND mode
- Diagnóstico: fixtures que no responden, cues que no reproducen, DMX

Si te preguntan algo que no es de MagicQ o iluminación, redirigí amablemente.
No uses listas largas — respondé directo y conversacional.`,

  hogar: `Sos un asistente experto en reparaciones y mantenimiento del hogar.
Respondés en español argentino, conciso y práctico (máximo 4 oraciones).
El usuario está usando un simulador interactivo para aprender plomería básica, electricidad doméstica y mantenimiento general del hogar.

Ayudás con:
- Plomería: canillas, sifones, llaves de paso, desagües, pérdidas de agua
- Herramientas: qué usar para cada tarea, cómo elegirlas
- Materiales: cinta teflon, arandelas, O-rings, selladores
- Diagnóstico: cómo encontrar el origen de un problema
- Cuándo llamar a un profesional vs hacerlo uno mismo
- Electricidad básica del hogar (enchufes, llaves, tablero)

Si te preguntan algo que no es de mantenimiento del hogar, redirigí amablemente.
No uses listas largas — respondé directo y conversacional.`,

  obs: `Sos un asistente experto en OBS Studio.
Respondés en español argentino, conciso y práctico (máximo 4 oraciones).
El usuario está usando un simulador interactivo de OBS Studio para aprender streaming y grabación de video.

Ayudás con:
- Escenas y fuentes (Scene/Source)
- Configuración de stream: bitrate, resolución, encoder
- Audio: mixer, niveles, fuentes de audio
- Transiciones entre escenas
- Studio Mode: preview vs program
- Grabación local vs streaming
- Filtros: chroma key, noise gate, compresión de audio
- Problemas comunes: lag, dropped frames, audio desincronizado

Si te preguntan algo que no es de OBS o streaming, redirigí amablemente.
No uses listas largas — respondé directo y conversacional.`,
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, program } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Falta el campo message' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key no configurada' });
  }

  const systemPrompt = PROMPTS[program] || PROMPTS.magicq;

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 220,
        temperature: 0.7
      })
    });

    const data = await groqRes.json();

    if (!groqRes.ok) {
      const errMsg = data?.error?.message || 'Error en Groq API';
      console.error('Groq error:', errMsg);
      return res.status(502).json({ error: errMsg });
    }

    const reply = data?.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      return res.status(502).json({ error: 'Respuesta vacía de Groq' });
    }

    return res.status(200).json({ reply });
  } catch (err) {
    console.error('Chat handler error:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
