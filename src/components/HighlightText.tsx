import React from 'react';

export const HighlightText = ({ text, query, className }: { text: string; query: string; className?: string }) => {
  if (!query) return <span className={className}>{text}</span>;
  
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <span className={className}>
      {parts.map((part, index) => 
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={index} className="bg-yellow-200 text-slate-900 font-bold">{part}</mark>
        ) : (
          part
        )
      )}
    </span>
  );
};
