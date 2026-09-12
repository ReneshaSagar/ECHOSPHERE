import OpenAI from 'openai';

/**
 * Central AI Client provider for OmniPanel Evaluator and Blueprint Orchestration.
 * Automatically resolves the active API key, endpoint, and verified live model.
 */
export function getAiClient(): { client: OpenAI; model: string } {
  // Check for direct Gemini API Key (AI Studio - AIza...)
  const directGeminiKey = process.env.GEMINI_DIRECT_API_KEY || (process.env.GEMINI_API_KEY?.startsWith('AIza') ? process.env.GEMINI_API_KEY : undefined);
  
  // Check for Requesty Router Key (or OPENAI_API_KEY containing rqsty key)
  const requestyKey = process.env.REQUESTY_API_KEY || (process.env.OPENAI_API_KEY?.startsWith('rqsty') ? process.env.OPENAI_API_KEY : undefined) || process.env.OPENAI_API_KEY;

  if (directGeminiKey) {
    return {
      client: new OpenAI({
        apiKey: directGeminiKey,
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/'
      }),
      model: 'gemini-2.5-flash'
    };
  }

  return {
    client: new OpenAI({
      apiKey: requestyKey || '',
      baseURL: 'https://router.requesty.ai/v1'
    }),
    model: 'openai/gpt-4o-mini'
  };
}
