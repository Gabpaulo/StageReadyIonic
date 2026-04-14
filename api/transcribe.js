// Proxy: forwards audio to Groq Whisper — API key stays server-side only
export const config = {
  api: {
    bodyParser: false,   // must be false for binary/multipart audio
    responseLimit: false,
  },
  maxDuration: 60,       // Whisper can take up to ~30s for longer recordings
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY environment variable is not set' });
  }

  try {
    // Read the raw multipart body stream
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const rawBody = Buffer.concat(chunks);

    // Forward to Groq with the same Content-Type (preserves multipart boundary)
    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': req.headers['content-type'],
      },
      body: rawBody,
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
