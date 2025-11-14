import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { GenerationParams, AllContentResponse, CreationType } from "../types";

const model = 'gemini-2.5-flash';
const MAX_RETRIES = 3; // Total attempts will be MAX_RETRIES + 1

/**
 * Creates a GoogleGenAI instance with the provided API key.
 * Throws an error if the API key is missing.
 * @param apiKey The user-provided Gemini API key.
 * @returns An instance of GoogleGenAI.
 */
const getAi = (apiKey: string): GoogleGenAI => {
    if (!apiKey) {
        // This error is a safeguard, but the UI should prevent calls without a saved API key.
        throw new Error("A chave de API do Gemini é necessária.");
    }
    return new GoogleGenAI({ apiKey });
};

/**
 * Helper to safely extract text from a Gemini response.
 * @param response The GenerateContentResponse from the API.
 * @returns The response text.
 */
const getText = (response: GenerateContentResponse): string => {
    return response.text;
};

/**
 * Helper to safely parse JSON from a Gemini response text.
 * @param response The GenerateContentResponse from the API.
 * @returns The parsed JSON object.
 */
const getJson = <T>(response: GenerateContentResponse): T => {
    try {
        const text = getText(response).replace(/```json|```/g, '').trim();
        return JSON.parse(text) as T;
    } catch (e) {
        console.error("Failed to parse JSON from Gemini response:", getText(response), e);
        throw new Error("A resposta da IA não estava no formato JSON esperado.");
    }
};

/**
 * Wraps a Gemini API call with a retry mechanism for overloaded errors.
 * @param apiCall The function that makes the actual API call.
 * @param onStatusUpdate A callback to update the UI with the current status.
 * @returns A Promise that resolves with the API response.
 */
const generateWithRetry = async (
    apiCall: () => Promise<GenerateContentResponse>,
    onStatusUpdate?: (status: string) => void
): Promise<GenerateContentResponse> => {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            return await apiCall();
        } catch (error: any) {
            const isOverloaded = 
                (error.message?.includes('503') || 
                 error.message?.toLowerCase().includes('overloaded') || 
                 (error.cause as any)?.status === 'UNAVAILABLE');

            if (isOverloaded && attempt < MAX_RETRIES) {
                const delay = Math.pow(2, attempt + 1) * 1000; // Exponential backoff: 2s, 4s, 8s
                const statusMessage = `O modelo está sobrecarregado. Tentando novamente em ${delay / 1000}s... (${attempt + 1}/${MAX_RETRIES})`;
                console.warn(statusMessage, error);
                if (onStatusUpdate) {
                    onStatusUpdate(statusMessage);
                }
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.error(`API call failed after ${attempt + 1} attempts.`, error);
                const finalMessage = isOverloaded 
                    ? "O modelo parece estar sobrecarregado. Por favor, tente novamente mais tarde." 
                    : error.message || "Ocorreu um erro desconhecido na API.";
                throw new Error(finalMessage);
            }
        }
    }
    // This should be unreachable, but TypeScript requires a return path or throw.
    throw new Error("Falha na chamada da API após múltiplas tentativas.");
};


/**
 * Creates a base prompt with shared context for all generation requests.
 * @param params The generation parameters.
 * @returns A base prompt string.
 */
const getBasePrompt = (params: GenerationParams): string => {
    const creationType = params.creationType === CreationType.Story ? "história bíblica" : "oração";
    return `Você é um assistente criativo especializado em criar conteúdo cristão inspirador no idioma ${params.language}.
Tipo de Criação: ${creationType}.
Ideia Principal: "${params.mainPrompt}".`;
};

/**
 * Enhances the user's main prompt for a story.
 */
export const enhanceStoryPrompt = async (apiKey: string, params: GenerationParams, onStatusUpdate?: (status: string) => void): Promise<string> => {
    const ai = getAi(apiKey);
    if (params.creationType !== CreationType.Story) {
        return params.mainPrompt;
    }
    const prompt = `Aprimore a seguinte ideia para uma história bíblica, tornando-a mais detalhada, evocativa e com maior potencial narrativo.
Ideia Original: "${params.mainPrompt}"
Retorne APENAS a nova ideia aprimorada, sem qualquer outro texto ou introdução.`;

    const response = await generateWithRetry(() => ai.models.generateContent({
        model,
        contents: prompt,
    }), onStatusUpdate);
    return getText(response);
};

/**
 * Generates the main content (story or prayer).
 */
