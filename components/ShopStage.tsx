import React from 'react';
import { ProductCard } from './ProductCard';
import { RecommendationsCard } from './RecommendationsCard';
import { MainProduct, Recommendation } from '../types';

interface ShopStageProps {
  product: MainProduct;
  recommendations: Recommendation[];
}

export const ShopStage: React.FC<ShopStageProps> = ({ product, recommendations }) => {
  return (
    <div className="w-full h-full flex justify-center items-center stage-perspective overflow-visible">
      {/* Increased width to accommodate both cards side by side without clipping, shifted left to center visually */}
      <div className="scene-hover-trigger relative w-[1200px] h-[700px] preserve-3d scale-90 -translate-y-5 -translate-x-[120px] transition-transform duration-500">
        <RecommendationsCard recommendations={recommendations} />
        <ProductCard product={product} />
      </div>
    </div>
  );
};