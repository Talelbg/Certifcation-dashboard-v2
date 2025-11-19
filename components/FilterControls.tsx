
import React from 'react';
import { DateRange } from '../types';

interface FilterControlsProps {
    dateRange: DateRange;
    onDateChange: (e: React.ChangeEvent<HTMLInputElement>, field: 'from' | 'to') => void;
}

export const FilterControls = ({ dateRange, onDateChange }: FilterControlsProps) => {
    
    // Helper to format Date object to YYYY-MM-DD string for input value
    const formatDateForInput = (date: Date | null) => {
        if (!date) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    return (
        <div className="flex items-center space-x-2 text-sm">
            <input
                type="date"
                value={formatDateForInput(dateRange.from)}
                onChange={(e) => onDateChange(e, 'from')}
                className="bg-brand-surface text-brand-text border border-brand-border rounded-lg px-3 py-2 focus:outline-none focus:border-brand-primary"
            />
            <span className="text-brand-text-secondary">to</span>
            <input
                type="date"
                value={formatDateForInput(dateRange.to)}
                onChange={(e) => onDateChange(e, 'to')}
                className="bg-brand-surface text-brand-text border border-brand-border rounded-lg px-3 py-2 focus:outline-none focus:border-brand-primary"
            />
        </div>
    );
};
