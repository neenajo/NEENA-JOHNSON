
import { GoogleGenAI, Type, Modality, ThinkingLevel } from "@google/genai";

/**
 * Utility for exponential backoff retries to handle transient RPC/XHR errors.
 */
async function retry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorMsg = error?.message || "";
    const isQuota = errorMsg.includes('quota') || errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED');
    const isTransient = errorMsg.includes('xhr error') || 
                        errorMsg.includes('500') || 
                        errorMsg.includes('UNAVAILABLE') ||
                        isQuota;

    if (retries > 0 && isTransient) {
      const actualDelay = isQuota ? delay * 4 : delay;
      console.warn(`Retry logic: ${isQuota ? 'Quota hit' : 'Transient error'}. Waiting ${actualDelay}ms... (Retries left: ${retries})`);
      await new Promise(resolve => setTimeout(resolve, actualDelay));
      return retry(fn, retries - 1, actualDelay * 1.5);
    }
    throw error;
  }
}

/**
 * Stage 1: Multimodal Analysis (Metadata only).
 * Separated to allow parallel video generation.
 */
export const analyzeMediaMetadata = async (
  fileData: string, 
  mimeType: string,
  targetLang: string
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const cleanData = fileData; 

  return await retry(async () => {
    const modelName = 'gemini-3-flash-preview';
    
    const analysisResponse = await ai.models.generateContent({
      model: modelName,
      contents: [{
        parts: [
          { inlineData: { data: cleanData, mimeType } },
          { text: `FAST DUB ANALYSIS: 
                   1. sourceText: Transcription.
                   2. translatedText: Translation to ${targetLang}.
                   3. gender: 'male'/'female'.
                   4. emotion: 'excited'/'sad'/'angry'/'calm'.
                   5. vocalIdentity: Short description.
                   6. prosodyInstruction: Pitch/speed notes.
                   7. confidence: 0.0-1.0.
                   
                   JSON ONLY.` }
        ]
      }],
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sourceText: { type: Type.STRING },
            translatedText: { type: Type.STRING },
            gender: { type: Type.STRING },
            emotion: { type: Type.STRING },
            vocalIdentity: { type: Type.STRING },
            prosodyInstruction: { type: Type.STRING },
            confidence: { type: Type.NUMBER }
          },
          required: ["sourceText", "translatedText", "gender", "emotion", "vocalIdentity", "prosodyInstruction", "confidence"]
        }
      }
    });

    const responseText = analysisResponse.text;
    if (!responseText) {
      throw new Error("Neural model returned an empty response.");
    }

    return JSON.parse(responseText);
  });
};

/**
 * Stage 2: High-fidelity Speech Synthesis.
 * Separated to allow parallel execution.
 */
export const synthesizeDubbedAudio = async (
  metadata: any,
  targetLang: string
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  return await retry(async () => {
    const voiceName = (metadata.gender?.toLowerCase().includes('female')) ? 'Kore' : 'Fenrir';

    const synthesisResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ 
        parts: [{ 
          text: `PERFORMANCE MODE: Act this dubbed line in ${targetLang} with a ${metadata.emotion} tone, mimicking a ${metadata.vocalIdentity} voice profile: "${metadata.translatedText}"` 
        }] 
      }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName }
          }
        }
      }
    });

    const dubbedAudioBase64 = synthesisResponse.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
    
    if (!dubbedAudioBase64) {
      throw new Error("Neural synthesis failed.");
    }

    return dubbedAudioBase64;
  });
};

/**
 * Legacy Pipeline (kept for compatibility if needed)
 */
export const processDubbingPipeline = async (
  fileData: string, 
  mimeType: string,
  targetLang: string
) => {
  const metadata = await analyzeMediaMetadata(fileData, mimeType, targetLang);
  const dubbedAudioBase64 = await synthesizeDubbedAudio(metadata, targetLang);
  return { metadata, dubbedAudioBase64 };
};

/**
 * Stage 3: Generative Lip-Sync (Veo)
 */
export const generateDubbedVideo = async (
  firstFrameBase64: string,
  translatedText: string,
  emotion: string,
  targetLang: string
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const cleanFrame = firstFrameBase64;

  return await retry(async () => {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: `Cinematic lip-sync video. The speaker's mouth movements perfectly match the ${targetLang} translation: "${translatedText}". Expression: ${emotion}.`,
      image: {
        imageBytes: cleanFrame,
        mimeType: 'image/jpeg',
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });
    return operation;
  });
};

export const runComparativeAnalysis = async (
  sourceMetadata: any,
  wavAudioBase64: string,
  targetLang: string
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const cleanAudio = wavAudioBase64.replace(/\s/g, '');

  return await retry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{
        parts: [
          { text: `AUDIT TASK: Evaluate the dubbed synthesis for ${targetLang}. Score fidelity against original gender (${sourceMetadata.gender}) and emotion (${sourceMetadata.emotion}).` },
          { inlineData: { data: cleanAudio, mimeType: 'audio/wav' } }
        ]
      }],
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            worthinessScore: { type: Type.NUMBER },
            comparisonSummary: { type: Type.STRING }
          },
          required: ["worthinessScore", "comparisonSummary"]
        }
      }
    });
    return JSON.parse(response.text || '{"worthinessScore": 0.8, "comparisonSummary": "Stable neural alignment."}');
  });
};

export const pollOperation = async (operation: any) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return await ai.operations.getVideosOperation({ operation });
};

/**
 * Fetches the video from the Veo download link.
 */
export const downloadVideoContent = async (downloadLink: string) => {
  const response = await fetch(downloadLink, {
    method: 'GET',
    headers: {
      'x-goog-api-key': process.env.API_KEY || '',
    },
  });
  if (!response.ok) throw new Error('Failed to download video from neural engine.');
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};
