import React, { useRef, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { RefreshIcon, ClipboardIcon, ClipboardCheckIcon } from './Icons';

interface ResultCardProps {
    title: string;
    icon: React.ReactNode;
    isLoading: boolean;
    footerText?: string;
    onRegenerate?: () => void;
    onCopy?: () => void;
    isCopied?: boolean;
    hasContent?: boolean;
    actionsDisabled?: boolean;
    isEditable?: boolean;
    value?: string;
    onChange?: (value: string) => void;
    textareaHeight?: string;
}

const ResultCard: React.FC<ResultCardProps> = ({ 
    title, 
    icon, 
    isLoading, 
    footerText, 
    onRegenerate, 
    onCopy, 
    isCopied,
    hasContent,
    actionsDisabled,
    isEditable = false,
    value,
    onChange,
    textareaHeight = 'auto'
}) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto'; 
            const scrollHeight = textarea.scrollHeight;
            textarea.style.height = `${scrollHeight}px`;
        }
    }, [value]);

    return (
        <div className="bg-gray-800 p-5 rounded-lg shadow-lg border border-gray-700 flex flex-col">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                    <span className="h-6 w-6 text-amber-400 mr-3">{icon}</span>
                    <h3 className="text-xl font-semibold text-amber-400">{title}</h3>
                </div>
                {!isLoading && (
                     <div className="flex items-center gap-3">
                        {onRegenerate && (
                            <button 
                                onClick={onRegenerate} 
                                disabled={actionsDisabled}
                                className="text-gray-400 hover:text-white transition-colors disabled:text-gray-600 disabled:cursor-not-allowed" 
                                title="Gerar novamente"
                            >
                                <RefreshIcon className="h-5 w-5" />
                            </button>
                        )}
                        {onCopy && (
                            <button 
                                onClick={onCopy} 
                                disabled={actionsDisabled || !hasContent}
                                className="text-gray-400 hover:text-white transition-colors disabled:text-gray-600 disabled:cursor-not-allowed" 
                                title="Copiar"
                            >
                                {isCopied ? <ClipboardCheckIcon className="h-5 w-5 text-green-400" /> : <ClipboardIcon className="h-5 w-5" />}
                            </button>
                        )}
                    </div>
                )}
            </div>
            <div className="flex-grow">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full min-h-[100px]">
                        <LoadingSpinner />
                    </div>
                ) : (
                    hasContent ? (
                        isEditable && onChange ? (
                             <textarea
                                ref={textareaRef}
                                value={value}
                                onChange={(e) => onChange(e.target.value)}
                                className="w-full bg-gray-700/50 border border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition placeholder-gray-500 resize-none overflow-hidden text-gray-300 font-serif leading-relaxed"
                                style={{ minHeight: textareaHeight }}
                            />
                        ) : (
                           <div className="whitespace-pre-wrap text-gray-300 font-serif leading-relaxed">{value}</div>
                        )
                    ) : (
                        <p className="text-gray-500 italic min-h-[100px] flex items-center justify-center">O conteúdo gerado aparecerá aqui...</p>
                    )
                )}
            </div>
            {footerText && !isLoading && hasContent && (
                 <div className="text-right text-sm text-gray-500 mt-2 pt-2 border-t border-gray-700">
                    {footerText}
                </div>
            )}
        </div>
    );
};

export default ResultCard;