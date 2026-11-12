import type { OrganKey } from './types';

/** İçine girilebilen organlar (anatomyData id'leri ile aynı). */
export const INTERIOR_IDS: readonly OrganKey[] = ['heart', 'lungs', 'stomach'];

export const hasInterior = (id: string): id is OrganKey => (INTERIOR_IDS as readonly string[]).includes(id);
