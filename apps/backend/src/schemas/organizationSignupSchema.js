const { z } = require('zod');
const { validateCuiChecksum } = require('../services/vatValidationService');
const { isValidSector } = require('../constants/activitySectors');

const safeString = (maxLen = 500) =>
  z
    .string()
    .max(maxLen)
    .transform((value) => value.trim());

const emailSchema = z
  .string()
  .min(1, 'Email-ul este obligatoriu')
  .max(254)
  .email('Adresa de email nu este valida')
  .transform((value) => value.trim().toLowerCase());

const phoneSchema = z
  .string()
  .min(1, 'Numarul de telefon este obligatoriu')
  .max(20)
  .regex(
    /^(\+?4?0?\s?)?(2\d{2}|3\d{2}|7\d{2})\s?\d{3}\s?\d{3,4}$/,
    'Numarul de telefon nu este valid (format RO asteptat, ex: 0712345678 sau +40712345678)'
  )
  .transform((value) => value.replace(/\s+/g, ''));

const optionalPhoneSchema = z
  .string()
  .max(20)
  .regex(
    /^(\+?4?0?\s?)?(2\d{2}|3\d{2}|7\d{2})\s?\d{3}\s?\d{3,4}$/,
    'Numarul de telefon nu este valid (format RO asteptat, ex: 0712345678 sau +40712345678)'
  )
  .transform((value) => value.replace(/\s+/g, ''))
  .optional()
  .or(z.literal(''));

const signupSchema = z
  .object({
    organizationName: safeString(200).pipe(
      z.string().min(2, 'Numele organizatiei trebuie sa aiba minim 2 caractere')
    ),
    slug: z
      .string()
      .min(3, 'Slug-ul trebuie sa aiba minim 3 caractere')
      .max(63, 'Slug-ul trebuie sa aiba maxim 63 caractere')
      .regex(/^[a-z0-9-]+$/, 'Slug-ul poate contine doar litere mici, cifre si cratime')
      .regex(/^[a-z0-9]/, 'Slug-ul trebuie sa inceapa cu o litera sau cifra')
      .regex(/[a-z0-9]$/, 'Slug-ul trebuie sa se termine cu o litera sau cifra')
      .refine((value) => !value.includes('--'), 'Slug-ul nu poate contine cratime consecutive'),
    email: emailSchema,
    password: z
      .string()
      .min(8, 'Parola trebuie sa aiba minim 8 caractere')
      .max(128, 'Parola poate avea maxim 128 caractere'),
    firstName: safeString(100).pipe(z.string().min(1, 'Prenumele este obligatoriu')),
    lastName: safeString(100).pipe(z.string().min(1, 'Numele este obligatoriu')),
    phoneNumber: optionalPhoneSchema,
    activitySector: z.string().refine((value) => isValidSector(value), {
      message: 'Domeniul de activitate este invalid',
    }),
    plan: z.enum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE']).default('PROFESSIONAL'),
    vatNumber: safeString(20).pipe(z.string().min(1, 'CUI-ul este obligatoriu')),
    companyAddress: safeString(500).pipe(z.string().min(1, 'Adresa companiei este obligatorie')),
    companyEmail: emailSchema,
    companyPhone: phoneSchema,
    entityType: z.enum(['SRL', 'PFA'], {
      errorMap: () => ({ message: 'Tipul entitatii trebuie sa fie SRL sau PFA' }),
    }),
    registrationNumber: safeString(50).optional().or(z.literal('')),
    cnp: z
      .string()
      .max(13)
      .regex(/^(\d{13})?$/, 'CNP-ul trebuie sa aiba exact 13 cifre')
      .optional()
      .or(z.literal('')),
  })
  .strict()
  .superRefine((data, context) => {
    const checksumResult = validateCuiChecksum(data.vatNumber);
    if (!checksumResult.valid) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: checksumResult.error,
        path: ['vatNumber'],
      });
    }
  });

const slugSchema = z.object({
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .max(63, 'Slug must be at most 63 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .regex(/^[a-z0-9]/, 'Slug must start with a letter or number')
    .regex(/[a-z0-9]$/, 'Slug must end with a letter or number')
    .refine((value) => !value.includes('--'), 'Slug cannot contain consecutive hyphens'),
});

module.exports = {
  signupSchema,
  slugSchema,
};
