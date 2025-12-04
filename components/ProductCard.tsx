import React from 'react';
import { MainProduct } from '../types';

interface ProductCardProps {
  product: MainProduct;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  return (
    <div className="card-main-hover absolute w-[400px] h-[540px] top-1/2 left-1/2 -ml-[200px] -mt-[270px] bg-white border border-border rounded-xl shadow-premium transition-all duration-600 ease-[cubic-bezier(0.16,1,0.3,1)] backface-hidden overflow-hidden translate-z-40 z-20">
      <img 
        src={product.image} 
        className="w-full h-[420px] object-cover object-center" 
        alt={product.name} 
      />
