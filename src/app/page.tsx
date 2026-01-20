"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import type {
  BloodPressureEntry,
  DocumentEntry,
  TemperatureEntry,
  WeightEntry,
} from "@/lib/types";
import {
  createBloodPressure,
  createTemperature,
  createWeight,
  deleteBloodPressure,
  deleteDocument,
  deleteTemperature,
  deleteWeight,
  getBloodPressure,
  getDocuments,
  getTemperature,
  getWeight,
  uploadDocument,
} from "@/lib/api";

const today = new Date().toISOString().slice(0, 10);

type NoticeTone = "" | "success" | "error";

export default function Home() {
  const { data: session, status } = useSession();
  const [notice, setNotice] = useState<{ message: string; tone: NoticeTone }>({
    message: "",
    tone: "",
  });
  const [loading, setLoading] = useState(false);
  const [bpEntries, setBpEntries] = useState<BloodPressureEntry[]>([]);
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [tempEntries, setTempEntries] = useState<TemperatureEntry[]>([]);
  const [documents, setDocuments] = useState<DocumentEntry[]>([]);

  const [bpForm, setBpForm] = useState({
    date: today,
    systolic: "",
    diastolic: "",
    notes: "",
  });
  const [weightForm, setWeightForm] = useState({
    date: today,
    value: "",
    notes: "",
  });
  const [tempForm, setTempForm] = useState({
    date: today,
    value: "",
    notes: "",
  });
  const [docForm, setDocForm] = useState({
    date: today,
    type: "",
    notes: "",
    file: null as File | null,
  });

  const [filters, setFilters] = useState({
    bp: { search: "", from: "", to: "" },
    weight: { search: "", from: "", to: "" },
    temp: { search: "", from: "", to: "" },
  });

  const bpChartRef = useRef<HTMLCanvasElement | null>(null);
  const weightChartRef = useRef<HTMLCanvasElement | null>(null);
  const tempChartRef = useRef<HTMLCanvasElement | null>(null);

  const showNotice = useCallback((message: string, tone: NoticeTone) => {
    setNotice({ message, tone });
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [bp, weight, temp, docs] = await Promise.all([
        getBloodPressure(),
        getWeight(),
        getTemperature(),
        getDocuments(),
      ]);
      setBpEntries(bp.data);
      setWeightEntries(weight.data);
      setTempEntries(temp.data);
      setDocuments(docs.data);
    } catch {
      showNotice("Unable to load your data", "error");
    } finally {
      setLoading(false);
    }
  }, [showNotice]);

  const filteredBp = useMemo(
    () => applyEntryFilters(bpEntries, filters.bp, "bp"),
    [bpEntries, filters.bp]
  );
  const filteredWeight = useMemo(
    () => applyEntryFilters(weightEntries, filters.weight, "weight"),
    [weightEntries, filters.weight]
  );
  const filteredTemp = useMemo(
    () => applyEntryFilters(tempEntries, filters.temp, "temp"),
    [tempEntries, filters.temp]
  );

  useEffect(() => {
    if (notice.message) {
      const timer = setTimeout(() => setNotice({ message: "", tone: "" }), 2800);
      return () => clearTimeout(timer);
    }
  }, [notice]);

  useEffect(() => {
    if (status === "authenticated") {
      loadAll();
    }
  }, [status, loadAll]);

  async function handleAddBp() {
    if (!bpForm.date || !bpForm.systolic || !bpForm.diastolic) {
      showNotice("Please enter date and readings", "error");
      return;
    }
    const systolic = Number(bpForm.systolic);
    const diastolic = Number(bpForm.diastolic);
    if (systolic <= 0 || diastolic <= 0) {
      showNotice("Readings must be positive", "error");
      return;
    }
    try {
      const response = await createBloodPressure({
        entry_date: bpForm.date,
        systolic,
        diastolic,
        notes: bpForm.notes,
      });
      setBpEntries((prev) => [response.data, ...prev]);
      setBpForm({ date: today, systolic: "", diastolic: "", notes: "" });
      showNotice("Blood pressure saved", "success");
    } catch {
      showNotice("Unable to save blood pressure", "error");
    }
  }

  async function handleAddWeight() {
    if (!weightForm.date || !weightForm.value) {
      showNotice("Please enter date and weight", "error");
      return;
    }
    const weight = Number(weightForm.value);
    if (weight <= 0) {
      showNotice("Weight must be positive", "error");
      return;
    }
    try {
      const response = await createWeight({
        entry_date: weightForm.date,
        weight,
        notes: weightForm.notes,
      });
      setWeightEntries((prev) => [response.data, ...prev]);
      setWeightForm({ date: today, value: "", notes: "" });
      showNotice("Weight saved", "success");
    } catch {
      showNotice("Unable to save weight", "error");
    }
  }

  async function handleAddTemp() {
    if (!tempForm.date || !tempForm.value) {
      showNotice("Please enter date and temperature", "error");
      return;
    }
    const temperature = Number(tempForm.value);
    if (temperature <= 0) {
      showNotice("Temperature must be positive", "error");
      return;
    }
    try {
      const response = await createTemperature({
        entry_date: tempForm.date,
        temperature,
        notes: tempForm.notes,
      });
      setTempEntries((prev) => [response.data, ...prev]);
      setTempForm({ date: today, value: "", notes: "" });
      showNotice("Temperature saved", "success");
    } catch {
      showNotice("Unable to save temperature", "error");
    }
  }

  async function handleAddDocument() {
    if (!docForm.date || !docForm.type || !docForm.file) {
      showNotice("Please add a file and details", "error");
      return;
    }
    try {
      const response = await uploadDocument({
        entry_date: docForm.date,
        doc_type: docForm.type,
        notes: docForm.notes,
        file: docForm.file,
      });
      setDocuments((prev) => [response.data, ...prev]);
      setDocForm({ date: today, type: "", notes: "", file: null });
      showNotice("Document uploaded", "success");
    } catch {
      showNotice("Unable to upload document", "error");
    }
  }

  async function handleDeleteEntry(
    type: "bp" | "weight" | "temp" | "doc",
    id: string
  ) {
    if (!confirm("Remove this entry?")) return;
    try {
      if (type === "bp") {
        await deleteBloodPressure(id);
        setBpEntries((prev) => prev.filter((entry) => entry.id !== id));
      }
      if (type === "weight") {
        await deleteWeight(id);
        setWeightEntries((prev) => prev.filter((entry) => entry.id !== id));
      }
      if (type === "temp") {
        await deleteTemperature(id);
        setTempEntries((prev) => prev.filter((entry) => entry.id !== id));
      }
      if (type === "doc") {
        await deleteDocument(id);
        setDocuments((prev) => prev.filter((entry) => entry.id !== id));
      }
      showNotice("Entry removed", "success");
    } catch {
      showNotice("Unable to remove entry", "error");
    }
  }

  function updateFilters(
    type: "bp" | "weight" | "temp",
    field: "search" | "from" | "to",
    value: string
  ) {
    setFilters((prev) => ({
      ...prev,
      [type]: { ...prev[type], [field]: value },
    }));
  }

  function clearFilters(type: "bp" | "weight" | "temp") {
    setFilters((prev) => ({
      ...prev,
      [type]: { search: "", from: "", to: "" },
    }));
  }

  const drawCharts = useCallback(() => {
    if (bpChartRef.current) {
      drawLineChart(bpChartRef.current, filteredBp.map((entry) => entry.systolic), filteredBp.map((entry) => entry.diastolic), {
        primary: "#c18f7b",
        secondary: "#8b7765",
      });
    }
    if (weightChartRef.current) {
      drawLineChart(weightChartRef.current, filteredWeight.map((entry) => Number(entry.weight)), [], {
        primary: "#b19075",
      });
    }
    if (tempChartRef.current) {
      drawLineChart(tempChartRef.current, filteredTemp.map((entry) => Number(entry.temperature)), [], {
        primary: "#b48c8c",
      });
    }
  }, [filteredBp, filteredWeight, filteredTemp]);

  useEffect(() => {
    drawCharts();
  }, [drawCharts]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--sand-900)]">
        Loading your space...
      </div>
    );
  }

  if (!session) {
    return (
    <div className="relative min-h-screen flex items-center justify-center px-6">
      <div className="ambient" />
      <div className="relative max-w-xl rounded-[32px] border border-[var(--stroke)] bg-[var(--card)] p-12 text-center shadow-[var(--shadow)] fade-in">

          <p className="text-sm uppercase tracking-[0.32em] text-[var(--sand-700)]">
            Wellness Atelier
          </p>
          <h1 className="mt-4 text-4xl leading-tight text-[var(--ink-900)]">
            A calm ritual for tracking your body’s signals.
          </h1>
          <p className="mt-4 text-base text-[color:var(--sand-700)]">
            Sign in with Google to securely store your entries in the cloud.
          </p>
          <button
            className="mt-8 inline-flex items-center justify-center rounded-full bg-[var(--ink-900)] px-6 py-3 text-sm uppercase tracking-[0.24em] text-[var(--sand-50)] transition hover:opacity-90"
            onClick={() => signIn("google")}
          >
            Continue with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen px-6 pb-24 pt-16">
      <div className="ambient" />
      <div className="relative mx-auto w-full max-w-6xl fade-in">
        <header className="flex flex-col gap-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
          <p className="text-xs uppercase tracking-[0.4em] text-[var(--sand-700)]">
            Wellness Atelier
          </p>
          <h1 className="mt-4 text-4xl leading-tight text-[var(--ink-900)]">
            A calm ritual for tracking your body’s signals.
          </h1>
          <p className="mt-4 text-base text-[color:var(--sand-700)]">
            Sign in with Google to securely store your entries in the cloud.
          </p>
          <div className="mt-6 grid gap-3 text-left text-sm text-[var(--sand-700)]">
            <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--sand-50)] p-4">
              Private by design. Your entries stay tied to your account.
            </div>
            <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--sand-50)] p-4">
              Track trends and documents in one warm, minimal space.
            </div>
          </div>

              <h1 className="mt-4 text-4xl text-[var(--ink-900)] md:text-5xl">
                Your warm, quiet wellness space.
              </h1>
              <p className="mt-4 max-w-xl text-base text-[color:var(--sand-700)]">
                Track blood pressure, weight, temperature, and documents in one
                calm dashboard.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                className="rounded-full border border-[var(--stroke)] bg-[var(--card)] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[var(--sand-700)] hover:bg-[var(--sand-100)]"
                onClick={() => window.print()}
              >
                Print report
              </button>
              <button
                className="rounded-full bg-[var(--ink-900)] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[var(--sand-50)]"
                onClick={() => signOut()}
              >
                Sign out
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 rounded-3xl border border-[var(--stroke)] bg-[var(--card)] p-4 text-xs uppercase tracking-[0.25em] text-[var(--sand-700)]">
            <span>Cloud saved</span>
            <span>Google secure</span>
            <span>Warm pastel UI</span>
          </div>
          {notice.message && (
        <div className={`rounded-full px-6 py-2 text-center text-xs uppercase tracking-[0.2em] ${
                notice.tone === "success"
                  ? "bg-[var(--mint-200)] text-[var(--sand-900)]"
                  : notice.tone === "error"
                    ? "bg-[var(--rose-200)] text-[var(--sand-900)]"
                    : "bg-[var(--sand-200)] text-[var(--sand-900)]"
              }`}
            >
              {notice.message}
            </div>
          )}
        </header>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-[var(--stroke)] bg-[var(--card)] p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--sand-700)]">
              Blood pressure
            </p>
            <p className="mt-3 text-2xl text-[var(--ink-900)]">
              {bpEntries.length}
            </p>
            <p className="text-xs text-[var(--sand-700)]">Entries logged</p>
          </div>
          <div className="rounded-3xl border border-[var(--stroke)] bg-[var(--card)] p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--sand-700)]">
              Weight
            </p>
            <p className="mt-3 text-2xl text-[var(--ink-900)]">
              {weightEntries.length}
            </p>
            <p className="text-xs text-[var(--sand-700)]">Entries logged</p>
          </div>
          <div className="rounded-3xl border border-[var(--stroke)] bg-[var(--card)] p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--sand-700)]">
              Temperature
            </p>
            <p className="mt-3 text-2xl text-[var(--ink-900)]">
              {tempEntries.length}
            </p>
            <p className="text-xs text-[var(--sand-700)]">Entries logged</p>
          </div>
        </div>


        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <SectionCard title="Blood Pressure" icon="♡" accent="var(--clay-300)">
            <FormGroup label="Date">
              <input
                type="date"
                value={bpForm.date}
                onChange={(event) =>
                  setBpForm((prev) => ({ ...prev, date: event.target.value }))
                }
              />
            </FormGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormGroup label="Systolic">
                <input
                  type="number"
                  placeholder="120"
                  value={bpForm.systolic}
                  onChange={(event) =>
                    setBpForm((prev) => ({
                      ...prev,
                      systolic: event.target.value,
                    }))
                  }
                />
              </FormGroup>
              <FormGroup label="Diastolic">
                <input
                  type="number"
                  placeholder="80"
                  value={bpForm.diastolic}
                  onChange={(event) =>
                    setBpForm((prev) => ({
                      ...prev,
                      diastolic: event.target.value,
                    }))
                  }
                />
              </FormGroup>
            </div>
            <FormGroup label="Notes">
              <textarea
                placeholder="how are you feeling?"
                value={bpForm.notes}
                onChange={(event) =>
                  setBpForm((prev) => ({ ...prev, notes: event.target.value }))
                }
              />
            </FormGroup>
            <button className="primary-button" onClick={handleAddBp}>
              Save
            </button>

            <SummaryBlock
              title="Blood pressure overview"
              status={getBPStatus(filteredBp[0])}
              latest={filteredBp[0]
                ? `${filteredBp[0].systolic}/${filteredBp[0].diastolic} mmHg`
                : "No entries yet"}
              average={
                filteredBp.length
                  ? `${average(filteredBp.map((entry) => entry.systolic))}/${average(
                      filteredBp.map((entry) => entry.diastolic)
                    )} mmHg`
                  : "-"
              }
              meta={`${filteredBp.length} entries`}
            />

            <TrendBlock
              latest={formatTrendValue("bp", latestOf(filteredBp))}
              weekly={formatTrendValue("bp", calcAverageRange(filteredBp, 7, "bp"))}
              monthly={formatTrendValue(
                "bp",
                calcAverageRange(filteredBp, 30, "bp")
              )}
            />

            <ChartBlock refProp={bpChartRef} label="Blood pressure chart" />

            <FilterBar
              values={filters.bp}
              onChange={(field, value) => updateFilters("bp", field, value)}
              onClear={() => clearFilters("bp")}
            />

            <HistoryList
              entries={filteredBp}
              emptyLabel="No readings yet"
              renderEntry={(entry) => {
                const status = getBPStatus(entry);
                return (
                  <div className={`history-item ${status.level}`}>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--sand-700)]">
                        {formatDate(entry.entry_date)}
                      </p>
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-base text-[var(--ink-900)]">
                          {entry.systolic}/{entry.diastolic} mmHg
                        </p>
                        <span className={`badge ${status.level}`}>
                          {status.label}
                        </span>
                      </div>
                      {entry.notes && (
                        <p className="text-sm italic text-[var(--sand-700)]">
                          {entry.notes}
                        </p>
                      )}
                    </div>
                    <button
                      className="ghost-button"
                      onClick={() => handleDeleteEntry("bp", entry.id)}
                    >
                      Remove
                    </button>
                  </div>
                );
              }}
            />
          </SectionCard>

          <SectionCard title="Weight" icon="◌" accent="var(--mint-200)">
            <FormGroup label="Date">
              <input
                type="date"
                value={weightForm.date}
                onChange={(event) =>
                  setWeightForm((prev) => ({
                    ...prev,
                    date: event.target.value,
                  }))
                }
              />
            </FormGroup>
            <FormGroup label="Weight (kg)">
              <input
                type="number"
                step="0.1"
                placeholder="60.0"
                value={weightForm.value}
                onChange={(event) =>
                  setWeightForm((prev) => ({
                    ...prev,
                    value: event.target.value,
                  }))
                }
              />
            </FormGroup>
            <FormGroup label="Notes">
              <textarea
                placeholder="any observations?"
                value={weightForm.notes}
                onChange={(event) =>
                  setWeightForm((prev) => ({
                    ...prev,
                    notes: event.target.value,
                  }))
                }
              />
            </FormGroup>
            <button className="primary-button" onClick={handleAddWeight}>
              Save
            </button>

            <SummaryBlock
              title="Weight overview"
              status={{ label: "Trend", level: "ok" }}
              latest={
                filteredWeight[0]
                  ? `${Number(filteredWeight[0].weight).toFixed(1)} kg`
                  : "No entries yet"
              }
              average={
                filteredWeight.length
                  ? `${average(
                      filteredWeight.map((entry) => Number(entry.weight))
                    )} kg`
                  : "-"
              }
              meta={`Δ ${getDelta(filteredWeight.map((entry) => Number(entry.weight)))} kg`}
            />

            <TrendBlock
              latest={formatTrendValue("weight", latestOf(filteredWeight))}
              weekly={formatTrendValue(
                "weight",
                calcAverageRange(filteredWeight, 7, "weight")
              )}
              monthly={formatTrendValue(
                "weight",
                calcAverageRange(filteredWeight, 30, "weight")
              )}
            />

            <ChartBlock refProp={weightChartRef} label="Weight chart" />

            <FilterBar
              values={filters.weight}
              onChange={(field, value) => updateFilters("weight", field, value)}
              onClear={() => clearFilters("weight")}
            />

            <HistoryList
              entries={filteredWeight}
              emptyLabel="No entries yet"
              renderEntry={(entry) => (
                <div className="history-item">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--sand-700)]">
                      {formatDate(entry.entry_date)}
                    </p>
                    <p className="text-base text-[var(--ink-900)]">
                      {Number(entry.weight).toFixed(1)} kg
                    </p>
                    {entry.notes && (
                      <p className="text-sm italic text-[var(--sand-700)]">
                        {entry.notes}
                      </p>
                    )}
                  </div>
                  <button
                    className="ghost-button"
                    onClick={() => handleDeleteEntry("weight", entry.id)}
                  >
                    Remove
                  </button>
                </div>
              )}
            />
          </SectionCard>

          <SectionCard title="Temperature" icon="○" accent="var(--rose-200)">
            <FormGroup label="Date">
              <input
                type="date"
                value={tempForm.date}
                onChange={(event) =>
                  setTempForm((prev) => ({
                    ...prev,
                    date: event.target.value,
                  }))
                }
              />
            </FormGroup>
            <FormGroup label="Temperature (°C)">
              <input
                type="number"
                step="0.1"
                placeholder="36.5"
                value={tempForm.value}
                onChange={(event) =>
                  setTempForm((prev) => ({
                    ...prev,
                    value: event.target.value,
                  }))
                }
              />
            </FormGroup>
            <FormGroup label="Notes">
              <textarea
                placeholder="morning or evening?"
                value={tempForm.notes}
                onChange={(event) =>
                  setTempForm((prev) => ({
                    ...prev,
                    notes: event.target.value,
                  }))
                }
              />
            </FormGroup>
            <button className="primary-button" onClick={handleAddTemp}>
              Save
            </button>

            <SummaryBlock
              title="Temperature overview"
              status={getTempStatus(filteredTemp[0])}
              latest={
                filteredTemp[0]
                  ? `${Number(filteredTemp[0].temperature).toFixed(1)}°C`
                  : "No entries yet"
              }
              average={
                filteredTemp.length
                  ? `${average(
                      filteredTemp.map((entry) => Number(entry.temperature))
                    )}°C`
                  : "-"
              }
              meta={`${filteredTemp.length} entries`}
            />

            <TrendBlock
              latest={formatTrendValue("temp", latestOf(filteredTemp))}
              weekly={formatTrendValue(
                "temp",
                calcAverageRange(filteredTemp, 7, "temp")
              )}
              monthly={formatTrendValue(
                "temp",
                calcAverageRange(filteredTemp, 30, "temp")
              )}
            />

            <ChartBlock refProp={tempChartRef} label="Temperature chart" />

            <FilterBar
              values={filters.temp}
              onChange={(field, value) => updateFilters("temp", field, value)}
              onClear={() => clearFilters("temp")}
            />

            <HistoryList
              entries={filteredTemp}
              emptyLabel="No readings yet"
              renderEntry={(entry) => {
                const status = getTempStatus(entry);
                return (
                  <div className={`history-item ${status.level}`}>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--sand-700)]">
                        {formatDate(entry.entry_date)}
                      </p>
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-base text-[var(--ink-900)]">
                          {Number(entry.temperature).toFixed(1)}°C
                        </p>
                        <span className={`badge ${status.level}`}>
                          {status.label}
                        </span>
                      </div>
                      {entry.notes && (
                        <p className="text-sm italic text-[var(--sand-700)]">
                          {entry.notes}
                        </p>
                      )}
                    </div>
                    <button
                      className="ghost-button"
                      onClick={() => handleDeleteEntry("temp", entry.id)}
                    >
                      Remove
                    </button>
                  </div>
                );
              }}
            />
          </SectionCard>

          <SectionCard title="Documents" icon="◇" accent="var(--sand-200)">
            <FormGroup label="Date">
              <input
                type="date"
                value={docForm.date}
                onChange={(event) =>
                  setDocForm((prev) => ({
                    ...prev,
                    date: event.target.value,
                  }))
                }
              />
            </FormGroup>
            <FormGroup label="Type">
              <input
                type="text"
                placeholder="blood work, scan, prescription..."
                value={docForm.type}
                onChange={(event) =>
                  setDocForm((prev) => ({
                    ...prev,
                    type: event.target.value,
                  }))
                }
              />
            </FormGroup>
            <FormGroup label="Upload">
              <input
                type="file"
                onChange={(event) =>
                  setDocForm((prev) => ({
                    ...prev,
                    file: event.target.files?.[0] || null,
                  }))
                }
              />
            </FormGroup>
            <FormGroup label="Notes">
              <textarea
                placeholder="any details to remember?"
                value={docForm.notes}
                onChange={(event) =>
                  setDocForm((prev) => ({
                    ...prev,
                    notes: event.target.value,
                  }))
                }
              />
            </FormGroup>
            <button className="primary-button" onClick={handleAddDocument}>
              Upload
            </button>

            <HistoryList
              entries={documents}
              emptyLabel="No files yet"
              renderEntry={(entry) => (
                <div className="history-item">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--sand-700)]">
                      {formatDate(entry.entry_date)}
                    </p>
                    <p className="text-base text-[var(--ink-900)]">
                      {entry.doc_type}
                    </p>
                    <p className="text-xs text-[var(--sand-700)]">
                      {entry.file_name}
                    </p>
                    {entry.notes && (
                      <p className="text-sm italic text-[var(--sand-700)]">
                        {entry.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <a
                      className="ghost-button"
                      href={entry.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Download
                    </a>
                    <button
                      className="ghost-button"
                      onClick={() => handleDeleteEntry("doc", entry.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            />
          </SectionCard>
        </div>

        {loading && (
          <p className="mt-8 text-sm text-[var(--sand-700)]">
            Syncing your latest entries...
          </p>
        )}
      </div>
    </div>
  );
}

function SectionCard({
  title,
  icon,
  accent,
  children,
}: {
  title: string;
  icon: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-[var(--stroke)] bg-[var(--card)] p-6 shadow-[var(--shadow)]">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full text-lg"
            style={{ background: accent }}
          >
            {icon}
          </div>
          <h2 className="text-2xl text-[var(--ink-900)]">{title}</h2>
        </div>
        <span className="text-[0.65rem] uppercase tracking-[0.3em] text-[var(--sand-700)]">
          Ritual
        </span>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function FormGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.2em] text-[var(--sand-700)]">
        {label}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function SummaryBlock({
  title,
  status,
  latest,
  average,
  meta,
}: {
  title: string;
  status?: { label: string; level: string };
  latest: string;
  average: string;
  meta: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--sand-50)] p-4">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[var(--sand-700)]">
        <span>{title}</span>
        {status && <span className={`badge ${status.level}`}>{status.label}</span>}
      </div>
      <div className="mt-3 grid gap-3 text-sm text-[var(--ink-900)] sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--sand-700)]">
            Latest
          </p>
          <p className="text-base">{latest}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--sand-700)]">
            Average
          </p>
          <p className="text-base">{average}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--sand-700)]">
            Detail
          </p>
          <p className="text-base">{meta}</p>
        </div>
      </div>
    </div>
  );
}

