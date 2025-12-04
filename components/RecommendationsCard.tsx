
import React from 'react';
import { Recommendation } from '../types';

interface RecommendationsCardProps {
  recommendations: Recommendation[];
}

export const RecommendationsCard: React.FC<RecommendationsCardProps> = ({ recommendations }) => {
  return (
    <div className="card-rec-hover absolute w-[320px] h-[460px] top-1/2 left-1/2 ml-[265px] -mt-[230px] bg-white border border-border rounded-xl shadow-premium transition-all duration-600 ease-[cubic-bezier(0.16,1,0.3,1)] backface-hidden rotate-y-n5 z-10 flex flex-col p-6">
      <div className="text-xs font-bold uppercase tracking-wide mb-5 text-textMain border-b border-border pb-3">
        Complete the Look
      </div>
      
      <div className="grid grid-cols-2 gap-4 content-start h-full">
        {recommendations.map((rec) => (
          <div key={rec.id} className="flex flex-col gap-2 relative group cursor-pointer">
            <div className="relative overflow-hidden rounded-lg">
              <img 
                src={rec.image} 
                className="w-full h-[100px] bg-gray-100 object-cover transition-transform duration-500 group-hover:scale-110" 
                alt={rec.name} 
              />
              <span className={`absolute top-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded ${rec.matchScore >= 90 ? 'bg-accent text-black' : 'bg-gray-100 text-gray-600'}`}>
                {rec.matchScore}%
              </span>
            </div>
            
            <div className="flex flex-col">
              <h4 className="text-[11px] text-textSub font-medium truncate">{rec.name}</h4>
              <p className="text-[11px] text-textMain font-bold">${rec.price.toFixed(2)}</p>
              <span className="text-[9px] text-gray-400 block mt-1 line-clamp-1">Matches: {rec.matchReason}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
