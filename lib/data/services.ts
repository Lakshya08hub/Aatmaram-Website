import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Baby,
  Scissors,
  AlertCircle,
  FlaskConical,
  ShoppingBag,
} from 'lucide-react';

export interface Service {
  id: string;
  name: string;
  translationKey: string;
}

export const services: Service[] = [
  { id: 'paediatric-care', name: 'Paediatric & Neonatal Care', translationKey: 'paediatricCare' },
  { id: 'paediatric-surgery', name: 'Paediatric Surgery', translationKey: 'paediatricSurgery' },
  { id: 'critical-care', name: 'Critical Care & ICU', translationKey: 'criticalCare' },
  { id: 'general-surgery', name: 'General Surgery', translationKey: 'generalSurgery' },
  { id: 'orthopaedic-care', name: 'Orthopaedic Care', translationKey: 'orthopaedicCare' },
  { id: 'maternity-care', name: 'Maternity & Women\'s Health', translationKey: 'maternityCare' },
  { id: 'general-medicine', name: 'General Medicine', translationKey: 'generalMedicine' },
  { id: 'emergency-trauma', name: 'Emergency & Trauma Care', translationKey: 'emergencyTrauma' },
];

export interface Facility {
  id: string;
  name: string;
  translationKey: string;
  icon: LucideIcon;
}

export const facilities: Facility[] = [
  { id: 'icu', name: 'Intensive Care Unit (ICU)', translationKey: 'icu', icon: Activity },
  { id: 'nicu', name: 'NICU (Neonatal ICU)', translationKey: 'nicu', icon: Baby },
  { id: 'operation-theatre', name: 'Operation Theatre', translationKey: 'operationTheatre', icon: Scissors },
  { id: 'emergency', name: '24x7 Emergency', translationKey: 'emergency', icon: AlertCircle },
  { id: 'laboratory', name: 'Diagnostic Laboratory', translationKey: 'laboratory', icon: FlaskConical },
  { id: 'pharmacy', name: 'Pharmacy', translationKey: 'pharmacy', icon: ShoppingBag },
];
