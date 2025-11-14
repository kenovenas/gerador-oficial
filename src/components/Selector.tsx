
import React from 'react';

interface Option<T> {
    value: T;
    label: string;
    icon: React.ReactNode;
}

interface SelectorProps<T extends string> {
    options: Option<T>[];
    selectedValue: T;
    onChange: (value: T) => void;
}

const Selector = <T extends string,>({ options, selectedValue, onChange }: SelectorProps<T>) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {options.map((option) => (
                <button
                    key={option.value}
                    onClick={() => onChange(option.value)}
                    className={`flex items-center justify-center p-4 rounded-lg border-2 transition-all duration-200 ${
                        selectedValue === option.value
                            ? 'bg-amber-500 border-amber-400 text-gray-900 font-bold shadow-lg scale-105'
                            : 'bg-gray-700 border-gray-600 hover:bg-gray-600 hover:border-gray-500'
                    }`}
                >
                    <span className="mr-3 h-6 w-6">{option.icon}</span>
                    <span className="text-md">{option.label}</span>
                </button>
            ))}
        </div>
    );
};

export default Selector;