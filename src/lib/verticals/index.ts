/**
 * Vertical Signal Engine - Registry
 *
 * Central registry for all industry-specific verticals.
 * To add a new vertical:
 * 1. Create a config file (e.g., workplace.ts)
 * 2. Import and add to VERTICALS map below
 * 3. The endpoint /api/v1/assess/:vertical automatically works
 */

import { VerticalConfig, VerticalListItem } from './types';
import { gamblingVertical } from './gambling';

// Registry of all available verticals
const VERTICALS: Map<string, VerticalConfig> = new Map([
  [gamblingVertical.slug, gamblingVertical],
  // Add new verticals here:
  // [workplaceVertical.slug, workplaceVertical],
  // [insuranceVertical.slug, insuranceVertical],
]);

/**
 * Get a vertical config by slug
 */
export function getVertical(slug: string): VerticalConfig | null {
  return VERTICALS.get(slug) || null;
}

/**
 * Check if a vertical exists
 */
export function hasVertical(slug: string): boolean {
  return VERTICALS.has(slug);
}

/**
 * Get list of all available verticals (for discovery endpoint)
 */
export function listVerticals(): VerticalListItem[] {
  const list: VerticalListItem[] = [];

  VERTICALS.forEach((config) => {
    list.push({
      slug: config.slug,
      name: config.name,
      description: config.description,
      signal_count: config.signals.length,
    });
  });

  return list.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get all vertical slugs
 */
export function getVerticalSlugs(): string[] {
  return Array.from(VERTICALS.keys());
}

// Re-export types
export * from './types';
