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
}

export const services: Service[] = [
  { id: 'paediatric-care', name: 'Paediatric & Neonatal Care' },
  { id: 'paediatric-surgery', name: 'Paediatric Surgery' },
  { id: 'critical-care', name: 'Critical Care & ICU' },
  { id: 'general-surgery', name: 'General Surgery' },
  { id: 'orthopaedic-care', name: 'Orthopaedic Care' },
  { id: 'maternity-care', name: 'Maternity & Women\'s Health' },
  { id: 'general-medicine', name: 'General Medicine' },
  { id: 'emergency-trauma', name: 'Emergency & Trauma Care' },
];

export interface Facility {
  id: string;
  name: string;
  icon: LucideIcon;
}

export const facilities: Facility[] = [
  { id: 'icu', name: 'Intensive Care Unit (ICU)', icon: Activity },
  { id: 'nicu', name: 'NICU (Neonatal ICU)', icon: Baby },
  { id: 'operation-theatre', name: 'Operation Theatre', icon: Scissors },
  { id: 'emergency', name: '24x7 Emergency', icon: AlertCircle },
  { id: 'laboratory', name: 'Diagnostic Laboratory', icon: FlaskConical },
  { id: 'pharmacy', name: 'Pharmacy', icon: ShoppingBag },
];
