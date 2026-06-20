export interface PricingTier {
  upTo: number;
  price: number;
  unitKey: string;
}

export interface ProductPricing {
  id: string;
  nameKey: string;
  icon: React.ReactNode;
  freeLimitKey: string;
  unitKey: string;
  tiers: PricingTier[];
  sliderMax: number;
  freeThreshold: number;
}

export interface FreeTierItem {
  product: string;
  allowance: string;
  icon: React.ReactNode;
  included: boolean;
}