export const generateContent = async (apiKey: string, params: GenerationParams, modification?: string, onStatusUpdate?: (status: string) => void): Promise<string> => {
    const ai = getAi(apiKey);
    const creationType = params.creationType === CreationType.Story ? "história bíblica" : "oração";
    const minChars = Math.max(100, params.characterCount - 500);
    const maxChars = params.characterCount + 500;

    const prompt = `${getBasePrompt(params)}
Sua tarefa é gerar o conteúdo principal para a ${creationType}.

REGRAS ESTRITAS:
1.  O texto final DEVE OBRIGATORIAMENTE ter entre ${minChars} e ${maxChars} caracteres. Esta é a regra mais importante.
2.  Dentro dessa faixa de caracteres, a ${creationType} DEVE ser uma obra completa, com início, meio e fim bem definidos. A narrativa não pode ser interrompida ou parecer incompleta.
3.  Responda apenas com o texto da ${creationType}, sem títulos, introduções ou qualquer outro texto.

${modification ? `Modificação solicitada: "${modification}"` : ''}

Cumpra rigorosamente todas as regras acima.`;

    const response = await generateWithRetry(() => ai.models.generateContent({
        model,
        contents: prompt,
    }), onStatusUpdate);
    return getText(response);
};

/**
 * Refines existing text to fit a target character count by summarizing or expanding.
 */
export const refineTextLength = async (apiKey: string, params: GenerationParams, textToEdit: string, onStatusUpdate?: (status: string) => void): Promise<string> => {
    const ai = getAi(apiKey);
    const creationType = params.creationType === CreationType.Story ? "história bíblica" : "oração";
    const minChars = Math.max(100, params.characterCount - 500);
    const maxChars = params.characterCount + 500;

    const isTooLong = textToEdit.length > maxChars;

    const taskInstruction = isTooLong
        ? `Sua tarefa é RESUMIR o texto a seguir. O resumo deve capturar a essência da ${creationType}, mantendo uma estrutura narrativa clara com início, meio e fim.`
        : `Sua tarefa é EXPANDIR o texto a seguir. Adicione detalhes descritivos, aprofunde os pensamentos ou diálogos para enriquecer a narrativa sem alterar a história central.`;

    const prompt = `${taskInstruction}

Contexto Original:
- Tipo de Criação: ${creationType}
- Ideia Principal: "${params.mainPrompt}"
- Idioma: ${params.language}

Texto Original (Comprimento: ${textToEdit.length} caracteres):
---
${textToEdit}
---

REGRAS ESTRITAS E OBRIGATÓRIAS:
1.  O resultado final DEVE ter entre ${minChars} e ${maxChars} caracteres. Esta é a prioridade máxima.
2.  A ${creationType} deve permanecer completa e coerente.
3.  Retorne APENAS o texto finalizado, sem nenhuma explicação, introdução ou comentário.`;

    const response = await generateWithRetry(() => ai.models.generateContent({
        model,
        contents: prompt,
    }), onStatusUpdate);
    return getText(response);
};


/**
 * Generates a list of titles.
 */
export const generateTitles = async (apiKey: string, params: GenerationParams, modification?: string, onStatusUpdate?: (status: string) => void): Promise<string[]> => {
    const ai = getAi(apiKey);
    const prompt = `${getBasePrompt(params)}
Gere 5 sugestões de títulos criativos e atraentes.
${params.titlePrompt ? `Leve em consideração o seguinte desejo para o título: "${params.titlePrompt}"` : ''}
${modification ? `Modificação solicitada: "${modification}"` : ''}
Retorne a resposta como um array JSON de strings. Exemplo: ["Título 1", "Título 2"]`;

    const response = await generateWithRetry(() => ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            }
        }
    }), onStatusUpdate);

    const parsed = getJson<string[]>(response);
    return Array.isArray(parsed) ? parsed : [];
};

/**
 * Generates a description for the content.
 */
export const generateDescription = async (apiKey: string, params: GenerationParams, modification?: string, onStatusUpdate?: (status: string) => void): Promise<string> => {
    const ai = getAi(apiKey);
    const prompt = `${getBasePrompt(params)}
Gere uma descrição concisa e envolvente (para redes sociais ou YouTube) com no máximo 250 caracteres.
${params.descriptionPrompt ? `Leve em consideração o seguinte desejo para a descrição: "${params.descriptionPrompt}"` : ''}
${modification ? `Modificação solicitada: "${modification}"` : ''}
Retorne apenas o texto da descrição.`;
    
    const response = await generateWithRetry(() => ai.models.generateContent({
        model,
        contents: prompt,
    }), onStatusUpdate);
    return getText(response);
};

/**
 * Generates SEO tags.
 */
