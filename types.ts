export interface ProductStats {
  label: string;
  value: number;
}

export interface Recommendation {
  id: string;
  name: string;
  price: number;
  image: string;
  matchScore: number;
  matchReason: string;
}

export interface MainProduct {
  name: string;
  collection: string;
  price: number;
  image: string;
  aiStats: ProductStats[];
}