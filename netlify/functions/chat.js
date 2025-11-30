// netlify/functions/chat.js
// This file handles all API requests to Claude

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse the incoming message
    const { message } = JSON.parse(event.body);
    
    if (!message) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Message is required' })
      };
    }

    // Get API key from environment variable (set in Netlify dashboard)
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not configured');
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'API key not configured. Please add ANTHROPIC_API_KEY to Netlify environment variables.' })
      };
    }

    // Create system prompt for Air New Zealand chatbot
    const systemPrompt = `You are Aria, a helpful and friendly AI assistant for Air New Zealand. You help customers with:
- Flight bookings and searches
- Flight status updates
- Check-in assistance
- Baggage information
- Travel policies
- General inquiries

Be professional, warm, and concise. Always prioritize customer service.`;

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          { 
            role: 'user', 
            content: message 
          }
        ]
      })
    });

    // Check if API call was successful
    if (!response.ok) {
      const error = await response.json();
      console.error('Claude API error:', error);
      
      return {
        statusCode: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: error.error?.message || 'Failed to get response from Claude' 
        })
      };
    }

    // Parse Claude's response
    const data = await response.json();
    const botResponse = data.content[0].text;

    // Return successful response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({
        response: botResponse,
        usage: data.usage // Optional: track token usage
      })
    };

  } catch (error) {
    console.error('Function error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Internal server error. Please try again.',
        details: error.message 
      })
    };
  }
};
