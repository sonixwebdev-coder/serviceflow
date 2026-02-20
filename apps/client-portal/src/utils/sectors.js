import { Car, Scissors, Wrench, Smartphone, Globe } from 'lucide-react';

export const SECTORS = {
  AUTOMOTIVE: {
    label: 'Service Auto',
    icon: Car,
    color: 'blue',
    bgClass: 'bg-blue-100 text-blue-800',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    gradient: 'from-blue-500 to-blue-600',
    lightBg: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: 'Service auto, ITP, vulcanizare, spalatorie',
  },
  BEAUTY: {
    label: 'Frumusete & Ingrijire',
    icon: Scissors,
    color: 'pink',
    bgClass: 'bg-pink-100 text-pink-800',
    iconBg: 'bg-pink-100',
    iconColor: 'text-pink-600',
    gradient: 'from-pink-500 to-pink-600',
    lightBg: 'bg-pink-50',
    borderColor: 'border-pink-200',
    description: 'Frizerie, coafor, makeup, cosmetica, manichiura',
  },
  DIGITAL_SERVICES: {
    label: 'Servicii Digitale',
    icon: Globe,
    color: 'indigo',
    bgClass: 'bg-indigo-100 text-indigo-800',
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    gradient: 'from-indigo-500 to-indigo-600',
    lightBg: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    description: 'Web development, design grafic, marketing digital, consultanta IT',
  },
  HOME_SERVICES: {
    label: 'Servicii la Domiciliu',
    icon: Wrench,
    color: 'orange',
    bgClass: 'bg-orange-100 text-orange-800',
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    gradient: 'from-orange-500 to-orange-600',
    lightBg: 'bg-orange-50',
    borderColor: 'border-orange-200',
    description: 'Instalatii, electricieni, HVAC, reparatii',
  },
  IT_ELECTRONICS: {
    label: 'IT & Electronice',
    icon: Smartphone,
    color: 'purple',
    bgClass: 'bg-purple-100 text-purple-800',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    gradient: 'from-purple-500 to-purple-600',
    lightBg: 'bg-purple-50',
    borderColor: 'border-purple-200',
    description: 'Reparatii telefoane, PC, laptop, electrocasnice',
  },
};

export function getSectorConfig(sectorKey) {
  return SECTORS[sectorKey] || null;
}
