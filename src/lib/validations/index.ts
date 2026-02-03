import { z } from 'zod';

// =============================================================================
// COMMON SCHEMAS
// =============================================================================

export const idSchema = z.string().cuid();

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

// =============================================================================
// AUTH SCHEMAS
// =============================================================================

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'L\'email est requis')
    .email('Email invalide')
    .transform((v) => v.toLowerCase().trim()),
  password: z
    .string()
    .min(1, 'Le mot de passe est requis')
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
});

export const passwordSchema = z
  .string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
  .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
  .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
  .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre')
  .regex(
    /[!@#$%^&*(),.?":{}|<>]/,
    'Le mot de passe doit contenir au moins un caractère spécial'
  );

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Le mot de passe actuel est requis'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'La confirmation est requise'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'L\'email est requis')
    .email('Email invalide')
    .transform((v) => v.toLowerCase().trim()),
});

// Strong password for reset (min 10 chars)
export const strongPasswordSchema = z
  .string()
  .min(10, 'Le mot de passe doit contenir au moins 10 caractères')
  .regex(/[A-Za-z]/, 'Le mot de passe doit contenir au moins une lettre')
  .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre');

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Le token est requis'),
    newPassword: strongPasswordSchema,
    confirmPassword: z.string().min(1, 'La confirmation est requise'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

// =============================================================================
// USER SCHEMAS
// =============================================================================

export const createUserSchema = z.object({
  email: z
    .string()
    .min(1, 'L\'email est requis')
    .email('Email invalide')
    .transform((v) => v.toLowerCase().trim()),
  name: z.string().min(1, 'Le nom est requis').max(100, 'Nom trop long'),
  password: passwordSchema,
  role: z.enum(['OWNER', 'STAFF']).default('STAFF'),
});

export const updateUserSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(100, 'Nom trop long').optional(),
  email: z
    .string()
    .email('Email invalide')
    .transform((v) => v.toLowerCase().trim())
    .optional(),
  role: z.enum(['OWNER', 'STAFF']).optional(),
});

// =============================================================================
// MENU SCHEMAS
// =============================================================================

export const createMenuSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(100, 'Nom trop long'),
  description: z.string().max(500, 'Description trop longue').optional().nullable(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const updateMenuSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(100, 'Nom trop long').optional(),
  description: z.string().max(500, 'Description trop longue').optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

// =============================================================================
// CATEGORY SCHEMAS
// =============================================================================

export const createCategorySchema = z.object({
  menuId: z.string().cuid('Menu invalide'),
  name: z.string().min(1, 'Le nom est requis').max(100, 'Nom trop long'),
  description: z.string().max(500, 'Description trop longue').optional().nullable(),
  imageUrl: z.string().url('URL invalide').optional().nullable(),
  sortOrder: z.number().int().default(0),
});

export const updateCategorySchema = z.object({
  menuId: z.string().cuid('Menu invalide').optional(),
  name: z.string().min(1, 'Le nom est requis').max(100, 'Nom trop long').optional(),
  description: z.string().max(500, 'Description trop longue').optional().nullable(),
  imageUrl: z.string().url('URL invalide').optional().nullable(),
  sortOrder: z.number().int().optional(),
});

// =============================================================================
// ITEM SCHEMAS
// =============================================================================

export const createItemSchema = z.object({
  categoryId: z.string().cuid('Catégorie invalide'),
  name: z.string().min(1, 'Le nom est requis').max(100, 'Nom trop long'),
  description: z.string().max(1000, 'Description trop longue').optional().nullable(),
  price: z
    .number()
    .positive('Le prix doit être positif')
    .max(99999.99, 'Prix trop élevé'),
  imageUrl: z.string().url('URL invalide').optional().nullable(),
  isAvailable: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  isVegetarian: z.boolean().default(false),
  isVegan: z.boolean().default(false),
  isGlutenFree: z.boolean().default(false),
  allergens: z.string().max(500, 'Trop long').optional().nullable(),
});

export const updateItemSchema = z.object({
  categoryId: z.string().cuid('Catégorie invalide').optional(),
  name: z.string().min(1, 'Le nom est requis').max(100, 'Nom trop long').optional(),
  description: z.string().max(1000, 'Description trop longue').optional().nullable(),
  price: z
    .number()
    .positive('Le prix doit être positif')
    .max(99999.99, 'Prix trop élevé')
    .optional(),
  imageUrl: z.string().url('URL invalide').optional().nullable(),
  isAvailable: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  isVegetarian: z.boolean().optional(),
  isVegan: z.boolean().optional(),
  isGlutenFree: z.boolean().optional(),
  allergens: z.string().max(500, 'Trop long').optional().nullable(),
});

export const toggleAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
});

// =============================================================================
// ZONE SCHEMAS
// =============================================================================

export const slugSchema = z
  .string()
  .min(2, 'Le slug doit contenir au moins 2 caractères')
  .max(30, 'Le slug doit contenir au maximum 30 caractères')
  .regex(
    /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/,
    'Le slug ne peut contenir que des lettres minuscules, chiffres et tirets'
  );

