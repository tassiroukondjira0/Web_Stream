/**
 * Liste des catégories / genres disponibles pour le filtrage du catalogue
 * (films, séries et animés). Chaque catégorie possède un slug utilisé dans
 * l'URL (?categorie=...) et un libellé affiché dans l'interface.
 */

export interface Category {
  slug: string;
  name: string;
}

export const CATEGORIES: Category[] = [
  { slug: "action", name: "Action" },
  { slug: "aventure", name: "Aventure" },
  { slug: "animation", name: "Animation" },
  { slug: "comedie", name: "Comédie" },
  { slug: "drame", name: "Drame" },
  { slug: "horreur", name: "Horreur" },
  { slug: "science-fiction", name: "Science-Fiction" },
  { slug: "fantastique", name: "Fantastique" },
  { slug: "policier", name: "Policier / Thriller" },
  { slug: "romance", name: "Romance" },
  { slug: "documentaire", name: "Documentaire" },
  { slug: "famille", name: "Famille" },
  { slug: "guerre", name: "Guerre" },
  { slug: "histoire", name: "Histoire" },
  { slug: "musique", name: "Musique" },
  { slug: "western", name: "Western" },
];

export function getCategoryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function getAllCategories(): Category[] {
  return CATEGORIES;
}