export const generateTags = async (apiKey: string, params: GenerationParams, modification?: string, onStatusUpdate?: (status: string) => void): Promise<string[]> => {
    const ai = getAi(apiKey);
    const prompt = `${getBasePrompt(params)}
Gere uma lista de 10 a 15 tags de SEO relevantes.
${modification ? `Modificação solicitada: "${modification}"` : ''}
Retorne a resposta como um array JSON de strings. Exemplo: ["tag1", "tag2"]`;
    
    const response = await generateWithRetry(() => ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            }
        }
    }), onStatusUpdate);
    const parsed = getJson<string[]>(response);
    return Array.isArray(parsed) ? parsed : [];
};

/**
 * Generates a Call to Action.
 */
export const generateCta = async (apiKey: string, params: GenerationParams, modification?: string, onStatusUpdate?: (status: string) => void): Promise<string> => {
    const ai = getAi(apiKey);
    const prompt = `${getBasePrompt(params)}
Gere uma "Chamada para Ação" (Call to Action - CTA) curta e inspiradora que incentive o engajamento (curtir, comentar, compartilhar).
${modification ? `Modificação solicitada: "${modification}"` : ''}
Retorne apenas o texto do CTA.`;
    
    const response = await generateWithRetry(() => ai.models.generateContent({
        model,
        contents: prompt,
    }), onStatusUpdate);
    return getText(response);
};

/**
 * Generates a prompt for an image generation model to create a thumbnail.
 */
export const generateThumbnailPrompt = async (apiKey: string, params: GenerationParams, content: string, modification?: string, onStatusUpdate?: (status: string) => void): Promise<string> => {
    const ai = getAi(apiKey);
    const prompt = `${getBasePrompt(params)}
Com base no conteúdo gerado abaixo, crie um prompt detalhado para um gerador de imagens (como Midjourney ou DALL-E) para criar uma thumbnail.
Conteúdo: "${content.substring(0, 500)}..."
${params.thumbnailPrompt ? `Leve em consideração o seguinte desejo para a thumbnail: "${params.thumbnailPrompt}"` : ''}
${modification ? `Modificação solicitada: "${modification}"` : ''}
O prompt para a imagem deve ser em inglês, descritivo, e focado em elementos visuais, atmosfera e estilo.
Retorne apenas o prompt para a imagem.`;

    const response = await generateWithRetry(() => ai.models.generateContent({
        model,
        contents: prompt,
    }), onStatusUpdate);
    return getText(response);
};

/**
 * Generates all content pieces in a single API call for efficiency.
 */
export const generateAllContent = async (apiKey: string, params: GenerationParams, onStatusUpdate?: (status: string) => void): Promise<AllContentResponse> => {
    const ai = getAi(apiKey);
    const creationType = params.creationType === CreationType.Story ? "história bíblica" : "oração";
    const minChars = Math.max(100, params.characterCount - 500);
    const maxChars = params.characterCount + 500;

    const prompt = `${getBasePrompt(params)}

Gere um pacote completo de conteúdo, seguindo as regras para cada item:
1.  content: O conteúdo principal da ${creationType}. REGRAS: O texto final DEVE OBRIGATORIAMENTE ter entre ${minChars} e ${maxChars} caracteres. DEVE ser uma obra completa com início, meio e fim.
2.  titles: 5 sugestões de títulos. ${params.titlePrompt ? `(Desejo: ${params.titlePrompt})` : ''}
3.  description: Uma descrição de até 250 caracteres. ${params.descriptionPrompt ? `(Desejo: ${params.descriptionPrompt})` : ''}
4.  tags: Uma lista de 10-15 tags de SEO.
5.  cta: Uma "Chamada para Ação" (CTA).
6.  thumbnailPrompt: Um prompt em inglês para gerar uma thumbnail, baseado na ${creationType}. ${params.thumbnailPrompt ? `(Desejo: ${params.thumbnailPrompt})` : ''}

A resposta DEVE ser um objeto JSON bem formado com a estrutura definida no schema.`;

    const response = await generateWithRetry(() => ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    content: { type: Type.STRING, description: `O conteúdo principal da ${creationType}. O texto DEVE OBRIGATORIAMENTE ter entre ${minChars} e ${maxChars} caracteres e ser uma obra completa e coerente, com início, meio e fim.` },
                    titles: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Uma lista de 5 títulos sugeridos.' },
                    description: { type: Type.STRING, description: 'Uma descrição para redes sociais.' },
                    tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Uma lista de tags de SEO.' },
                    cta: { type: Type.STRING, description: 'Uma chamada para ação.' },
                    thumbnailPrompt: { type: Type.STRING, description: 'Um prompt em inglês para um gerador de imagens.' },
                },
                required: ["content", "titles", "description", "tags", "cta", "thumbnailPrompt"]
            }
        }
    }), onStatusUpdate);

    return getJson<AllContentResponse>(response);
};