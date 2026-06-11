import type { LucideIcon } from 'lucide-react';
import {
  Baby,
  Scissors,
  Activity,
  Stethoscope,
  Bone,
  Heart,
  Pill,
  AlertCircle,
} from 'lucide-react';

export interface Department {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  translationKey: string;
}

export const departments: Department[] = [
  {
    id: 'paediatrics',
    name: 'Paediatrics & Neonatology',
    icon: Baby,
    description: 'Comprehensive care for newborns, infants, and children up to 18 years.',
    translationKey: 'paediatrics',
  },
  {
    id: 'paediatric-surgery',
    name: 'Paediatric Surgery',
    icon: Scissors,
    description: 'Surgical care for children with congenital and acquired conditions.',
    translationKey: 'paediatricSurgery',
  },
  {
    id: 'critical-care',
    name: 'Critical Care & ICU',
    icon: Activity,
    description: '24x7 intensive care unit with advanced life support for critically ill patients.',
    translationKey: 'criticalCare',
  },
  {
    id: 'general-surgery',
    name: 'General Surgery',
    icon: Stethoscope,
    description: 'Expert surgical management of abdominal, gastrointestinal, and trauma conditions.',
    translationKey: 'generalSurgery',
  },
  {
    id: 'orthopaedics',
    name: 'Orthopaedics',
    icon: Bone,
    description: 'Diagnosis and treatment of musculoskeletal disorders, fractures, and joint conditions.',
    translationKey: 'orthopaedics',
  },
  {
    id: 'obstetrics',
    name: 'Obstetrics & Gynaecology',
    icon: Heart,
    description: 'Complete maternity care, delivery services, and women\'s health consultations.',
    translationKey: 'obstetrics',
  },
  {
    id: 'general-medicine',
    name: 'General Medicine',
    icon: Pill,
    description: 'Diagnosis and treatment of a broad range of adult medical conditions.',
    translationKey: 'generalMedicine',
  },
  {
    id: 'emergency',
    name: 'Emergency & Trauma',
    icon: AlertCircle,
    description: 'Round-the-clock emergency care and trauma management.',
    translationKey: 'emergency',
  },
];
