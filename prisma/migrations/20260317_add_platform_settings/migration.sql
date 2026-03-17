-- ─── Add PlatformSettings table safely ────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_schema = 'public' AND table_name = 'PlatformSettings') THEN
CREATE TABLE "PlatformSettings" (
                                    id TEXT PRIMARY KEY DEFAULT 'singleton',
                                    "stripeSecretKey" TEXT,
                                    "stripePublishableKey" TEXT,
                                    "stripeWebhookSecret" TEXT,
                                    "priceStarterMonthly" TEXT,
                                    "priceStarterAnnual" TEXT,
                                    "priceProfessionalMonthly" TEXT,
                                    "priceProfessionalAnnual" TEXT,
                                    "priceEnterpriseMonthly" TEXT,
                                    "priceEnterpriseAnnual" TEXT,
                                    "displayPriceStarterMonthly" DECIMAL(10,2),
                                    "displayPriceStarterAnnual" DECIMAL(10,2),
                                    "displayPriceProfessionalMonthly" DECIMAL(10,2),
                                    "displayPriceProfessionalAnnual" DECIMAL(10,2),
                                    "displayPriceEnterpriseMonthly" DECIMAL(10,2),
                                    "displayPriceEnterpriseAnnual" DECIMAL(10,2),
                                    "trialDays" INT DEFAULT 14,
                                    "addonPriceIdClients100" TEXT,
                                    "addonPriceIdClients300" TEXT,
                                    "addonPriceIdAppointments200" TEXT,
                                    "addonPriceIdAppointments500" TEXT,
                                    "addonPriceClients100" INT,
                                    "addonPriceClients300" INT,
                                    "addonPriceAppointments200" INT,
                                    "addonPriceAppointments500" INT,
                                    "createdAt" TIMESTAMP(3) DEFAULT now(),
                                    "updatedAt" TIMESTAMP(3) DEFAULT now()
);
END IF;
END
$$;