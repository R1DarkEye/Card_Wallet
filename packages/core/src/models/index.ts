import { z } from 'zod';

export const CardTypeSchema = z.enum(['aadhaar', 'passport', 'credit', 'debit', 'driving_licence', 'generic']);
export type CardType = z.infer<typeof CardTypeSchema>;

export const BaseCardSchema = z.object({
  id: z.string().uuid(),
  type: CardTypeSchema,
  nickname: z.string().min(1, 'Nickname is required'),
  createdAt: z.string(),
  updatedAt: z.string(),
  deviceId: z.string(),
  syncStatus: z.enum(['pending', 'synced', 'conflict']),
  frontImageId: z.string().optional(),
  backImageId: z.string().optional(),
});

export const AadhaarSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  aadhaarNumber: z.string().regex(/^\d{12}$/, 'Aadhaar must be 12 digits'),
  dob: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Use DD/MM/YYYY format'),
  gender: z.enum(['male', 'female', 'other']),
  address: z.string().min(5, 'Address is too short'),
  vid: z.string().optional(),
});

export const PassportSchema = z.object({
  type: z.string().regex(/^[A-Z]$/, 'Type must be a single letter (usually P)'),
  countryCode: z.string().regex(/^[A-Z]{3}$/, 'Country code must be 3 letters (e.g. IND)'),
  passportNumber: z.string().regex(/^[A-Z][0-9]{7,8}$/, 'Passport number must be 1 letter followed by 7-8 digits'),
  surname: z.string().regex(/^[A-Z\s]+$/i, 'Surname must only contain letters'),
  givenNames: z.string().regex(/^[A-Z\s]+$/i, 'Given names must only contain letters'),
  nationality: z.string().min(2),
  dob: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Use DD/MM/YYYY format'),
  sex: z.enum(['M', 'F', 'X']),
  placeOfBirth: z.string().min(1),
  placeOfIssue: z.string().min(1),
  dateOfIssue: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Use DD/MM/YYYY format'),
  dateOfExpiry: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Use DD/MM/YYYY format'),
});

export const PaymentCardSchema = z.object({
  cardholderName: z.string().min(2, 'Name is required'),
  cardNumber: z.string().regex(/^\d{13,19}$/, 'Invalid card number'),
  expiry: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Use MM/YY format'),
  cvv: z.string().regex(/^\d{3,4}$/, 'Invalid CVV'),
  bankName: z.string().min(1, 'Bank name is required'),
  network: z.enum(['visa', 'mastercard', 'rupay', 'amex', 'other']),
});

export const DrivingLicenceSchema = z.object({
  name: z.string().min(1),
  licenceNumber: z.string().min(5),
  dob: z.string(),
  address: z.string(),
  issueDate: z.string(),
  expiryDate: z.string(),
  issuingRTO: z.string(),
  vehicleClasses: z.array(z.string()),
});

export type BaseCard = z.infer<typeof BaseCardSchema>;
export type AadhaarCard = BaseCard & z.infer<typeof AadhaarSchema> & { type: 'aadhaar' };
export type PassportCard = BaseCard & z.infer<typeof PassportSchema> & { type: 'passport' };
export type PaymentCard = BaseCard & z.infer<typeof PaymentCardSchema> & { type: 'credit' | 'debit' };
export type DrivingLicence = BaseCard & z.infer<typeof DrivingLicenceSchema> & { type: 'driving_licence' };
export type GenericCard = BaseCard & { type: 'generic', title: string; fields: { label: string; value: string }[] };

export type AnyCard = AadhaarCard | PassportCard | PaymentCard | DrivingLicence | GenericCard;

export const CardSchemas = {
  aadhaar: AadhaarSchema,
  passport: PassportSchema,
  credit: PaymentCardSchema,
  debit: PaymentCardSchema,
  driving_licence: DrivingLicenceSchema,
};
