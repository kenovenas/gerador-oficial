import React from 'react';
import { BookOpenIcon, HistoryIcon } from './Icons';

interface HeaderProps {
    onToggleHistory: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleHistory }) => {
    return (
        <header className="bg-gray-800 shadow-lg border-b-4 border-amber-500 sticky top-0 z-20">
            <div className="container mx-auto px-4 lg:px-8 py-4 flex items-center">
                <button 
                    onClick={onToggleHistory} 
                    className="p-2 rounded-full hover:bg-gray-700 transition-colors mr-4"
                    title="Ver Histórico"
                    aria-label="Ver Histórico"
                >
                    <HistoryIcon className="h-8 w-8 text-amber-400"/>
                </button>
                <div className="flex items-center">
                    <BookOpenIcon className="h-10 w-10 text-amber-400 mr-4 flex-shrink-0"/>
                    <h1 className="text-xl sm:text-3xl font-bold text-white tracking-wider">
                        Keno Teólogo
                    </h1>
                </div>
            </div>
        </header>
    );
};

export default Header;