function TrendBlock({
  latest,
  weekly,
  monthly,
}: {
  latest: string;
  weekly: string;
  monthly: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--stroke)] bg-[var(--sand-100)] p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--sand-700)]">
        Trend summary
      </p>
      <div className="mt-3 grid gap-3 text-sm text-[var(--ink-900)] sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--sand-700)]">
            Latest
          </p>
          <p>{latest}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--sand-700)]">
            7 day avg
          </p>
          <p>{weekly}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--sand-700)]">
            30 day avg
          </p>
          <p>{monthly}</p>
        </div>
      </div>
    </div>
  );
}

function ChartBlock({
  refProp,
  label,
}: {
  refProp: React.RefObject<HTMLCanvasElement | null>;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--sand-50)] p-4">
      <canvas
        ref={refProp}
        className="h-32 w-full"
        aria-label={label}
        role="img"
      />
    </div>
  );
}

function FilterBar({
  values,
  onChange,
  onClear,
}: {
  values: { search: string; from: string; to: string };
  onChange: (field: "search" | "from" | "to", value: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--sand-50)] p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <input
          type="text"
          placeholder="Search notes or values"
          value={values.search}
          onChange={(event) => onChange("search", event.target.value)}
        />
        <input
          type="date"
          value={values.from}
          onChange={(event) => onChange("from", event.target.value)}
        />
        <input
          type="date"
          value={values.to}
          onChange={(event) => onChange("to", event.target.value)}
        />
      </div>
      <button className="ghost-button mt-3" onClick={onClear}>
        Clear filters
      </button>
    </div>
  );
}

