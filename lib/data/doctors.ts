export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  initials: string;
  specialtyKey: string;
}

export const doctors: Doctor[] = [
  {
    id: 'dr-sharma',
    name: 'Dr. Rajesh Sharma',
    specialty: 'Paediatrics & Neonatology',
    initials: 'RS',
    specialtyKey: 'paediatrics',
  },
  {
    id: 'dr-singh',
    name: 'Dr. Priya Singh',
    specialty: 'Paediatric Surgery',
    initials: 'PS',
    specialtyKey: 'paediatricSurgery',
  },
  {
    id: 'dr-kumar',
    name: 'Dr. Anil Kumar',
    specialty: 'Critical Care & ICU',
    initials: 'AK',
    specialtyKey: 'criticalCare',
  },
  {
    id: 'dr-verma',
    name: 'Dr. Sunita Verma',
    specialty: 'Obstetrics & Gynaecology',
    initials: 'SV',
    specialtyKey: 'obstetrics',
  },
  {
    id: 'dr-gupta',
    name: 'Dr. Vikram Gupta',
    specialty: 'Orthopaedics',
    initials: 'VG',
    specialtyKey: 'orthopaedics',
  },
  {
    id: 'dr-agarwal',
    name: 'Dr. Meena Agarwal',
    specialty: 'General Medicine',
    initials: 'MA',
    specialtyKey: 'generalMedicine',
  },
];
