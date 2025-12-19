const { z } = require('zod');

const lineItemSchema = z.object({
  name: z.string().min(1, 'Numele articolului este obligatoriu'),
  description: z.string().optional(),
  quantity: z.number({ invalid_type_error: 'Cantitatea trebuie sa fie un numar' })
    .positive('Cantitatea trebuie sa fie mai mare decat 0')
    .optional(),
  unitPrice: z.number({ invalid_type_error: 'Pretul trebuie sa fie un numar' })
    .nonnegative('Pretul nu poate fi negativ')
    .optional(),
  // New fields for separate hardware/labor tracking
  hardwareQuantity: z.number({ invalid_type_error: 'Cantitatea piese trebuie sa fie un numar' })
    .nonnegative('Cantitatea piese nu poate fi negativa')
    .optional(),
  laborQuantity: z.number({ invalid_type_error: 'Cantitatea manopera trebuie sa fie un numar' })
    .nonnegative('Cantitatea manopera nu poate fi negativa')
    .optional(),
  hardwarePrice: z.number({ invalid_type_error: 'Pretul piese trebuie sa fie un numar' })
    .nonnegative('Pretul piese nu poate fi negativ')
    .optional(),
  laborPrice: z.number({ invalid_type_error: 'Pretul manopera trebuie sa fie un numar' })
    .nonnegative('Pretul manopera nu poate fi negativ')
    .optional(),
  hardwareUnit: z.string().optional(),
  laborUnit: z.string().optional(),
});

const serviceOrderSchema = z.object({
  status: z.string().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  lineItems: z.array(lineItemSchema, { invalid_type_error: 'Lista de articole trebuie sa fie un array' })
    .optional(),
}).optional();

const clientSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['PF', 'SRL'], { errorMap: () => ({ message: 'Tipul clientului trebuie sa fie PF sau SRL' }) }).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  companyName: z.string().optional(),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Adresa de email invalida').optional(),
  vatNumber: z.string().optional(),
  registrationNumber: z.string().optional(),
  notes: z.string().optional(),
  fidelityCardSerie: z.string().optional(),
}).optional();

const vehicleSchema = z.object({
  id: z.string().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.number({ invalid_type_error: 'Anul trebuie sa fie un numar' })
    .int('Anul trebuie sa fie un numar intreg')
    .min(1900, 'Anul trebuie sa fie dupa 1900')
    .max(2100, 'Anul trebuie sa fie inainte de 2100')
    .optional(),
  vin: z.string().optional(),
  plateNumber: z.string().optional(),
  carId: z.string().optional(),
  odometerKm: z.number({ invalid_type_error: 'Kilometrajul trebuie sa fie un numar' })
    .int('Kilometrajul trebuie sa fie un numar intreg')
    .nonnegative('Kilometrajul nu poate fi negativ')
    .optional(),
  color: z.string().optional(),
  notes: z.string().optional(),
}).optional();

// Generic asset schema for the new asset model
const assetSchema = z.object({
  id: z.string().optional(),
  assetType: z.string().optional(), // vehicle, appliance, hvac_unit, equipment, other
  name: z.string().optional(),
  manufacturer: z.string().optional(), // Replaces 'make' for vehicles, 'brand' for others
  model: z.string().optional(),
  year: z.number({ invalid_type_error: 'Anul trebuie sa fie un numar' })
    .int('Anul trebuie sa fie un numar intreg')
    .min(1900, 'Anul trebuie sa fie dupa 1900')
    .max(2100, 'Anul trebuie sa fie inainte de 2100')
    .optional(),
  identifier: z.string().optional(), // Replaces 'plateNumber' for vehicles, 'serialNumber' for others
  metadata: z.record(z.any()).optional(), // Flexible metadata for type-specific fields
  notes: z.string().optional(),
}).optional();

const baseAppointmentSchema = z.object({
  title: z.string().min(1, 'Titlul programarii este obligatoriu'),
  description: z.string().optional(),
  status: z.string().optional(),
  scheduledStart: z.coerce.date({ invalid_type_error: 'Data de inceput invalida' }).optional(),
  scheduledEnd: z.coerce.date({ invalid_type_error: 'Data de sfarsit invalida' }).optional(),
  location: z.string().optional(),
  clientId: z.string().min(1, 'ID-ul clientului este obligatoriu').optional(),
  vehicleId: z.string().min(1, 'ID-ul vehiculului este obligatoriu').optional(),
  assetId: z.string().optional(),
  assigneeIds: z.array(z.string().min(1, 'ID-ul tehnicianului este invalid'), {
    invalid_type_error: 'Lista de tehnicieni trebuie sa fie un array'
  }).optional(),
  metadata: z.record(z.any()).optional(),
  advancePayment: z.number({ invalid_type_error: 'Avansul trebuie sa fie un numar' })
    .nonnegative('Avansul nu poate fi negativ')
    .optional(),
  client: clientSchema,
  vehicle: vehicleSchema,
  asset: assetSchema,
  serviceOrder: serviceOrderSchema,
});

const createAppointmentSchema = baseAppointmentSchema;

const updateAppointmentSchema = baseAppointmentSchema.partial().extend({
  cancellationReason: z.string().optional(),
});

const listAppointmentsQuerySchema = z.object({
  status: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  clientId: z.string().optional(),
  assigneeId: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

const recordPaymentSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
});

module.exports = {
  createAppointmentSchema,
  updateAppointmentSchema,
  listAppointmentsQuerySchema,
  recordPaymentSchema,
};
