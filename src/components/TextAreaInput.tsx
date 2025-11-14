import React from 'react';

interface TextAreaInputProps {
    label: string | React.ReactNode;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder: string;
    rows?: number;
    required?: boolean;
    disabled?: boolean;
}

const TextAreaInput: React.FC<TextAreaInputProps> = ({ label, value, onChange, placeholder, rows = 3, required = false, disabled = false }) => {
    return (
        <div className="w-full">
            <label className="block text-lg font-semibold mb-2 text-gray-300">
                {label} {required && <span className="text-red-400">*</span>}
            </label>
            <textarea
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                rows={rows}
                disabled={disabled}
                className={`w-full bg-gray-700 border border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition placeholder-gray-500 resize-y ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
        </div>
    );
};

export default TextAreaInput;