function HistoryList<T>({
  entries,
  emptyLabel,
  renderEntry,
}: {
  entries: T[];
  emptyLabel: string;
  renderEntry: (entry: T) => React.ReactNode;
}) {
  if (!entries.length) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--stroke)] bg-[var(--sand-50)] p-6 text-sm italic text-[var(--sand-700)]">
        {emptyLabel}
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {entries.map((entry, index) => (
        <div key={`entry-${index}`}>{renderEntry(entry)}</div>
      ))}
    </div>
  );
}

function applyEntryFilters<T extends BloodPressureEntry | WeightEntry | TemperatureEntry>(
  entries: T[],
  filters: { search: string; from: string; to: string },
  type: "bp" | "weight" | "temp"
): T[] {
  const search = filters.search.trim().toLowerCase();
  const from = filters.from ? new Date(filters.from) : null;
  const to = filters.to ? new Date(filters.to) : null;

  return entries.filter((entry) => {
    const entryDate = new Date(entry.entry_date);
    if (from && entryDate < from) return false;
    if (to && entryDate > to) return false;
    if (!search) return true;
    const text = entryToSearchableText(entry, type);
    return text.includes(search);
  });
}

function entryToSearchableText(
  entry: BloodPressureEntry | WeightEntry | TemperatureEntry,
  type: "bp" | "weight" | "temp"
) {
  if (type === "bp") {
    const bpEntry = entry as BloodPressureEntry;
    return `${bpEntry.systolic} ${bpEntry.diastolic} ${bpEntry.notes ?? ""}`.toLowerCase();
  }
  if (type === "weight") {
    const weightEntry = entry as WeightEntry;
    return `${weightEntry.weight} ${weightEntry.notes ?? ""}`.toLowerCase();
  }
  const tempEntry = entry as TemperatureEntry;
  return `${tempEntry.temperature} ${tempEntry.notes ?? ""}`.toLowerCase();
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function average(values: number[]) {
  if (!values.length) return "0.0";
  const sum = values.reduce((total, value) => total + value, 0);
  return (sum / values.length).toFixed(1);
}

function getDelta(values: number[]) {
  if (values.length < 2) return "0.0";
  const delta = values[0] - values[values.length - 1];
  return `${delta > 0 ? "+" : ""}${delta.toFixed(1)}`;
}

function getBPStatus(entry?: BloodPressureEntry) {
  if (!entry) return { label: "No data", level: "neutral" };
  const systolic = Number(entry.systolic);
  const diastolic = Number(entry.diastolic);
  if (systolic < 120 && diastolic < 80) {
    return { label: "Normal", level: "ok" };
  }
  if (systolic < 130 && diastolic < 80) {
    return { label: "Elevated", level: "warn" };
  }
  if (systolic < 140 || diastolic < 90) {
    return { label: "High", level: "warn" };
  }
  return { label: "Very high", level: "alert" };
}

function getTempStatus(entry?: TemperatureEntry) {
  if (!entry) return { label: "No data", level: "neutral" };
  const temp = Number(entry.temperature);
  if (temp < 36.1) return { label: "Low", level: "warn" };
  if (temp <= 37.2) return { label: "Normal", level: "ok" };
  if (temp <= 38) return { label: "Elevated", level: "warn" };
  return { label: "Fever", level: "alert" };
}

function latestOf<T>(entries: T[]) {
  return entries.length ? entries[0] : null;
}

function calcAverageRange(
  entries: Array<BloodPressureEntry | WeightEntry | TemperatureEntry>,
  days: number,
  type: "bp" | "weight" | "temp"
) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const relevant = entries.filter((entry) => new Date(entry.entry_date) >= cutoff);
  if (!relevant.length) return null;
  if (type === "bp") {
    const systolic = average(relevant.map((entry) => Number((entry as BloodPressureEntry).systolic)));
    const diastolic = average(relevant.map((entry) => Number((entry as BloodPressureEntry).diastolic)));
    return { systolic, diastolic };
  }
  if (type === "weight") {
    const weight = average(relevant.map((entry) => Number((entry as WeightEntry).weight)));
    return { weight };
  }
  const temperature = average(relevant.map((entry) => Number((entry as TemperatureEntry).temperature)));
  return { temperature };
}