export const createZoneSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(100, 'Nom trop long'),
  slug: slugSchema.optional(), // Generated from name if not provided
  description: z.string().max(500, 'Description trop longue').optional().nullable(),
});

export const updateZoneSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(100, 'Nom trop long').optional(),
  slug: slugSchema.optional(),
  description: z.string().max(500, 'Description trop longue').optional().nullable(),
});

// =============================================================================
// QR CODE SCHEMAS
// =============================================================================

export const createQrCodeSchema = z.object({
  zoneId: z.string().cuid('Zone invalide').optional().nullable(),
  label: z.string().min(1, 'Le label est requis').max(100, 'Label trop long'),
  targetPath: z.string().max(500, 'Chemin trop long').default('/'),
});

export const updateQrCodeSchema = z.object({
  zoneId: z.string().cuid('Zone invalide').optional().nullable(),
  label: z.string().min(1, 'Le label est requis').max(100, 'Label trop long').optional(),
  targetPath: z.string().max(500, 'Chemin trop long').optional(),
});

// =============================================================================
// TENANT / SETTINGS SCHEMAS
// =============================================================================

export const updateTenantSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(100, 'Nom trop long').optional(),
});

// Aliases for backwards compatibility
export const menuUpdateSchema = updateMenuSchema;
export const categoryUpdateSchema = updateCategorySchema;
export const itemUpdateSchema = updateItemSchema;
export const zoneUpdateSchema = updateZoneSchema;
export const qrCodeUpdateSchema = updateQrCodeSchema;
export const tenantSettingsSchema = updateTenantSchema;

// Create aliases
export const menuCreateSchema = createMenuSchema;
export const categoryCreateSchema = createCategorySchema;
export const itemCreateSchema = createItemSchema;
export const zoneCreateSchema = createZoneSchema;
export const qrCodeCreateSchema = createQrCodeSchema;
export const userCreateSchema = createUserSchema;
export const userUpdateSchema = updateUserSchema;

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateMenuInput = z.infer<typeof createMenuSchema>;
export type UpdateMenuInput = z.infer<typeof updateMenuSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type CreateZoneInput = z.infer<typeof createZoneSchema>;
export type UpdateZoneInput = z.infer<typeof updateZoneSchema>;
export type CreateQrCodeInput = z.infer<typeof createQrCodeSchema>;
export type UpdateQrCodeInput = z.infer<typeof updateQrCodeSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

// =============================================================================
// BRANDING SCHEMAS
// =============================================================================

const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Couleur invalide (format: #RRGGBB)');

const FONT_FAMILIES = ['system', 'inter', 'poppins', 'playfair'] as const;
const fontFamilySchema = z.enum(FONT_FAMILIES, {
  message: 'Police non supportée',
});

export const updateBrandingSchema = z.object({
  logoUrl: z.string().url('URL invalide').optional().nullable(),
  heroImageUrl: z.string().url('URL invalide').optional().nullable(),
  primaryColor: hexColorSchema.optional(),
  secondaryColor: hexColorSchema.optional(),
  accentColor: hexColorSchema.optional(),
  fontFamily: fontFamilySchema.optional(),
  tagline: z.string().max(120, 'Le slogan doit contenir au maximum 120 caractères').optional().nullable(),
});

export type UpdateBrandingInput = z.infer<typeof updateBrandingSchema>;
export type FontFamily = z.infer<typeof fontFamilySchema>;

// =============================================================================
// SIGNUP / REGISTRATION SCHEMAS
// =============================================================================

// Reserved slugs that cannot be used as tenant subdomains
export const RESERVED_SLUGS = [
  'www', 'app', 'api', 'admin', 'static', 'assets', 'cdn',
  'support', 'help', 'demo', 'localhost', 'mail', 'smtp', 'ftp',
  'ns1', 'ns2', 'blog', 'shop', 'store', 'dev', 'staging', 'test',
];

export const tenantSlugSchema = z
  .string()
  .min(3, 'Le slug doit contenir au moins 3 caractères')
  .max(30, 'Le slug doit contenir au maximum 30 caractères')
  .regex(
    /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/,
    'Le slug doit contenir uniquement des lettres minuscules, chiffres et tirets, et ne peut pas commencer ou finir par un tiret'
  )
  .refine(
    (slug) => !RESERVED_SLUGS.includes(slug.toLowerCase()),
    'Ce nom est réservé et ne peut pas être utilisé'
  );

export const registerSchema = z
  .object({
    restaurantName: z
      .string()
      .min(2, 'Le nom du restaurant doit contenir au moins 2 caractères')
      .max(80, 'Le nom du restaurant doit contenir au maximum 80 caractères')
      .transform((v) => v.trim()),
    slug: tenantSlugSchema,
    email: z
      .string()
      .min(1, 'L\'email est requis')
      .email('Email invalide')
      .transform((v) => v.toLowerCase().trim()),
    password: strongPasswordSchema,
    confirmPassword: z.string().min(1, 'La confirmation est requise'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });
