'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { Search, X, Leaf, Wheat, ImageOff } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

// =============================================================================
// TYPES
// =============================================================================

export interface MenuItemData {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
}

export interface CategoryData {
  id: string;
  name: string;
  description: string | null;
  items: MenuItemData[];
}

export interface MenuClientProps {
  categories: CategoryData[];
  currency?: string;
}

// =============================================================================
// ITEM CARD COMPONENT
// =============================================================================

function ItemCard({ item, currency }: { item: MenuItemData; currency: string }) {
  const [imageError, setImageError] = useState(false);

  return (
    <article
      className={cn(
        'group relative bg-card rounded-xl border shadow-sm overflow-hidden transition-all duration-200',
        'hover:shadow-md hover:border-primary/20',
        !item.isAvailable && 'opacity-60'
      )}
    >
      <div className="flex gap-3 p-3 sm:p-4">
        {/* Image */}
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-lg overflow-hidden bg-muted">
          {item.imageUrl && !imageError ? (
            <Image
              src={item.imageUrl}
              alt={item.name}
              fill
              sizes="(max-width: 640px) 80px, 96px"
              className="object-cover"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <ImageOff className="h-6 w-6" />
            </div>
          )}
          {!item.isAvailable && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
              <Badge variant="secondary" className="text-xs">
                Indisponible
              </Badge>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm sm:text-base leading-tight">
              {item.name}
            </h3>
            <span
              className="font-bold text-sm sm:text-base whitespace-nowrap shrink-0"
              style={{ color: 'var(--brand-accent, hsl(var(--primary)))' }}
            >
              {formatCurrency(item.price, currency)}
            </span>
          </div>

          {item.description && (
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mt-1">
              {item.description}
            </p>
          )}

          {/* Dietary badges */}
          <div className="flex flex-wrap items-center gap-1.5 mt-auto pt-2">
            {item.isVegetarian && (
              <Badge variant="success" className="gap-1 text-xs py-0">
                <Leaf className="h-3 w-3" />
                <span className="hidden sm:inline">Végétarien</span>
                <span className="sm:hidden">Végé</span>
              </Badge>
            )}
            {item.isVegan && (
              <Badge variant="success" className="gap-1 text-xs py-0">
                <Leaf className="h-3 w-3" />
                Végan
              </Badge>
            )}
            {item.isGlutenFree && (
              <Badge variant="outline" className="gap-1 text-xs py-0">
                <Wheat className="h-3 w-3" />
                <span className="hidden sm:inline">Sans gluten</span>
                <span className="sm:hidden">SG</span>
              </Badge>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

// =============================================================================
// CATEGORY SECTION COMPONENT
// =============================================================================

function CategorySection({
  category,
  items,
  currency,
}: {
  category: { id: string; name: string; description: string | null };
  items: MenuItemData[];
  currency: string;
}) {
  if (items.length === 0) return null;

  return (
    <section
      id={`category-${category.id}`}
      className="scroll-mt-32"
      aria-labelledby={`category-heading-${category.id}`}
    >
      <header className="mb-4">
        <h2
          id={`category-heading-${category.id}`}
          className="text-xl sm:text-2xl font-bold tracking-tight"
        >
          {category.name}
        </h2>
        {category.description && (
          <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
        )}
      </header>

      <div className="grid gap-3 sm:gap-4">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} currency={currency} />
        ))}
      </div>
    </section>
  );
}

// =============================================================================
// CATEGORY NAV COMPONENT
// =============================================================================

function CategoryNav({
  categories,
  activeId,
  onSelect,
}: {
  categories: CategoryData[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  const navRef = useRef<HTMLDivElement>(null);

  // Auto-scroll active chip into view
  useEffect(() => {
    if (!activeId || !navRef.current) return;
    const activeChip = navRef.current.querySelector(`[data-category-id="${activeId}"]`);
    if (activeChip) {
      activeChip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeId]);

  return (
    <nav
      ref={navRef}
      className="flex gap-2 overflow-x-auto scrollbar-hide py-1 px-1 -mx-1"
      aria-label="Catégories du menu"
    >
      {categories.map((cat) => (
        <button
          key={cat.id}
          data-category-id={cat.id}
          onClick={() => onSelect(cat.id)}
          className={cn(
            'shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            activeId === cat.id
              ? 'text-white shadow-sm'
              : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
          )}
          style={activeId === cat.id ? { backgroundColor: 'var(--brand-accent, hsl(var(--primary)))' } : undefined}
          aria-current={activeId === cat.id ? 'true' : undefined}
        >
          {cat.name}
        </button>
      ))}
    </nav>
  );
}

// =============================================================================
// SEARCH BAR COMPONENT
// =============================================================================

function SearchBar({
  value,
  onChange,
  onClear,
  resultCount,
}: {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  resultCount: number;
}) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        type="search"
        placeholder="Rechercher un plat..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10 pr-10 h-11 rounded-full bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary"
        aria-label="Rechercher dans le menu"
      />
      {value && (
        <button
          onClick={onClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
          aria-label="Effacer la recherche"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
      {value && (
        <div className="absolute -bottom-5 left-0 text-xs text-muted-foreground">
          {resultCount} résultat{resultCount !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN MENU CLIENT COMPONENT
// =============================================================================

export function MenuClient({ categories, currency = 'CAD' }: MenuClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(
    categories[0]?.id ?? null
  );

  // Refs for IntersectionObserver
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Filter items based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;

    const query = searchQuery.toLowerCase().trim();
    return categories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (item) =>
            item.name.toLowerCase().includes(query) ||
            (item.description?.toLowerCase().includes(query) ?? false)
        ),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [categories, searchQuery]);

  // Count total results
  const totalResults = useMemo(
    () => filteredCategories.reduce((acc, cat) => acc + cat.items.length, 0),
    [filteredCategories]
  );

  // Handle smooth scroll to category
  const scrollToCategory = useCallback((categoryId: string) => {
    const element = document.getElementById(`category-${categoryId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setActiveCategory(categoryId);
    setSearchQuery(''); // Clear search when navigating
  }, []);

  // Setup IntersectionObserver for active category tracking
  useEffect(() => {
    // Only observe when not searching
    if (searchQuery.trim()) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Find the first visible category
        const visibleEntries = entries.filter((entry) => entry.isIntersecting);
        if (visibleEntries.length > 0) {
          // Sort by intersection ratio and pick the most visible
          const mostVisible = visibleEntries.reduce((prev, current) =>
            current.intersectionRatio > prev.intersectionRatio ? current : prev
          );
          const categoryId = mostVisible.target.id.replace('category-', '');
          setActiveCategory(categoryId);
        }
      },
      {
        rootMargin: '-100px 0px -60% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    // Observe all category sections
    categories.forEach((cat) => {
      const element = document.getElementById(`category-${cat.id}`);
      if (element) {
        observerRef.current?.observe(element);
        sectionRefs.current.set(cat.id, element);
      }
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [categories, searchQuery]);

  // Determine which categories to show in nav (filtered or all)
  const navCategories = searchQuery.trim() ? filteredCategories : categories;

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="relative">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          onClear={() => setSearchQuery('')}
          resultCount={totalResults}
        />
      </div>

      {/* Sticky category navigation */}
      {navCategories.length > 0 && (
        <div className="sticky top-14 z-40 -mx-4 px-4 py-3 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 border-b">
          <CategoryNav
            categories={navCategories}
            activeId={activeCategory}
            onSelect={scrollToCategory}
          />
        </div>
      )}

      {/* Menu sections */}
      <div className="space-y-10 pb-8">
        {filteredCategories.length > 0 ? (
          filteredCategories.map((cat) => (
            <CategorySection
              key={cat.id}
              category={cat}
              items={cat.items}
              currency={currency}
            />
          ))
        ) : searchQuery.trim() ? (
          <div className="text-center py-12">
            <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-1">Aucun résultat</h3>
            <p className="text-muted-foreground text-sm">
              Aucun plat ne correspond à &quot;{searchQuery}&quot;
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-4 text-primary hover:underline text-sm font-medium"
            >
              Effacer la recherche
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// =============================================================================
// LOADING SKELETON
// =============================================================================

export function MenuSkeleton() {
  return (
    <div className="space-y-6">
      {/* Search skeleton */}
      <div className="h-11 bg-muted/50 rounded-full animate-pulse" />

      {/* Category nav skeleton */}
      <div className="flex gap-2 overflow-hidden py-3 border-b">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-9 w-24 bg-muted rounded-full animate-pulse shrink-0"
          />
        ))}
      </div>

      {/* Category sections skeleton */}
      {[1, 2, 3].map((section) => (
        <div key={section} className="space-y-4">
          <div className="h-7 w-40 bg-muted rounded animate-pulse" />
          <div className="grid gap-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="flex gap-3 p-3 bg-card rounded-xl border"
              >
                <div className="w-20 h-20 bg-muted rounded-lg animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-full bg-muted rounded animate-pulse" />
                  <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// EMPTY STATE
// =============================================================================

export function MenuEmptyState({
  title = 'Menu en préparation',
  description = 'Notre carte sera bientôt disponible. Revenez nous voir !',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
        <Search className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-muted-foreground max-w-sm">{description}</p>
    </div>
  );
}
