export enum CreationType {
  Story = 'story',
  Prayer = 'prayer',
}

export interface GenerationParams {
    creationName: string;
    creationType: CreationType;
    mainPrompt: string;
    titlePrompt: string;
    descriptionPrompt: string;
    thumbnailPrompt: string;
    characterCount: number;
    language: string;
}

export interface AllContentResponse {
    content: string;
    titles: string[];
    description: string;
    tags: string[];
    cta: string;
    thumbnailPrompt: string;
}

export interface Creation extends GenerationParams, AllContentResponse {
    id: string;
    timestamp: number;
}