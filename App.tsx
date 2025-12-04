
import React from 'react';
import { ShopStage } from './components/ShopStage';
import { MainProduct, Recommendation } from './types';

// Mock Data
const mainProduct: MainProduct = {
  name: "Premium Wool Blend Coat",
  collection: "Winter Collection 2026",
  price: 299.00,
  
  // Reverted to user's specific PostImage link
  image: "https://i.postimg.cc/x8JZwSfC/Gemini-Generated-Image-8og0068og0068og0.jpg",

  aiStats: [
    { label: "Style: Minimalist, Contemporary", value: 99 },
    { label: "Material: Wool Blend, Premium", value: 97 },
    { label: "Season: Fall/Winter", value: 95 },
  ]
};

const recommendations: Recommendation[] = [
  {
    id: "1",
    name: "Cashmere Turtleneck",
    price: 129.00,
    image: "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=300&q=80",
    matchScore: 95,
    matchReason: "Natural Fibers • Winter"
  },
  {
    id: "2",
    name: "Leather Chelsea Boots",
    price: 189.00,
    image: "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?auto=format&fit=crop&w=300&q=80",
    matchScore: 95,
    matchReason: "Minimalist • Premium"
  },
  {
    id: "3",
    name: "Structured Leather Bag",
    price: 249.00,
    image: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=300&q=80",
    matchScore: 88,
    matchReason: "Color Harmony"
  },
  {
    id: "4",
    name: "Merino Wool Scarf",
    price: 79.00,
    image: "https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?auto=format&fit=crop&w=300&q=80",
    matchScore: 88,
    matchReason: "Texture • Warmth"
  }
];

const App: React.FC = () => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <main className="w-full h-full">
        <ShopStage product={mainProduct} recommendations={recommendations} />
      </main>
    </div>
  );
};

export default App;
