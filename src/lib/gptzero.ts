const GPTZERO_API = 'https://api.gptzero.me/v2/predict/text';

export interface GPTZeroResult {
  score: number;
  label: 'HUMAN' | 'AI' | 'MIXED';
  confidence: number;
  sentences: { sentence: string; score: number }[];
}

export const gptzero = {
  check: async (text: string): Promise<GPTZeroResult> => {
    const key = process.env.EXPO_PUBLIC_GPTZERO_API_KEY;
    if (!key) {
      // Return mock result if no key
      return { score: 0.1, label: 'HUMAN', confidence: 0.9, sentences: [] };
    }
    const res = await fetch(GPTZERO_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key },
      body: JSON.stringify({ document: text }),
    });
    if (!res.ok) throw new Error('GPTZero check failed');
    const d = await res.json();
    return {
      score: d.documents?.[0]?.average_generated_prob || 0,
      label: d.documents?.[0]?.completely_generated_prob > 0.7 ? 'AI' : d.documents?.[0]?.average_generated_prob > 0.3 ? 'MIXED' : 'HUMAN',
      confidence: 1 - (d.documents?.[0]?.average_generated_prob || 0),
      sentences: d.documents?.[0]?.sentences || [],
    };
  },
};
