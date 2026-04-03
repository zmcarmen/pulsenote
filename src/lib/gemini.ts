import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenAI({ apiKey: apiKey || "" });

export interface AISubtask {
  text: string;
  remindAt?: string; // ISO 8601
}

export interface AIProcessedContent {
  type: 'todo' | 'idea';
  category: 'Work' | 'Travel' | 'Shopping' | 'Finance' | 'Reading' | 'Learning' | 'Medical' | 'Life' | 'Social' | 'Other';
  summary: string;
  tags: string[];
  subtasks?: AISubtask[];
  aiResponse?: string; // AI's resonance/insight for ideas
  reminder?: {
    taskName: string;
    remindAt?: string;
    context: string;
    isTimeMissing: boolean;
  };
}

export async function processNoteContent(content: string): Promise<AIProcessedContent[]> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in environment variables.");
  }

  const model = "gemini-3-flash-preview";
  const currentTime = new Date().toLocaleString();

  const prompt = `
    You are the "Super Butler" for PulseNote. 
    Analyze the following user input and structure it.
    Current Time: ${currentTime}
    
    User Input: "${content}"
    
    Rules:
    1. Multi-Task Splitting: If the user input contains multiple distinct tasks, ideas, or thoughts, split them into separate items in the returned array.
    2. Categorization (type): 
       - 'todo': Actionable tasks, appointments, or things to buy/do.
       - 'idea': Reflections, reviews, feelings, philosophical thoughts, or "today's thinking". 
       - If the user says "review", "thoughts", "feelings", or is sharing a realization, it MUST be an 'idea'.
    3. Classification (category): Assign to one of these: 'Work', 'Travel', 'Shopping', 'Finance', 'Reading', 'Learning', 'Medical', 'Life', 'Social', 'Other'.
    4. AI Resonance (aiResponse): 
       - ONLY for 'idea' type.
       - Provide a short, profound response to the user's thought.
       - Occasionally quote wisdom (e.g., Naval Ravikant, Marcus Aurelius) to create resonance.
       - Format: "Author: Quote content" (e.g., "Marcus Aurelius: The happiness of your life depends upon the quality of your thoughts.").
       - DO NOT use phrases like "xxx once said" or "xxx said".
       - DO NOT elaborate or add your own commentary; just provide the quote or a very direct reflection.
       - Language: Chinese.
    5. Task Decomposition (subtasks): 
       - For 'todo', break into 2-4 sub-steps.
       - For 'idea', break into 2-3 structured points or "key takeaways".
    6. Time Enforcement: 
       - For 'todo', extract 'remindAt' if time is mentioned.
    7. Summary: Concise Chinese summary.
    8. Tags: 2-4 relevant tags.
  `;

  const response = await genAI.models.generateContent({
    model: model,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, enum: ['todo', 'idea'] },
            category: { type: Type.STRING, enum: ['Work', 'Travel', 'Shopping', 'Finance', 'Reading', 'Learning', 'Medical', 'Life', 'Social', 'Other'] },
            summary: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            aiResponse: { type: Type.STRING },
            subtasks: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  remindAt: { type: Type.STRING }
                },
                required: ['text']
              } 
            },
            reminder: {
              type: Type.OBJECT,
              properties: {
                taskName: { type: Type.STRING },
                remindAt: { type: Type.STRING },
                context: { type: Type.STRING },
                isTimeMissing: { type: Type.BOOLEAN }
              },
              required: ['taskName', 'isTimeMissing']
            }
          },
          required: ['type', 'category', 'summary', 'tags']
        }
      }
    }
  });

  try {
    const result = JSON.parse(response.text || "[]");
    return result as AIProcessedContent[];
  } catch (e) {
    console.error("Failed to parse AI response", e);
    throw new Error("AI processing failed");
  }
}

export async function parseTimeOnly(timeInput: string): Promise<string> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const model = "gemini-3-flash-preview";
  const currentTime = new Date().toLocaleString();

  const prompt = `
    Current Time: ${currentTime}
    User Input: "${timeInput}"
    
    Extract the intended date and time from the user input.
    Return ONLY the ISO 8601 timestamp (e.g., 2024-04-03T15:00:00).
    If no date is specified, assume today or the most logical upcoming date.
    If no time is specified, default to 09:00:00.
  `;

  const response = await genAI.models.generateContent({
    model: model,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "text/plain",
    }
  });

  return response.text?.trim() || "";
}
