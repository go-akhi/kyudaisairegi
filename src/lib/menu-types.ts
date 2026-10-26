export type MenuOption = {
  id: string;
  name: string;
  priceDeltaYen: number;
};

export type MenuItem = {
  id: string;
  categoryId: string | null;
  name: string;
  description: string;
  priceYen: number;
  imagePath: string | null;
  available: boolean;
  options: MenuOption[];
};

export type MenuCategory = {
  id: string;
  name: string;
  items: MenuItem[];
};