type BPTrendEntry = BloodPressureEntry | { systolic: string; diastolic: string };
type WeightTrendEntry = WeightEntry | { weight: string };
type TempTrendEntry = TemperatureEntry | { temperature: string };

function formatTrendValue(
  type: "bp" | "weight" | "temp",
  entry: BPTrendEntry | WeightTrendEntry | TempTrendEntry | null
) {
  if (!entry) return "no data";
  if (type === "bp") {
    const bpEntry = entry as BPTrendEntry;
    return `${Number(bpEntry.systolic).toFixed(0)}/${Number(bpEntry.diastolic).toFixed(0)} mmHg`;
  }
  if (type === "weight") {
    const weightEntry = entry as WeightTrendEntry;
    return `${Number(weightEntry.weight).toFixed(1)} kg`;
  }
  const tempEntry = entry as TempTrendEntry;
  return `${Number(tempEntry.temperature).toFixed(1)}°C`;
}

function drawLineChart(
  canvas: HTMLCanvasElement,
  primarySeries: number[],
  secondarySeries: number[] = [],
  colors: { primary: string; secondary?: string }
) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  canvas.width = width * window.devicePixelRatio;
  canvas.height = height * window.devicePixelRatio;
  context.scale(window.devicePixelRatio, window.devicePixelRatio);
  context.clearRect(0, 0, width, height);

  const padding = 12;
  const series = [primarySeries, secondarySeries].filter((values) => values.length);
  if (!series.length) {
    context.fillStyle = "#b7a89a";
    context.font = "12px Jost, sans-serif";
    context.fillText("no data yet", padding, height / 2);
    return;
  }

  const allValues = series.flat();
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;

  context.strokeStyle = "rgba(181, 160, 143, 0.4)";
  context.lineWidth = 1;
  [0.25, 0.5, 0.75].forEach((step) => {
    const y = height - padding - step * (height - padding * 2);
    context.beginPath();
    context.moveTo(padding, y);
    context.lineTo(width - padding, y);
    context.stroke();
  });

  const plotSeries = (values: number[], strokeStyle: string) => {
    context.strokeStyle = strokeStyle;
    context.lineWidth = 2;
    context.beginPath();
    values
      .slice()
      .reverse()
      .forEach((value, index, array) => {
        const x = padding + (index / (array.length - 1 || 1)) * (width - padding * 2);
        const y = height - padding - ((value - min) / range) * (height - padding * 2);
        if (index === 0) {
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }
      });
    context.stroke();
  };

  plotSeries(primarySeries, colors.primary);
  if (secondarySeries.length) {
    plotSeries(secondarySeries, colors.secondary ?? "#8b7765");
  }
}
