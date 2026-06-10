export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  initials: string;
}

export const doctors: Doctor[] = [
  {
    id: 'dr-sharma',
    name: 'Dr. Rajesh Sharma',
    specialty: 'Paediatrics & Neonatology',
    initials: 'RS',
  },
  {
    id: 'dr-singh',
    name: 'Dr. Priya Singh',
    specialty: 'Paediatric Surgery',
    initials: 'PS',
  },
  {
    id: 'dr-kumar',
    name: 'Dr. Anil Kumar',
    specialty: 'Critical Care & ICU',
    initials: 'AK',
  },
  {
    id: 'dr-verma',
    name: 'Dr. Sunita Verma',
    specialty: 'Obstetrics & Gynaecology',
    initials: 'SV',
  },
  {
    id: 'dr-gupta',
    name: 'Dr. Vikram Gupta',
    specialty: 'Orthopaedics',
    initials: 'VG',
  },
  {
    id: 'dr-agarwal',
    name: 'Dr. Meena Agarwal',
    specialty: 'General Medicine',
    initials: 'MA',
  },
];
