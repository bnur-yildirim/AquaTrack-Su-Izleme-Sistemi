import React from 'react';

/**
 * Profesyonel Loading Spinner Komponenti
 */
export default function LoadingSpinner({ 
    size = 'medium', 
    text = 'Yükleniyor...', 
    fullScreen = false,
    color = 'primary' 
}) {
    const sizeClasses = {
        small: 'w-4 h-4',
        medium: 'w-8 h-8',
        large: 'w-12 h-12',
        xlarge: 'w-16 h-16'
    };

    const colorClasses = {
        primary: 'border-blue-600',
        white: 'border-white',
        gray: 'border-gray-600'
    };

    const spinnerClass = `
        ${sizeClasses[size]} 
        ${colorClasses[color]}
        border-4 border-t-transparent rounded-full animate-spin
    `;

    if (fullScreen) {
        return (
            <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
                <div className="text-center">
                    <div className={spinnerClass}></div>
                    <p className="mt-4 text-gray-600">{text}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center p-4">
            <div className="text-center">
                <div className={spinnerClass}></div>
                {text && <p className="mt-2 text-gray-600 text-sm">{text}</p>}
            </div>
        </div>
    );
}

/**
 * Skeleton Loading Komponenti
 */
export function SkeletonCard({ lines = 3 }) {
    return (
        <div className="animate-pulse">
            <div className="bg-gray-200 h-4 rounded mb-2"></div>
            {Array.from({ length: lines - 1 }).map((_, i) => (
                <div key={i} className="bg-gray-200 h-3 rounded mb-1"></div>
            ))}
        </div>
    );
}

/**
 * Chart Loading Komponenti
 */
export function ChartSkeleton() {
    return (
        <div className="animate-pulse bg-gray-50 rounded-lg p-4">
            <div className="bg-gray-200 h-6 rounded mb-4 w-1/3"></div>
            <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="bg-gray-200 h-3 rounded" style={{ width: `${Math.random() * 40 + 30}%` }}></div>
                ))}
            </div>
        </div>
    );
}
