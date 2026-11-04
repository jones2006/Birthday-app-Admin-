
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import * as XLSX from "xlsx";
import {
  UserPlus,
  Trash2,
  Search,
  Users,
  Upload,
  Download,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

type Student = {
  id: string;
  name: string;
  registerNumber: string;
  dateOfBirth: string;
  whatsappNumber: string;
  academicYear: number;
  photo: string | null;
};

type StudentForm = {
  name: string;
  registerNumber: string;
  dob: string;
  whatsapp: string;
  year: string;
  photo: string;
};

type ImportRow = {
  name: string;
  registerNumber: string;
  dateOfBirth: string;
  whatsappNumber: string;
  academicYear: number;
  photo: null;
  error: string;
};

const initialForm: StudentForm = {
  name: "",
  registerNumber: "",
  dob: "",
  whatsapp: "",
  year: "1",
  photo: "",
};

const yearLabels: Record<number, string> = {
  1: "I Year",
  2: "II Year",
  3: "III Year",
  4: "IV Year",
};

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Exact digit validation
function isExactlyDigits(value: string, length: number) {
  return new RegExp(`^\\d{${length}}$`).test(value);
}

function getValue(
  row: Record<string, unknown>,
  possibleNames: string[]
): string {
  const keys = Object.keys(row);

  for (const name of possibleNames) {
    const matchingKey = keys.find(
      (key) => normalizeHeader(key) === normalizeHeader(name)
    );

    if (matchingKey !== undefined) {
      return String(row[matchingKey] ?? "").trim();
    }
  }

  return "";
}

function convertDate(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return [
      value.getFullYear(),
      String(value.getMonth() + 1).padStart(2, "0"),
      String(value.getDate()).padStart(2, "0"),
    ].join("-");
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);

    if (!parsed) return "";

    return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(
      parsed.d
    ).padStart(2, "0")}`;
  }

  const input = String(value ?? "").trim();

  if (!input) return "";

  // DD-MM-YYYY or DD/MM/YYYY
  const parts = input.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);

  if (parts) {
    const day = Number(parts[1]);
    const month = Number(parts[2]);
    const year = Number(parts[3]);

    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return "";
    }

    return `${year}-${String(month).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;
  }

  // YYYY-MM-DD
  const iso = input.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);

    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    ) {
      return `${year}-${String(month).padStart(2, "0")}-${String(
        day
      ).padStart(2, "0")}`;
    }
  }

  return "";
}

