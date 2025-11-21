const fetch = global.fetch || require('node-fetch');

/**
 * Vercel serverless function: /api/generate-image
 * Uses OpenAI Images API (gpt-image-1) to create a single cinematic image.
 * Make sure to set OPENAI_API_KEY in your Vercel project settings.
 */
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Method not allowed. Use POST.' }));
  }

  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const bodyStr = Buffer.concat(chunks).toString('utf8') || '{}';
    const body = JSON.parse(bodyStr);
    const prompt = (body.prompt || '').toString().trim();

    if (!prompt) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'Missing prompt.' }));
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'OPENAI_API_KEY is not set.' }));
    }

    const openaiRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt,
        size: '1024x1024',
        n: 1
      })
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error('OpenAI error:', errText);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'OpenAI request failed', detail: errText }));
    }

    const data = await openaiRes.json();
    const url = data && data.data && data.data[0] && data.data[0].url;

    if (!url) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'No image URL returned from OpenAI.' }));
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ url }));
  } catch (err) {
    console.error('Function error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Server error', detail: err.message }));
  }
};
