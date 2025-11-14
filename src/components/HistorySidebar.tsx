import React from 'react';
import { Creation } from '../types';
import { TrashIcon, XMarkIcon, PlusIcon } from './Icons';

interface HistorySidebarProps {
    isOpen: boolean;
    onClose: () => void;
    history: Creation[];
    currentCreationId: string | null;
    onLoad: (id: string) => void;
    onDelete: (id: string) => void;
    onNew: () => void;
}

const HistorySidebar: React.FC<HistorySidebarProps> = ({ isOpen, onClose, history, currentCreationId, onLoad, onDelete, onNew }) => {
    return (
        <>
            <aside className={`fixed top-0 left-0 z-40 w-80 h-screen bg-gray-800 border-r border-gray-700 shadow-xl transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-2xl font-bold text-amber-400">Histórico</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700 transition-colors" aria-label="Fechar histórico">
                        <XMarkIcon className="h-6 w-6 text-gray-300"/>
                    </button>
                </div>
                <div className="p-4 border-b border-gray-700">
                    <button
                        onClick={onNew}
                        className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold rounded-lg transition-colors"
                    >
                        <PlusIcon className="h-6 w-6" />
                        <span>Nova Criação</span>
                    </button>
                </div>
                <div className="p-4 h-[calc(100vh-142px)] overflow-y-auto">
                    {history.length === 0 ? (
                        <p className="text-gray-500 italic text-center mt-8">Nenhuma criação salva ainda.</p>
                    ) : (
                        <ul className="space-y-3">
                            {history.map(creation => {
                                const displayName = creation.creationName || (creation.titles && creation.titles.length > 0 ? creation.titles[0] : creation.mainPrompt);
                                return (
                                <li 
                                    key={creation.id} 
                                    className={`p-3 rounded-lg border-2 transition-colors ${currentCreationId === creation.id ? 'bg-amber-900/50 border-amber-500' : 'bg-gray-700/50 border-gray-600 hover:bg-gray-700'}`}
                                >
                                    <div className="cursor-pointer" onClick={() => onLoad(creation.id)}>
                                        <div className="font-semibold truncate text-gray-200" title={displayName}>
                                            {displayName}
                                        </div>
                                        <div className="text-sm text-gray-400 mb-2">
                                            {new Date(creation.timestamp).toLocaleString()}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => onLoad(creation.id)}
                                            className="flex-1 bg-gray-600 hover:bg-gray-500 text-white text-sm py-1 px-2 rounded"
                                        >
                                            Carregar
                                        </button>
                                        <button 
                                            onClick={() => onDelete(creation.id)}
                                            className="bg-red-800 hover:bg-red-700 text-white text-sm py-1 px-2 rounded"
                                            aria-label={`Apagar criação: ${displayName}`}
                                        >
                                            <TrashIcon className="h-4 w-4"/>
                                        </button>
                                    </div>
                                </li>
                                )
                            })}
                        </ul>
                    )}
                </div>
            </aside>
            {/* Overlay */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
                    onClick={onClose}
                ></div>
            )}
        </>
    );
};

export default HistorySidebar;