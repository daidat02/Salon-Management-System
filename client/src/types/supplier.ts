export interface Supplier {
  id: string;
  organization_id: string;
  name: string;
  phone: string | null;
  address: string | null;
  note: string | null;
  created_at: string | null;
}

export type CreateSupplierPayload = {
  name: string;
  phone?: string | null;
  address?: string | null;
  note?: string | null;
};
