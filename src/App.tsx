import React, { useState, useCallback, useEffect } from 'react';
import { CreationType, GenerationParams, Creation } from './types';
import * as geminiService from './services/geminiService';
import Header from './components/Header';
import Selector from './components/Selector';
import TextAreaInput from './components/TextAreaInput';
import ResultCard from './components/ResultCard';
import LoadingSpinner from './components/LoadingSpinner';
import HistorySidebar from './components/HistorySidebar';
import { BookOpenIcon, SparklesIcon, PencilIcon, TagIcon, ImageIcon, PrayingHandsIcon, DocumentTextIcon, MegaphoneIcon, TrashIcon, RefreshIcon, ClipboardIcon, ClipboardCheckIcon, CheckIcon, XCircleIcon } from './components/Icons';

type RegenerationField = 'titles' | 'description' | 'tags' | 'thumbnail' | 'content' | 'cta';

const supportedLanguages = [
    { code: 'pt-BR', name: 'Português (Brasil)' },
    { code: 'en-US', name: 'Inglês (EUA)' },
    { code: 'es-ES', name: 'Espanhol (Espanha)' },
    { code: 'fr-FR', name: 'Francês (França)' },
    { code: 'de-DE', name: 'Alemão (Alemanha)' },
];

/**
 * Truncates text smartly to a maximum length.
 * It tries to cut at the last sentence end, then at the last word,
 * before resorting to a hard cut.
 * @param text The text to truncate.
 * @param maxLength The maximum allowed length.
 * @returns The truncated text.
 */
const smartTruncate = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) {
        return text;
    }

    const searchArea = text.substring(0, maxLength);
    
    // Find the last period, exclamation, or question mark.
    const lastSentenceEnd = Math.max(
        searchArea.lastIndexOf('.'),
        searchArea.lastIndexOf('!'),
        searchArea.lastIndexOf('?')
    );

    // If we found a sentence end, and it's not the very beginning, cut there.
    if (lastSentenceEnd > 0) {
        return searchArea.substring(0, lastSentenceEnd + 1);
    }

    // If not, try to cut at the last space to avoid breaking a word.
    const lastSpace = searchArea.lastIndexOf(' ');
    if (lastSpace > 0) {
        return searchArea.substring(0, lastSpace) + '...';
    }

    // If all else fails, hard truncate.
    return searchArea.substring(0, maxLength) + '...';
};