export default function StudentManager() {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedImportYear, setSelectedImportYear] = useState("1");

  const [form, setForm] = useState<StudentForm>(initialForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [importMessage, setImportMessage] = useState("");

  const photoInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  const loadStudents = useCallback(async () => {
    try {
      const response = await fetch("/api/students");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not load students.");
      }

      setStudents(data);
    } catch (error) {
      console.error(error);
      alert("Could not load student records. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  const yearCounts = useMemo(
    () => ({
      all: students.length,
      1: students.filter((s) => s.academicYear === 1).length,
      2: students.filter((s) => s.academicYear === 2).length,
      3: students.filter((s) => s.academicYear === 3).length,
      4: students.filter((s) => s.academicYear === 4).length,
    }),
    [students]
  );

  function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Please select an image smaller than 5 MB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setForm((previous) => ({
        ...previous,
        photo: String(reader.result),
      }));
    };

    reader.onerror = () => {
      alert("Could not read this image. Please try another one.");
    };

    reader.readAsDataURL(file);
  }

  async function addStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    const registerNumber = form.registerNumber.trim();
    const whatsappNumber = form.whatsapp.trim();

    // Validate exact digit counts
    if (!isExactlyDigits(registerNumber, 11)) {
      alert("Register number must contain exactly 11 digits.");
      return;
    }

    if (!isExactlyDigits(whatsappNumber, 10)) {
      alert("WhatsApp number must contain exactly 10 digits.");
      return;
    }

    const duplicate = students.some(
      (student) =>
        student.registerNumber.toLowerCase() ===
        registerNumber.toLowerCase()
    );

    if (duplicate) {
      alert("This register number already exists.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          registerNumber,
          dateOfBirth: form.dob,
          whatsappNumber,
          academicYear: Number(form.year),
          photo: form.photo || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not save student.");
      }

      setStudents((previous) =>
        [...previous, result as Student].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );

      setForm(initialForm);

      if (photoInputRef.current) {
        photoInputRef.current.value = "";
      }

      alert("Student saved successfully!");
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error ? error.message : "Could not save student."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteStudent(id: string) {
    if (
      !window.confirm(
        "Are you sure you want to permanently delete this student?"
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/students?id=${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not delete student.");
      }

      setStudents((previous) =>
        previous.filter((student) => student.id !== id)
      );

      alert("Student deleted successfully.");
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error ? error.message : "Could not delete student."
      );
    }
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    setImportMessage("");
    setImportRows([]);
    setShowImportPreview(false);

    try {
      const buffer = await file.arrayBuffer();

      const workbook = XLSX.read(buffer, {
        type: "array",
        cellDates: true,
      });

      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

      if (!firstSheet) {
        throw new Error("The uploaded file has no worksheet.");
      }

      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        firstSheet,
        { defval: "" }
      );

      if (rawRows.length === 0) {
        throw new Error("No student records found in the file.");
      }

      const seen = new Set(
        students.map((student) => student.registerNumber.toLowerCase())
      );

      const selectedYearNumber = Number(selectedImportYear);

      const parsedRows: ImportRow[] = rawRows.map((row) => {
        const name = getValue(row, [
          "Name",
          "Student Name",
          "Full Name",
        ]);

        const registerNumber = getValue(row, [
          "Register Number",
          "Register No",
          "Reg No",
          "RegisterNumber",
        ]);

        const dobKey = Object.keys(row).find((key) =>
          ["dateofbirth", "dob"].includes(normalizeHeader(key))
        );

        const rawDob = dobKey ? row[dobKey] : "";

        const whatsappNumber = getValue(row, [
          "WhatsApp Number",
          "Whatsapp",
          "Phone",
          "Mobile Number",
        ]);

        const dateOfBirth = convertDate(rawDob);
        const academicYear = selectedYearNumber;

        const errors: string[] = [];

        if (!name) errors.push("Name missing");
        if (!registerNumber) errors.push("Register number missing");
        if (!dateOfBirth) errors.push("Invalid or missing DOB");
        if (!whatsappNumber) errors.push("WhatsApp number missing");

        // Exact register number validation
        if (
          registerNumber &&
          !isExactlyDigits(registerNumber, 11)
        ) {
          errors.push("Register number must contain exactly 11 digits");
        }

        // Exact WhatsApp number validation
        if (
          whatsappNumber &&
          !isExactlyDigits(whatsappNumber, 10)
        ) {
          errors.push("WhatsApp number must contain exactly 10 digits");
        }

        if (![1, 2, 3, 4].includes(academicYear)) {
          errors.push("Please select a valid academic year");
        }

        const duplicateKey = registerNumber.toLowerCase();

        if (registerNumber && seen.has(duplicateKey)) {
          errors.push("Duplicate register number");
        }

        if (registerNumber) {
          seen.add(duplicateKey);
        }

        return {
          name,
          registerNumber,
          dateOfBirth,
          whatsappNumber,
          academicYear,
          photo: null,
          error: errors.join(", "),
        };
      });

      setImportRows(parsedRows);
      setShowImportPreview(true);
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error ? error.message : "Unable to read the file."
      );
    } finally {
      event.target.value = "";
    }
  }

  async function importStudents() {
    const validRows = importRows.filter((row) => !row.error);

    if (validRows.length === 0) {
      alert("There are no valid student records to import.");
      return;
    }

    if (
      !window.confirm(
        `Import ${validRows.length} student record(s) into ${
          yearLabels[validRows[0].academicYear]
        }?`
      )
    ) {
      return;
    }

    setImporting(true);

    let successCount = 0;
    let failedCount = 0;

    try {
      for (const row of validRows) {
        try {
          const response = await fetch("/api/students", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: row.name,
              registerNumber: row.registerNumber,
              dateOfBirth: row.dateOfBirth,
              whatsappNumber: row.whatsappNumber,
              academicYear: row.academicYear,
              photo: null,
            }),
          });

          if (response.ok) {
            successCount++;
          } else {
            failedCount++;
            const result = await response.json().catch(() => null);
            console.error("Student import failed:", result);
          }
        } catch (error) {
          console.error("Student import request failed:", error);
          failedCount++;
        }
      }
    } finally {
      setImporting(false);
    }

    setShowImportPreview(false);
    setImportRows([]);

    setImportMessage(
      `Import completed: ${successCount} successful, ${failedCount} failed.`
    );

    await loadStudents();
  }

  function downloadTemplate() {
    const template = [
      {
        Name: "Arun Kumar",
        "Register Number": "95222303062",
        "Date of Birth": "15-08-2005",
        "WhatsApp Number": "9876543210",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);

    // Keep number fields as text in Excel to preserve all digits.
    worksheet["B2"].z = "@";
    worksheet["D2"].z = "@";

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");

    XLSX.writeFile(workbook, "BirthdayHub_Student_Template.xlsx");
  }

  const filteredStudents = students.filter((student) => {
    const query = search.toLowerCase();

    const matchesSearch =
      student.name.toLowerCase().includes(query) ||
      student.registerNumber.toLowerCase().includes(query);

    const matchesYear =
      selectedYear === "all" ||
      student.academicYear === Number(selectedYear);

    return matchesSearch && matchesYear;
  });

  const validImportCount = importRows.filter((row) => !row.error).length;
  const invalidImportCount = importRows.length - validImportCount;

  const yearFilters = [
    { value: "all", label: "All Years", count: yearCounts.all },
    { value: "1", label: "I Year", count: yearCounts[1] },
    { value: "2", label: "II Year", count: yearCounts[2] },
    { value: "3", label: "III Year", count: yearCounts[3] },
    { value: "4", label: "IV Year", count: yearCounts[4] },
  ];

  return (
    <div className="space-y-6">
      {/* REGISTER STUDENT */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
            <UserPlus size={24} />
          </div>

          <div>
            <h2 className="text-xl font-bold">Register a Student</h2>
            <p className="text-sm text-slate-500">
              Enter student details below.
            </p>
          </div>
        </div>

        <form onSubmit={addStudent} className="space-y-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <label className="text-sm font-medium">
              Student Name *
              <input
                required
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                placeholder="Enter full name"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500"
              />
            </label>

            {/* 11-DIGIT REGISTER NUMBER */}
            <label className="text-sm font-medium">
              Register Number *
              <input
                required
                type="text"
                inputMode="numeric"
                maxLength={11}
                minLength={11}
                value={form.registerNumber}
                onChange={(event) =>
                  setForm({
                    ...form,
                    registerNumber: event.target.value
                      .replace(/\D/g, "")
                      .slice(0, 11),
                  })
                }
                placeholder="Enter 11-digit register number"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500"
              />
              <span className="mt-1 block text-xs text-slate-500">
                {form.registerNumber.length}/11 digits
              </span>
            </label>

            <label className="text-sm font-medium">
              Date of Birth *
              <input
                required
                type="date"
                value={form.dob}
                onChange={(event) =>
                  setForm({ ...form, dob: event.target.value })
                }
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500"
              />
            </label>

            {/* 10-DIGIT WHATSAPP NUMBER */}
            <label className="text-sm font-medium">
              WhatsApp Number *
              <input
                required
                type="text"
                inputMode="numeric"
                maxLength={10}
                minLength={10}
                value={form.whatsapp}
                onChange={(event) =>
                  setForm({
                    ...form,
                    whatsapp: event.target.value
                      .replace(/\D/g, "")
                      .slice(0, 10),
                  })
                }
                placeholder="Enter 10-digit WhatsApp number"
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500"
              />
              <span className="mt-1 block text-xs text-slate-500">
                {form.whatsapp.length}/10 digits
              </span>
            </label>

            <label className="text-sm font-medium">
              Academic Year *
              <select
                value={form.year}
                onChange={(event) =>
                  setForm({ ...form, year: event.target.value })
                }
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-indigo-500"
              >
                <option value="1">I Year</option>
                <option value="2">II Year</option>
                <option value="3">III Year</option>
                <option value="4">IV Year</option>
              </select>
            </label>

            <label className="text-sm font-medium">
              Student Photograph
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhoto}
                className="mt-2 block w-full rounded-xl border border-slate-200 p-2 text-sm"
              />
              <span className="mt-1 block text-xs text-slate-500">
                Maximum 5 MB.
              </span>
            </label>
          </div>

          {form.photo && (
            <div>
              <p className="mb-2 text-sm font-medium">Photo Preview</p>
              <img
                src={form.photo}
                alt="Student preview"
                className="h-24 w-24 rounded-xl border border-slate-200 object-cover"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <UserPlus size={18} />
            {saving ? "Saving..." : "Save Student"}
          </button>
        </form>
      </div>

      {/* STUDENT RECORDS */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-xl font-bold">Student Records</h2>
            <p className="mt-1 text-sm text-slate-500">
              {loading
                ? "Loading student records..."
                : `${students.length} student(s) saved`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={downloadTemplate}
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              <Download size={17} />
              Excel Template
            </button>

            <div className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2">
              <label
                htmlFor="importAcademicYear"
                className="text-sm font-semibold text-indigo-700"
              >
                Import for:
              </label>

              <select
                id="importAcademicYear"
                value={selectedImportYear}
                onChange={(event) =>
                  setSelectedImportYear(event.target.value)
                }
                className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold outline-none"
              >
                <option value="1">I Year</option>
                <option value="2">II Year</option>
                <option value="3">III Year</option>
                <option value="4">IV Year</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => importFileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <Upload size={17} />
              Import Excel / CSV
            </button>

            <input
              ref={importFileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleImportFile}
            />
          </div>
        </div>

        {importMessage && (
          <div className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
            {importMessage}
          </div>
        )}

        {/* YEAR FILTERS */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {yearFilters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setSelectedYear(item.value)}
              className={`rounded-xl border p-3 text-left transition ${
                selectedYear === item.value
                  ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <p className="text-sm font-medium">{item.label}</p>
              <p className="mt-1 text-xl font-bold">{item.count}</p>
              <p className="text-xs opacity-70">Students</p>
            </button>
          ))}
        </div>

        {/* SEARCH */}
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
          <Search size={18} className="text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by student name or register number..."
            className="min-w-0 flex-1 outline-none"
          />
        </div>

        {/* IMPORT PREVIEW */}
        {showImportPreview && (
          <div className="mb-6 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900">
                  Import Preview - {yearLabels[Number(selectedImportYear)]}
                </h3>
                <p className="text-sm text-slate-600">
                  All records will be imported into the selected academic year.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowImportPreview(false);
                  setImportRows([]);
                }}
                className="rounded-lg p-2 hover:bg-white"
                aria-label="Close import preview"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4 flex flex-wrap gap-3 text-sm">
              <span className="font-semibold text-emerald-700">
                {validImportCount} valid
              </span>
              <span className="font-semibold text-rose-700">
                {invalidImportCount} invalid / duplicate
              </span>
            </div>

            <div className="max-h-72 overflow-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600">
                  <tr>
                    <th className="p-3">Name</th>
                    <th className="p-3">Register No.</th>
                    <th className="p-3">Year</th>
                    <th className="p-3">Validation</th>
                  </tr>
                </thead>

                <tbody>
                  {importRows.map((row, index) => (
                    <tr
                      key={`${row.registerNumber}-${index}`}
                      className="border-t"
                    >
                      <td className="p-3">{row.name || "—"}</td>
                      <td className="p-3">{row.registerNumber || "—"}</td>
                      <td className="p-3">
                        {yearLabels[row.academicYear] || "—"}
                      </td>
                      <td className="p-3">
                        {row.error ? (
                          <span className="flex min-w-40 items-center gap-1 text-xs text-rose-600">
                            <AlertCircle size={14} />
                            {row.error}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-emerald-700">
                            <CheckCircle2 size={14} />
                            Ready
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              disabled={importing || validImportCount === 0}
              onClick={() => void importStudents()}
              className="mt-4 flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Upload size={18} />
              {importing
                ? "Importing..."
                : `Import ${validImportCount} Valid Students`}
            </button>
          </div>
        )}

        {/* STUDENT TABLE WITH INDEPENDENT SCROLLBAR */}
        {loading ? (
          <div className="rounded-xl bg-slate-50 py-10 text-center text-slate-500">
            Loading student records...
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="rounded-xl bg-slate-50 py-10 text-center">
            <Users size={32} className="mx-auto text-slate-300" />
            <p className="mt-3 font-semibold">No students found</p>
            <p className="mt-1 text-sm text-slate-500">
              Try another year filter or add a student above.
            </p>
          </div>
        ) : (
          <div className="max-h-[600px] overflow-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[750px] text-left text-sm">
              <thead className="sticky top-0 z-20 bg-slate-50 text-slate-500 shadow-sm">
                <tr>
                  <th className="p-3">Student</th>
                  <th className="p-3">Register No.</th>
                  <th className="p-3">Date of Birth</th>
                  <th className="p-3">Year</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredStudents.map((student) => (
                  <tr
                    key={student.id}
                    className="border-t border-slate-100 hover:bg-slate-50"
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        {student.photo ? (
                          <img
                            src={student.photo}
                            alt=""
                            className="h-10 w-10 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 font-bold text-indigo-600">
                            {student.name.charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div>
                          <p className="font-semibold">{student.name}</p>
                          <p className="text-xs text-slate-500">
                            {student.whatsappNumber}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="p-3">{student.registerNumber}</td>

                    <td className="p-3">
                      {student.dateOfBirth.slice(0, 10)}
                    </td>

                    <td className="p-3">
                      {yearLabels[student.academicYear] || "Unknown"}
                    </td>

                    <td className="p-3">
                      <button
                        type="button"
                        aria-label={`Delete ${student.name}`}
                        onClick={() => void deleteStudent(student.id)}
                        className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
