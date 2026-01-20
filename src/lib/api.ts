import type {
  BloodPressureEntry,
  DocumentEntry,
  TemperatureEntry,
  WeightEntry,
} from "@/lib/types";

export async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error("Request failed");
  }
  return response.json() as Promise<T>;
}

export async function getBloodPressure() {
  return fetchJSON<{ data: BloodPressureEntry[] }>("/api/blood-pressure");
}

export async function createBloodPressure(payload: {
  entry_date: string;
  systolic: number;
  diastolic: number;
  notes: string;
}) {
  return fetchJSON<{ data: BloodPressureEntry }>("/api/blood-pressure", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deleteBloodPressure(id: string) {
  return fetchJSON<{ ok: boolean }>(`/api/blood-pressure/${id}`, {
    method: "DELETE",
  });
}

export async function getWeight() {
  return fetchJSON<{ data: WeightEntry[] }>("/api/weight");
}

export async function createWeight(payload: {
  entry_date: string;
  weight: number;
  notes: string;
}) {
  return fetchJSON<{ data: WeightEntry }>("/api/weight", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deleteWeight(id: string) {
  return fetchJSON<{ ok: boolean }>(`/api/weight/${id}`, {
    method: "DELETE",
  });
}

export async function getTemperature() {
  return fetchJSON<{ data: TemperatureEntry[] }>("/api/temperature");
}

export async function createTemperature(payload: {
  entry_date: string;
  temperature: number;
  notes: string;
}) {
  return fetchJSON<{ data: TemperatureEntry }>("/api/temperature", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deleteTemperature(id: string) {
  return fetchJSON<{ ok: boolean }>(`/api/temperature/${id}`, {
    method: "DELETE",
  });
}

export async function getDocuments() {
  return fetchJSON<{ data: DocumentEntry[] }>("/api/documents");
}

export async function uploadDocument(payload: {
  entry_date: string;
  doc_type: string;
  notes: string;
  file: File;
}) {
  const formData = new FormData();
  formData.append("entry_date", payload.entry_date);
  formData.append("doc_type", payload.doc_type);
  formData.append("notes", payload.notes);
  formData.append("file", payload.file);

  const response = await fetch("/api/documents", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Upload failed");
  }

  return response.json() as Promise<{ data: DocumentEntry }>;
}

export async function deleteDocument(id: string) {
  return fetchJSON<{ ok: boolean }>(`/api/documents/${id}`, {
    method: "DELETE",
  });
}

export async function getSummary() {
  return fetchJSON<{ data: { bp: number; weight: number; temp: number; docs: number } }>(
    "/api/summary"
  );
}