const App: React.FC = () => {
    // API Key State
    const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('geminiApiKey') || '');
    const [apiKeyInputValue, setApiKeyInputValue] = useState<string>(apiKey);
    const isApiKeyMissing = !apiKey;

    // Input State
    const [creationName, setCreationName] = useState('');
    const [creationType, setCreationType] = useState<CreationType>(CreationType.Story);
    const [mainPrompt, setMainPrompt] = useState('');
    const [titlePrompt, setTitlePrompt] = useState('');
    const [descriptionPrompt, setDescriptionPrompt] = useState('');
    const [thumbnailPrompt, setThumbnailPrompt] = useState('');
    const [characterCount, setCharacterCount] = useState(1500);
    const [language, setLanguage] = useState('pt-BR');

    // Output State
    const [generatedTitles, setGeneratedTitles] = useState<string[]>([]);
    const [generatedDescription, setGeneratedDescription] = useState('');
    const [generatedTags, setGeneratedTags] = useState<string[]>([]);
    const [generatedThumbnailPrompt, setGeneratedThumbnailPrompt] = useState('');
    const [generatedContent, setGeneratedContent] = useState('');
    const [generatedContentCharCount, setGeneratedContentCharCount] = useState(0);
    const [generatedCta, setGeneratedCta] = useState('');

    // UI State
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationStatus, setGenerationStatus] = useState<string | null>(null);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [regeneratingField, setRegeneratingField] = useState<RegenerationField | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [warning, setWarning] = useState<string | null>(null);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    // Modal State
    const [regenModalField, setRegenModalField] = useState<RegenerationField | null>(null);
    const [regenModificationPrompt, setRegenModificationPrompt] = useState('');

    // History State
    const [history, setHistory] = useState<Creation[]>([]);
    const [currentCreationId, setCurrentCreationId] = useState<string | null>(null);

    // Load History from localStorage on mount
    useEffect(() => {
        const savedHistory = localStorage.getItem('generationHistory');
        if (savedHistory) {
            setHistory(JSON.parse(savedHistory));
        }
    }, []);

    // Save history to localStorage whenever it changes
    useEffect(() => {
        if (history.length > 0) {
            localStorage.setItem('generationHistory', JSON.stringify(history));
        } else {
            localStorage.removeItem('generationHistory');
        }
    }, [history]);

    const handleApiKeySave = () => {
        const trimmedKey = apiKeyInputValue.trim();
        if (trimmedKey) {
            setApiKey(trimmedKey);
            localStorage.setItem('geminiApiKey', trimmedKey);
            setError(null);
            setWarning(null);
        } else {
            setError("A chave de API não pode estar vazia.");
        }
    };

    const handleApiKeyRemove = () => {
        setApiKey('');
        setApiKeyInputValue('');
        localStorage.removeItem('geminiApiKey');
    };

    // Update character count for the main content
    useEffect(() => {
        setGeneratedContentCharCount(generatedContent.length);
    }, [generatedContent]);

    const getGenerationParams = useCallback((): GenerationParams => ({
        creationName, creationType, mainPrompt, titlePrompt, descriptionPrompt, thumbnailPrompt, characterCount, language
    }), [creationName, creationType, mainPrompt, titlePrompt, descriptionPrompt, thumbnailPrompt, characterCount, language]);
    
    const handleEnhancePrompt = useCallback(async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!apiKey) {
            setError("Por favor, insira e salve sua chave de API do Gemini.");
            return;
        }
        if (!mainPrompt) {
            setError("Por favor, insira uma ideia para aprimorar.");
            return;
        }
        setIsEnhancing(true);
        setError(null);
        setWarning(null);
        try {
            const params = getGenerationParams();
            const enhanced = await geminiService.enhanceStoryPrompt(apiKey, params);
            setMainPrompt(enhanced);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? `Erro ao aprimorar ideia: ${err.message}` : "Ocorreu um erro desconhecido.");
        } finally {
            setIsEnhancing(false);
        }
    }, [mainPrompt, getGenerationParams, apiKey]);
    
    const handleNewProject = () => {
        setCreationName('');
        setMainPrompt('');
        setTitlePrompt('');
        setDescriptionPrompt('');
        setThumbnailPrompt('');
        setGeneratedTitles([]);
        setGeneratedDescription('');
        setGeneratedTags([]);
        setGeneratedThumbnailPrompt('');
        setGeneratedContent('');
        setGeneratedCta('');
        setError(null);
        setWarning(null);
        setCurrentCreationId(null);
    };
    
    const handleGenerateAll = async () => {
        if (!apiKey) {
            setError("Por favor, insira e salve sua chave de API do Gemini.");
            return;
        }
        if (!mainPrompt) {
            setError("Por favor, insira a ideia principal para a geração.");
            return;
        }

        setIsGenerating(true);
        setError(null);
        setWarning(null);
        setGenerationStatus('Gerando todo o conteúdo...');
        
        if (!currentCreationId) {
            setGeneratedTitles([]);
            setGeneratedDescription('');
            setGeneratedTags([]);
            setGeneratedThumbnailPrompt('');
            setGeneratedContent('');
            setGeneratedCta('');
        }

        try {
            const params = getGenerationParams();
            let allContent = await geminiService.generateAllContent(apiKey, params);
            let finalContent = allContent.content;
            
            const minChars = Math.max(100, params.characterCount - 500);
            const maxChars = params.characterCount + 500;
            const MAX_REFINEMENT_ATTEMPTS = 2;

            let refinementAttempts = 0;
            while (
                (finalContent.length < minChars || finalContent.length > maxChars) &&
                refinementAttempts < MAX_REFINEMENT_ATTEMPTS
            ) {
                refinementAttempts++;
                const isTooLong = finalContent.length > maxChars;
                setGenerationStatus(`Tentativa ${refinementAttempts}/${MAX_REFINEMENT_ATTEMPTS}: Conteúdo fora do alvo. ${isTooLong ? 'Resumindo' : 'Expandindo'}...`);

                finalContent = await geminiService.refineTextLength(apiKey, params, finalContent);
            }

            allContent.content = finalContent;
            const finalContentLen = finalContent.length;
            
            setError(null);
            setWarning(null);

            if (finalContentLen < minChars || finalContentLen > maxChars) {
                if (finalContentLen > maxChars) {
                    const originalLength = finalContentLen;
                    allContent.content = smartTruncate(finalContent, maxChars);
                    setWarning(`A IA não conseguiu ajustar o texto em ${MAX_REFINEMENT_ATTEMPTS} tentativas. O resultado (${originalLength} caracteres) foi ajustado automaticamente.`);
                } else {
                    setError(`A IA não conseguiu refinar o conteúdo para a faixa de caracteres desejada (${minChars}-${maxChars}). O resultado final tem ${finalContentLen} caracteres.`);
                }
            } else {
                if (refinementAttempts > 0) {
                    setWarning(`O conteúdo foi refinado pela IA em ${refinementAttempts} tentativa(s) para se ajustar ao tamanho solicitado.`);
                }
            }

            setGeneratedContent(allContent.content);
            setGeneratedTitles(allContent.titles);
            setGeneratedDescription(allContent.description);
            setGeneratedTags(allContent.tags);
            setGeneratedCta(allContent.cta);
            setGeneratedThumbnailPrompt(allContent.thumbnailPrompt);

            const newCreation: Creation = {
                id: currentCreationId || `creation-${Date.now()}`,
                timestamp: Date.now(),
                ...params,
                ...allContent
            };
            
            setHistory(prevHistory => {
                const existingIndex = prevHistory.findIndex(item => item.id === newCreation.id);
                if (existingIndex > -1) {
                    const updatedHistory = [...prevHistory];
                    updatedHistory[existingIndex] = newCreation;
                    return updatedHistory;
                }
                return [newCreation, ...prevHistory];
            });
            setCurrentCreationId(newCreation.id);

        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "Ocorreu um erro desconhecido durante a geração.");
        } finally {
            setIsGenerating(false);
            setGenerationStatus(null);
        }
    };
    
    const handleLoadCreation = (id: string) => {
        const creationToLoad = history.find(c => c.id === id);
        if (creationToLoad) {
            setCreationName(creationToLoad.creationName || '');
            setCreationType(creationToLoad.creationType);
            setMainPrompt(creationToLoad.mainPrompt);
            setTitlePrompt(creationToLoad.titlePrompt);
            setDescriptionPrompt(creationToLoad.descriptionPrompt);
            setThumbnailPrompt(creationToLoad.thumbnailPrompt);
            setCharacterCount(creationToLoad.characterCount);
            setLanguage(creationToLoad.language);
            setGeneratedTitles(creationToLoad.titles);
            setGeneratedDescription(creationToLoad.description);
            setGeneratedTags(creationToLoad.tags);
            setGeneratedThumbnailPrompt(creationToLoad.thumbnailPrompt);
            setGeneratedContent(creationToLoad.content);
            setGeneratedCta(creationToLoad.cta);
            setCurrentCreationId(creationToLoad.id);
            setError(null);
            setWarning(null);
            setIsHistoryOpen(false);
        }
    };

    const handleDeleteCreation = (id: string) => {
        if (window.confirm("Tem certeza que deseja apagar esta criação?")) {
            setHistory(prev => prev.filter(c => c.id !== id));
            if (currentCreationId === id) {
                handleNewProject();
            }
        }
    };

    const handleRegenerate = useCallback(async () => {
        if (!apiKey) {
            setError("Por favor, insira e salve sua chave de API do Gemini para regenerar.");
            setRegenModalField(null);
            return;
        }
        if (!regenModalField) return;

        setRegeneratingField(regenModalField);
        const fieldToRegen = regenModalField;
        setRegenModalField(null);
        setError(null);
        setWarning(null);

        try {
            const params = getGenerationParams();
            let contentForThumbnail = generatedContent;

            switch (fieldToRegen) {
                case 'titles':
                    setGeneratedTitles(await geminiService.generateTitles(apiKey, params, regenModificationPrompt));
                    break;
                case 'description':
                    setGeneratedDescription(await geminiService.generateDescription(apiKey, params, regenModificationPrompt));
                    break;
                case 'tags':
                    setGeneratedTags(await geminiService.generateTags(apiKey, params, regenModificationPrompt));
                    break;
                case 'thumbnail':
                    setGeneratedThumbnailPrompt(await geminiService.generateThumbnailPrompt(apiKey, params, contentForThumbnail, regenModificationPrompt));
                    break;
                case 'content':
                    {
                        let newContent = await geminiService.generateContent(apiKey, params, regenModificationPrompt);
                        
                        const minChars = Math.max(100, params.characterCount - 500);
                        const maxChars = params.characterCount + 500;
                        const MAX_REFINEMENT_ATTEMPTS = 2;

                        let refinementAttempts = 0;
                        while (
                            (newContent.length < minChars || newContent.length > maxChars) &&
                            refinementAttempts < MAX_REFINEMENT_ATTEMPTS
                        ) {
                            refinementAttempts++;
                            const isTooLong = newContent.length > maxChars;
                            setWarning(`Tentativa ${refinementAttempts}/${MAX_REFINEMENT_ATTEMPTS}: Conteúdo regenerado fora do alvo. ${isTooLong ? 'Resumindo' : 'Expandindo'}...`);
                            newContent = await geminiService.refineTextLength(apiKey, params, newContent);
                        }

                        const finalContentLen = newContent.length;
                        setError(null);
                        setWarning(null);

                        if (finalContentLen < minChars || finalContentLen > maxChars) {
                            if (finalContentLen > maxChars) {
                                const originalLength = finalContentLen;
                                newContent = smartTruncate(newContent, maxChars);
                                setWarning(`A IA não conseguiu ajustar o texto em ${MAX_REFINEMENT_ATTEMPTS} tentativas. O resultado (${originalLength} caracteres) foi ajustado automaticamente.`);
                            } else {
                                setError(`A IA não conseguiu refinar o conteúdo para a faixa de caracteres desejada (${minChars}-${maxChars}). O resultado final tem ${finalContentLen} caracteres.`);
                            }
                        } else {
                             if (refinementAttempts > 0) {
                                setWarning(`O conteúdo regenerado foi refinado pela IA em ${refinementAttempts} tentativa(s) para se ajustar ao tamanho solicitado.`);
                            }
                        }
                        
                        setGeneratedContent(newContent);
                        contentForThumbnail = newContent;
                    }
                    break;
                case 'cta':
                    setGeneratedCta(await geminiService.generateCta(apiKey, params, regenModificationPrompt));
                    break;
            }
        } catch (err) {
             console.error(err);
            setError(err instanceof Error ? `Erro ao regenerar: ${err.message}` : "Ocorreu um erro desconhecido.");
        } finally {
            setRegeneratingField(null);
            setRegenModificationPrompt('');
        }
    }, [regenModalField, getGenerationParams, regenModificationPrompt, generatedContent, apiKey]);

    const handleCopy = useCallback((text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(text);
        setTimeout(() => setCopiedField(null), 2000);
    }, []);

    const isLoading = isGenerating || !!regeneratingField || isEnhancing;
    const actionsDisabled = isLoading || isApiKeyMissing;

    const renderRegenerationModal = () => {
        if (!regenModalField) return null;

        const fieldLabels: Record<RegenerationField, string> = {
            titles: 'Títulos',
            description: 'Descrição',
            tags: 'Tags de SEO',
            thumbnail: 'Prompt para Thumbnail',
            content: creationType === CreationType.Story ? 'História' : 'Oração',
            cta: 'Chamada para Ação (CTA)'
        };

        return (
            <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onClick={() => setRegenModalField(null)}>
                <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                    <h3 className="text-xl font-bold text-amber-400 mb-4">Modificar {fieldLabels[regenModalField]}</h3>
                    <TextAreaInput
                        label="O que você deseja modificar ou melhorar?"
                        value={regenModificationPrompt}
                        onChange={(e) => setRegenModificationPrompt(e.target.value)}
                        placeholder="Ex: Tente um tom mais dramático, foque no personagem X..."
                        rows={4}
                    />
                    <div className="flex justify-end gap-4 mt-4">
                        <button onClick={() => setRegenModalField(null)} className="py-2 px-4 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors">Cancelar</button>
                        <button onClick={handleRegenerate} className="py-2 px-4 bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold rounded-lg transition-colors">Gerar</button>
                    </div>
                </div>
            </div>
        );
    };

    const mainPromptLabel = (
        <div className="flex justify-between items-center">
            <span>{`4. Ideia Principal para a ${creationType === CreationType.Story ? 'História' : 'Oração'}`}</span>
            {creationType === CreationType.Story && (
                <button 
                    onClick={handleEnhancePrompt} 
                    disabled={actionsDisabled}
                    className="bg-gray-700 hover:bg-gray-600 text-amber-400 font-bold py-1 px-2 rounded-lg transition-colors disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed flex items-center gap-1 text-sm"
                    title="Aprimorar Ideia"
                >
                    {isEnhancing ? <LoadingSpinner/> : <><SparklesIcon className="h-4 w-4" /> Aprimorar</>}
                </button>
            )}
        </div>
    );
    
    const totalTagChars = generatedTags.join(', ').length;

    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
            {renderRegenerationModal()}
             <HistorySidebar 
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                history={history}
                currentCreationId={currentCreationId}
                onLoad={handleLoadCreation}
                onDelete={handleDeleteCreation}
                onNew={() => {
                    handleNewProject();
                    setIsHistoryOpen(false);
                }}
            />
            <div className={`relative transition-all duration-300 ease-in-out ${isHistoryOpen ? 'lg:pl-80' : 'pl-0'}`}>
                <Header onToggleHistory={() => setIsHistoryOpen(prev => !prev)} />
                <main className="container mx-auto p-4 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Controls Column */}
                    <div className="lg:col-span-1 flex flex-col gap-6 bg-gray-800 p-6 rounded-lg shadow-2xl border border-gray-700 h-fit">
                        <h2 className="text-2xl font-bold text-amber-400 border-b-2 border-amber-500 pb-2">Configurações de Geração</h2>
                        
                        <div>
                            <label htmlFor="api-key-input" className="block text-lg font-semibold mb-2 text-gray-300">
                                1. Sua Chave de API do Gemini <span className="text-red-400">*</span>
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    id="api-key-input"
                                    type="password"
                                    value={apiKeyInputValue}
                                    onChange={(e) => {
                                        setApiKeyInputValue(e.target.value);
                                        setError(null);
                                    }}
                                    placeholder="Cole sua chave de API aqui"
                                    className="flex-grow w-full bg-gray-700 border border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
                                />
                                <button onClick={handleApiKeySave} title="Salvar Chave" className="p-3 bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex-shrink-0">
                                    <CheckIcon className="h-6 w-6 text-white"/>
                                </button>
                                {apiKey && (
                                    <button onClick={handleApiKeyRemove} title="Remover Chave" className="p-3 bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex-shrink-0">
                                        <XCircleIcon className="h-6 w-6 text-white"/>
                                    </button>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Sua chave é salva localmente no seu navegador.</p>
                        </div>

                        <fieldset disabled={isApiKeyMissing} className={`contents ${isApiKeyMissing ? 'opacity-50' : ''}`}>
                            <div>
                                <label htmlFor="creation-name-input" className="block text-lg font-semibold mb-2 text-gray-300">
                                    2. Nome da Criação (Opcional)
                                </label>
                                <input
                                    id="creation-name-input"
                                    type="text"
                                    value={creationName}
                                    onChange={(e) => setCreationName(e.target.value)}
                                    placeholder="Ex: A Parábola do Filho Pródigo"
                                    className="w-full bg-gray-700 border border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition disabled:cursor-not-allowed"
                                />
                            </div>

                            <div>
                                <label className="block text-lg font-semibold mb-2 text-gray-300">3. Escolha o Tipo de Criação</label>
                                <Selector<CreationType>
                                    options={[
                                        { value: CreationType.Story, label: 'História Bíblica', icon: <BookOpenIcon /> },
                                        { value: CreationType.Prayer, label: 'Oração', icon: <PrayingHandsIcon /> },
                                    ]}
                                    selectedValue={creationType}
                                    onChange={setCreationType}
                                />
                            </div>

                            <div>
                                <TextAreaInput
                                    label={mainPromptLabel}
                                    value={mainPrompt}
                                    onChange={(e) => setMainPrompt(e.target.value)}
                                    placeholder="Ex: A parábola do filho pródigo, mas contada pela perspectiva do irmão mais velho."
                                    rows={4}
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="language-select" className="block text-lg font-semibold mb-2 text-gray-300">5. Idioma do Conteúdo</label>
                                <select
                                    id="language-select"
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition disabled:cursor-not-allowed"
                                >
                                    {supportedLanguages.map(lang => (
                                        <option key={lang.code} value={lang.code}>{lang.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="char-count" className="block text-lg font-semibold mb-2 text-gray-300">6. Contagem de Caracteres</label>
                                <input
                                    id="char-count"
                                    type="number"
                                    value={characterCount}
                                    onChange={(e) => setCharacterCount(Number(e.target.value))}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition disabled:cursor-not-allowed"
                                    min="100"
                                    step="50"
                                />
                            </div>

                            <div className="border-t border-gray-600 pt-4">
                                <h3 className="text-xl font-semibold text-amber-400 mb-3">Opcional: Refinar Resultados</h3>
                                <TextAreaInput label="Desejo para o Título" value={titlePrompt} onChange={(e) => setTitlePrompt(e.target.value)} placeholder="Ex: Um título que evoque mistério e redenção." rows={2}/>
                                <TextAreaInput label="Desejo para a Descrição" value={descriptionPrompt} onChange={(e) => setDescriptionPrompt(e.target.value)} placeholder="Ex: Focar na jornada emocional do personagem." rows={2}/>
                                <TextAreaInput label="Desejo para a Thumbnail" value={thumbnailPrompt} onChange={(e) => setThumbnailPrompt(e.target.value)} placeholder="Ex: Estilo de pintura a óleo, com iluminação dramática." rows={2}/>
                            </div>
                        </fieldset>

                        {isApiKeyMissing && (
                            <div className="bg-red-900/50 border border-red-500 text-red-300 p-3 rounded-lg text-center">
                                Por favor, salve sua chave de API do Gemini para habilitar a geração de conteúdo.
                            </div>
                        )}

                        <div className="flex gap-2">
                            <button onClick={handleGenerateAll} disabled={actionsDisabled} className="flex-grow bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold py-3 px-4 rounded-lg transition-transform transform hover:scale-105 disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg">
                                {isLoading ? <LoadingSpinner /> : 'Gerar Conteúdo'}
                            </button>
                            <button onClick={handleNewProject} disabled={isLoading} title="Novo Projeto" className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center justify-center">
                                <TrashIcon className="h-6 w-6"/>
                            </button>
                        </div>
                        
                        {isGenerating && generationStatus && (
                            <p className="text-amber-300 mt-2 text-center animate-pulse">{generationStatus}</p>
                        )}
                        {warning && <p className="text-yellow-400 mt-2 text-center">{warning}</p>}
                        {error && <p className="text-red-400 mt-2 text-center">{error}</p>}
                    </div>

                    {/* Results Column */}
                    <div className="lg:col-span-2 flex flex-col gap-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-gray-800 p-5 rounded-lg shadow-lg border border-gray-700 flex flex-col">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center">
                                        <span className="h-6 w-6 text-amber-400 mr-3"><PencilIcon /></span>
                                        <h3 className="text-xl font-semibold text-amber-400">Títulos Sugeridos</h3>
                                    </div>
                                    { !(regeneratingField === 'titles' || (isGenerating && !generatedTitles.length)) && generatedTitles.length > 0 && (
                                        <div className="flex items-center gap-3">
                                            <button 
                                                onClick={() => setRegenModalField('titles')} 
                                                disabled={actionsDisabled}
                                                className="text-gray-400 hover:text-white transition-colors disabled:text-gray-600 disabled:cursor-not-allowed" 
                                                title="Gerar novamente"
                                            >
                                                <RefreshIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-grow">
                                    {(regeneratingField === 'titles' || (isGenerating && !generatedTitles.length)) ? (
                                        <div className="flex items-center justify-center h-full min-h-[150px]">
                                            <LoadingSpinner />
                                        </div>
                                    ) : (
                                        generatedTitles.length > 0 ? (
                                            <ul className="space-y-2">
                                                {generatedTitles.map((title, index) => (
                                                    <li key={index} className="flex items-center justify-between bg-gray-700/50 p-2 rounded-md group">
                                                        <span className="text-gray-300 font-serif leading-relaxed pr-2 flex-grow">{title}</span>
                                                        <button
                                                            onClick={() => handleCopy(title)}
                                                            title="Copiar"
                                                            className="text-gray-400 hover:text-white transition-colors opacity-50 group-hover:opacity-100 flex-shrink-0 disabled:text-gray-600 disabled:cursor-not-allowed"
                                                            disabled={isLoading}
                                                        >
                                                            {copiedField === title ? <ClipboardCheckIcon className="h-5 w-5 text-green-400" /> : <ClipboardIcon className="h-5 w-5" />}
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-gray-500 italic min-h-[150px] flex items-center justify-center">O conteúdo gerado aparecerá aqui...</p>
                                        )
                                    )}
                                </div>
                            </div>
                            
                            <ResultCard 
                                title="Descrição" 
                                icon={<DocumentTextIcon />} 
                                isLoading={regeneratingField === 'description' || (isGenerating && !generatedDescription)} 
                                onRegenerate={() => setRegenModalField('description')} 
                                onCopy={() => handleCopy(generatedDescription)} 
                                isCopied={copiedField === generatedDescription} 
                                hasContent={!!generatedDescription}
                                actionsDisabled={actionsDisabled} 
                                isEditable={true}
                                value={generatedDescription}
                                onChange={setGeneratedDescription}
                                textareaHeight="150px"
                            />
                        </div>

                        <ResultCard 
                            title={creationType === CreationType.Story ? 'História Bíblica' : 'Oração'} 
                            icon={creationType === CreationType.Story ? <BookOpenIcon /> : <PrayingHandsIcon />} 
                            isLoading={regeneratingField === 'content' || (isGenerating && !generatedContent)} 
                            footerText={generatedContentCharCount > 0 ? `${generatedContentCharCount} caracteres` : ''} 
                            onRegenerate={() => setRegenModalField('content')} 
                            onCopy={() => handleCopy(generatedContent)} 
                            isCopied={copiedField === generatedContent} 
                            hasContent={!!generatedContent} 
                            actionsDisabled={actionsDisabled}
                            isEditable={true}
                            value={generatedContent}
                            onChange={setGeneratedContent}
                            textareaHeight="400px"
                        />
                        
                        <ResultCard 
                            title="Chamada para Ação (CTA)" 
                            icon={<MegaphoneIcon />} 
                            isLoading={regeneratingField === 'cta' || (isGenerating && !generatedCta)} 
                            onRegenerate={() => setRegenModalField('cta')} 
                            onCopy={() => handleCopy(generatedCta)} 
                            isCopied={copiedField === generatedCta} 
                            hasContent={!!generatedCta}
                            actionsDisabled={actionsDisabled} 
                            isEditable={true}
                            value={generatedCta}
                            onChange={setGeneratedCta}
                        />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <ResultCard 
                                title="Tags de SEO" 
                                icon={<TagIcon />} 
                                isLoading={regeneratingField === 'tags' || (isGenerating && !generatedTags.length)} 
                                onRegenerate={() => setRegenModalField('tags')} 
                                onCopy={() => handleCopy(generatedTags.join(', '))} 
                                isCopied={copiedField === generatedTags.join(', ')} 
                                hasContent={generatedTags.length > 0} 
                                actionsDisabled={actionsDisabled}
                                footerText={generatedTags.length > 0 ? `${totalTagChars} / 500 caracteres` : ''}
                                isEditable={true}
                                value={generatedTags.join(', ')}
                                onChange={(val) => setGeneratedTags(val.split(',').map(t => t.trim()))}
                            />

                            <ResultCard 
                                title="Prompt para Thumbnail" 
                                icon={<ImageIcon />} 
                                isLoading={regeneratingField === 'thumbnail' || (isGenerating && !generatedThumbnailPrompt)} 
                                onRegenerate={() => setRegenModalField('thumbnail')} 
                                onCopy={() => handleCopy(generatedThumbnailPrompt)} 
                                isCopied={copiedField === generatedThumbnailPrompt} 
                                hasContent={!!generatedThumbnailPrompt}
                                actionsDisabled={actionsDisabled} 
                                isEditable={true}
                                value={generatedThumbnailPrompt}
                                onChange={setGeneratedThumbnailPrompt}
                            />
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default App;