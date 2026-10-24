export type StaffGender = 'male' | 'female' | 'other';
export type StaffEmploymentType = 'fulltime' | 'parttime';

export interface Staff {
  id: string;
  organization_id: string;
  code: string;
  full_name: string;
  phone: string;
  email: string;
  birth_date: string | null;
  gender: StaffGender | '';
  address: string;
  position: string;
  employment_type: StaffEmploymentType | '';
  commission_rate: number;
  base_salary: number;
  bank_name: string;
  bank_account_number: string;
  bank_account_holder: string;
  status: 'active' | 'inactive';
  hire_date: string;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
}
