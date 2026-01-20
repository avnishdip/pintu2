export type BloodPressureEntry = {
  id: string;
  entry_date: string;
  systolic: number;
  diastolic: number;
  notes: string | null;
};

export type WeightEntry = {
  id: string;
  entry_date: string;
  weight: string;
  notes: string | null;
};

export type TemperatureEntry = {
  id: string;
  entry_date: string;
  temperature: string;
  notes: string | null;
};

export type DocumentEntry = {
  id: string;
  entry_date: string;
  doc_type: string;
  file_name: string;
  file_url: string;
  file_size: string;
  notes: string | null;
};
