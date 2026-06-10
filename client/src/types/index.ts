export interface User {
  id: number;
  name: string;
  email: string;
  role: 'superadmin' | 'admin' | 'worker';
  farmId: number | null;
  isActive: boolean;
}

// Derived from dateOfBirth + gender — not stored in DB
export type AnimalCategory = 'Calf' | 'Heifer' | 'Bull' | 'Cow';

export interface Animal {
  id: number;
  name: string;
  tagNumber: string;
  breed: string;
  gender: 'male' | 'female';
  dateOfBirth: string;
  color?: string;
  notes?: string;
  status: 'active' | 'sold' | 'deceased';
  createdAt: string;
  latestBreeding?: {
    serviceDate: string;
    pregnancyStatus: 'pending' | 'pregnant' | 'gave_birth' | 'failed';
    expectedBirthDate?: string | null;
    actualBirthDate?: string | null;
  } | null;
}

export interface MilkRecord {
  id: number;
  animalId: number;
  productionDate: string;
  quantityLiters: number;
  notes?: string;
  animal?: { name: string; tagNumber: string };
}

// Used for bulk milk entry — one row per active animal
export interface BulkMilkRow {
  animalId: number;
  animalName: string;
  tagNumber: string;
  quantityLiters: string; // string so input stays controlled before parsing
  skip: boolean;
}

export interface HealthRecord {
  id: number;
  animalId: number;
  recordDate: string;
  condition: string;
  treatment?: string;
  doctorName?: string;
  vaccination?: string;
  notes?: string;
  animal?: { name: string; tagNumber: string };
}

export interface BreedingRecord {
  id: number;
  animalId: number;
  serviceDate: string;
  bullName?: string;
  expectedBirthDate?: string;
  actualBirthDate?: string;
  pregnancyStatus: 'pending' | 'pregnant' | 'gave_birth' | 'failed';
  notes?: string;
  animal?: { name: string; tagNumber: string };
}

export interface Transaction {
  id: number;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description?: string;
  transactionDate: string;
}

export interface DashboardStats {
  totalAnimals: number;
  femaleAnimals: number;
  maleAnimals: number;
  todayMilk: number;
  monthMilk: number;
  activePregnant: number;
  monthIncome: number;
  monthExpense: number;
  monthProfit: number;
  // New — derived on frontend from animal list if not supplied by API
  totalCalves?: number;
  dueSoon?: number; // calving within 14 days
}

export interface AiSession {
  id: number;
  title: string;
  updatedAt: string;
}

export interface AiMessage {
  id: number;
  role: 'user' | 'assistant';
  message: string;
  createdAt: string;
}

export interface ApiError {
  error: string;
}
