import React, { useRef, useState } from 'react';
import Papa from 'papaparse';
import { UploadIcon } from './icons';

interface CommunityUploadProps {
    onListLoaded: (codes: string[]) => void;
}

export const CommunityUpload = ({ onListLoaded }: CommunityUploadProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.csv')) {
            setError('Please upload a valid CSV file.');
            return;
        }

        setFileName(file.name);
        setError(null);

        Papa.parse<any>(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                // Look for a column named "Code", "Community Code", or "Community"
                const headers = results.meta.fields || [];
                const codeHeader = headers.find(h => 
                    h.toLowerCase() === 'code' || 
                    h.toLowerCase() === 'community code' || 
                    h.toLowerCase() === 'community'
                );

                if (!codeHeader) {
                    setError('CSV must contain a header named "Code", "Community Code", or "Community".');
                    setFileName(null);
                    return;
                }

                const codes = results.data
                    .map((row: any) => row[codeHeader]?.trim())
                    .filter((code: string) => code && code.length > 0);

                // Remove duplicates
                const uniqueCodes = Array.from(new Set(codes));
                onListLoaded(uniqueCodes as string[]);
            },
            error: (err) => {
                setError(`Parsing error: ${err.message}`);
                setFileName(null);
            }
        });
    };

    return (
        <div className="w-full">
             <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv"
                className="hidden"
            />
            <div className="flex flex-col space-y-2">
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-brand-surface border border-dashed border-brand-primary/50 hover:border-brand-primary text-brand-text-secondary hover:text-brand-primary font-medium py-4 px-4 rounded-lg flex flex-col items-center justify-center transition-all duration-200"
                >
                    <UploadIcon className="h-6 w-6 mb-2" />
                    <span className="text-sm">{fileName ? `Loaded: ${fileName}` : 'Upload Reference Community List (CSV)'}</span>
                </button>
                {error && <p className="text-red-400 text-xs text-center">{error}</p>}
            </div>
        </div>
    );
};