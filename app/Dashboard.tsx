"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useRouter } from "next/navigation";
import { toBlob } from "html-to-image";

import {
  Cake,
  CalendarDays,
  Users,
  GraduationCap,
  PartyPopper,
  RefreshCw,
  Gift,
  Printer,
  X,
  MessageCircle,
  Image as ImageIcon,
} from "lucide-react";

import StudentManager from "./StudentManager";

type Student = {
  id: string;
  name: string;
  registerNumber: string;
  dateOfBirth: string;
  whatsappNumber: string;
  academicYear: number;
  photo?: string | null;
};

type BirthdayResponse = {
  date: string;
  count: number;
  birthdays: Student[];
};

export default function Home() {
  const router = useRouter();

  const [todayLabel, setTodayLabel] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [birthdays, setBirthdays] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [sharingImage, setSharingImage] = useState(false);

  const birthdayCardRef = useRef<HTMLDivElement>(null);

  // Calculate date after mounting to avoid hydration mismatch.
  useEffect(() => {
    setTodayLabel(
      new Date().toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      }),
    );
  }, []);

  // Logout admin.
  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || `Logout failed (${response.status}).`);
      }

      router.replace("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout error:", err);

      alert(
        err instanceof Error
          ? err.message
          : "Unable to log out. Please try again.",
      );
    }
  };

  // Load student records and today's birthdays.
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [studentsResponse, birthdaysResponse] = await Promise.all([
        fetch("/api/students", {
          cache: "no-store",
        }),
        fetch("/api/birthdays", {
          cache: "no-store",
        }),
      ]);

      if (!studentsResponse.ok) {
        throw new Error("Unable to load student records.");
      }

      if (!birthdaysResponse.ok) {
        throw new Error("Unable to load birthday records.");
      }

      const studentsData = await studentsResponse.json();

      const birthdaysData: BirthdayResponse = await birthdaysResponse.json();

      setStudents(Array.isArray(studentsData) ? studentsData : []);

      setBirthdays(
        Array.isArray(birthdaysData.birthdays) ? birthdaysData.birthdays : [],
      );
    } catch (err) {
      console.error("Dashboard loading error:", err);

      setError("Could not load dashboard data. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  // Count students by academic year.
  const yearCount = (year: number) =>
    students.filter((student) => student.academicYear === year).length;

  // Generate initials if the student has no photo.
  const getInitials = (name: string) =>
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");

  // Format academic year.
  const getYearLabel = (year: number) => {
    if (year === 1) return "1st Year";
    if (year === 2) return "2nd Year";
    if (year === 3) return "3rd Year";
    if (year === 4) return "4th Year";

    return `${year}th Year`;
  };

  // Build birthday message.
  const getBirthdayMessage = (student: Student) => {
    return (
      `🎂 Happy Birthday, ${student.name}!\n\n` +
      "Wishing you a wonderful day filled with happiness, " +
      "success, laughter, and beautiful memories! 🎉🎁\n\n" +
      `Register Number: ${student.registerNumber}\n` +
      `Academic Year: ${getYearLabel(student.academicYear)}\n\n` +
      "Celebrate today. Shine every day! ✨"
    );
  };

  // Share birthday wishes through WhatsApp.
  const handleWhatsAppShare = () => {
    if (!selectedStudent) return;

    const message = getBirthdayMessage(selectedStudent);

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  // Generate and share birthday card PNG.
  const handleShareBirthdayCard = async () => {
    if (!selectedStudent || !birthdayCardRef.current) {
      alert("Please open a birthday card first.");
      return;
    }

    setSharingImage(true);

    try {
      const cardElement = birthdayCardRef.current;

      const blob = await toBlob(cardElement, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#ffffff",
        skipFonts: false,
      });

      if (!blob) {
        throw new Error("Could not generate the birthday card image.");
      }

      const safeName = selectedStudent.name
        .trim()
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-|-$/g, "");

      const file = new File([blob], `Birthday-${safeName || "Student"}.png`, {
        type: "image/png",
      });

      // Native file sharing when supported.
      if (
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          title: `Happy Birthday ${selectedStudent.name}!`,
          text: `Wishing ${selectedStudent.name} a wonderful birthday! 🎂`,
          files: [file],
        });

        return;
      }

      // Fallback: download image.
      const imageUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = file.name;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(imageUrl);
      }, 1000);

      alert(
        "Birthday card image downloaded successfully!\n\n" +
          "Open WhatsApp, choose the student's chat, " +
          "and attach the downloaded PNG image.",
      );
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }

      console.error("Birthday image sharing error:", err);

      alert(
        "Unable to generate or share the birthday card. " + "Please try again.",
      );
    } finally {
      setSharingImage(false);
    }
  };

  // Print birthday card.
  const handlePrint = () => {
    if (!selectedStudent) return;

    window.print();
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }

          #birthday-card-print,
          #birthday-card-print * {
            visibility: visible !important;
          }

          #birthday-card-print {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .no-print {
            display: none !important;
          }

          @page {
            size: A4 portrait;
            margin: 12mm;
          }
        }
      `}</style>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="rounded-xl bg-indigo-600 p-2 text-white">
                <Cake size={25} />
              </div>

              <span className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600">
                BirthdayHub
              </span>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Birthday Dashboard
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Manage student records and celebrate their special days.
            </p>
          </div>

          {/* Dashboard actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold shadow-sm transition hover:bg-slate-100 disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh Dashboard
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Error message */}
        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {/* Dashboard statistics */}
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="First year Students"
            value={loading ? "—" : yearCount(1)}
            subtitle="Registered students"
            icon={<Users size={22} />}
          />

          <StatCard
            title="Second Year Students"
            value={loading ? "—" : yearCount(2)}
            subtitle="Academic year 2"
            icon={<GraduationCap size={22} />}
          />

          <StatCard
            title="Third Year Students"
            value={loading ? "—" : yearCount(3)}
            subtitle="Academic year 3"
            icon={<GraduationCap size={22} />}
          />

          <StatCard
            title="Fourth Year Students"
            value={loading ? "—" : yearCount(4)}
            subtitle="Academic year 4"
            icon={<CalendarDays size={22} />}
          />
        </section>

        {/* Today's birthdays */}
        <section className="mb-10 overflow-hidden rounded-3xl border border-pink-100 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 px-6 py-7 text-white sm:px-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                  <PartyPopper size={15} />
                  TODAY&apos;S CELEBRATION
                </div>

                <h2 className="text-2xl font-extrabold sm:text-3xl">
                  Today&apos;s Birthdays 🎂
                </h2>

                <p className="mt-2 text-sm text-white/90">
                  {todayLabel || "Loading date..."}
                </p>
              </div>

              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20">
                <Gift size={34} />
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-8">
            {loading ? (
              <div className="py-10 text-center">
                <RefreshCw
                  className="mx-auto animate-spin text-indigo-600"
                  size={28}
                />

                <p className="mt-3 text-sm text-slate-500">
                  Loading birthdays...
                </p>
              </div>
            ) : birthdays.length === 0 ? (
              <div className="py-10 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-pink-50 text-pink-500">
                  <Cake size={30} />
                </div>

                <h3 className="mt-4 text-lg font-bold text-slate-800">
                  No birthdays today
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  When a student celebrates their birthday, they will appear
                  here automatically.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Today is a special day!
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      {birthdays.length} student
                      {birthdays.length === 1 ? "" : "s"} celebrating today.
                    </p>
                  </div>

                  <span className="rounded-full bg-pink-50 px-4 py-2 text-sm font-bold text-pink-600">
                    🎉 Happy Birthday!
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {birthdays.map((student) => (
                    <article
                      key={student.id}
                      className="rounded-2xl border border-pink-100 bg-gradient-to-br from-white to-pink-50 p-5 transition hover:shadow-md"
                    >
                      <div className="flex items-center gap-4">
                        {student.photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={student.photo}
                            alt={student.name}
                            className="h-16 w-16 rounded-2xl border-2 border-white object-cover shadow-sm"
                          />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-400 to-purple-500 text-lg font-extrabold text-white shadow-sm">
                            {getInitials(student.name)}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <h4 className="truncate text-lg font-extrabold text-slate-900">
                            {student.name}
                          </h4>

                          <p className="mt-1 text-sm text-slate-500">
                            Register No: {student.registerNumber}
                          </p>

                          <p className="mt-1 text-xs font-semibold text-purple-600">
                            {getYearLabel(student.academicYear)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-2 rounded-xl bg-white/80 p-3 text-sm text-pink-700">
                        <Cake size={17} />
                        Wishing you a wonderful birthday!
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedStudent(student)}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
                      >
                        <Printer size={17} />
                        Generate Birthday Card
                      </button>
                    </article>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* Student management */}
        <section
          id="student-management"
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
        >
          <div className="mb-6">
            <div className="flex items-center gap-2">
              <Users className="text-indigo-600" size={23} />

              <h2 className="text-2xl font-extrabold text-slate-900">
                Student Management
              </h2>
            </div>

            <p className="mt-2 text-sm text-slate-500">
              Add students and manage existing student records.
            </p>
          </div>

          <StudentManager />
        </section>

        {/* Birthday card modal */}
        {selectedStudent && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                setSelectedStudent(null);
              }
            }}
          >
            <div className="my-auto w-full max-w-2xl">
              {/* Preview header */}
              <div className="no-print mb-4 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-white">
                  Birthday Card Preview
                </p>

                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-sm font-semibold text-white hover:bg-white/25"
                >
                  <X size={17} />
                  Close
                </button>
              </div>

              {/* Birthday card */}
              <div
                id="birthday-card-print"
                ref={birthdayCardRef}
                className="overflow-hidden rounded-3xl bg-white shadow-2xl"
              >
                {/* Card banner */}
                <div className="relative overflow-hidden bg-gradient-to-br from-pink-500 via-rose-500 to-purple-700 px-6 py-10 text-center text-white sm:px-12 sm:py-14">
                  <div className="pointer-events-none absolute -left-12 -top-12 h-40 w-40 rounded-full border-[18px] border-white/10" />

                  <div className="pointer-events-none absolute -bottom-16 -right-10 h-52 w-52 rounded-full border-[24px] border-white/10" />

                  <div className="relative">
                    <div className="mb-5 flex justify-center">
                      <div className="rounded-2xl bg-white/20 p-4">
                        <Cake size={42} />
                      </div>
                    </div>

                    <p className="text-xs font-bold uppercase tracking-[0.35em] text-white/90 sm:text-sm">
                      A Special Day to Celebrate
                    </p>

                    <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">
                      Happy
                      <br />
                      Birthday!
                    </h2>

                    <div className="mx-auto mt-7 flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-white/20 text-3xl font-extrabold text-white shadow-xl sm:h-36 sm:w-36">
                      {selectedStudent.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={selectedStudent.photo}
                          alt={selectedStudent.name}
                          crossOrigin="anonymous"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        getInitials(selectedStudent.name)
                      )}
                    </div>

                    <h3 className="mt-6 break-words text-2xl font-extrabold sm:text-4xl">
                      {selectedStudent.name}
                    </h3>

                    <p className="mt-3 text-sm text-white/90 sm:text-base">
                      May your day be filled with happiness, laughter, and
                      wonderful memories.
                    </p>
                  </div>
                </div>

                {/* Card details */}
                <div className="px-6 py-7 text-center sm:px-12 sm:py-9">
                  <div className="mx-auto grid max-w-md grid-cols-2 gap-3">
                    <div className="rounded-xl bg-pink-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-pink-500">
                        Register Number
                      </p>

                      <p className="mt-2 break-words text-sm font-extrabold text-slate-800">
                        {selectedStudent.registerNumber}
                      </p>
                    </div>

                    <div className="rounded-xl bg-purple-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-purple-500">
                        Academic Year
                      </p>

                      <p className="mt-2 text-sm font-extrabold text-slate-800">
                        {getYearLabel(selectedStudent.academicYear)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-7">
                    <p className="text-lg font-bold text-slate-800">
                      Celebrate today. Shine every day! ✨
                    </p>

                    <p className="mt-2 text-xs text-slate-400">
                      BirthdayHub • Student Birthday Celebration
                    </p>
                  </div>
                </div>
              </div>

              {/* Sharing and printing buttons */}
              <div className="no-print mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleShareBirthdayCard}
                  disabled={sharingImage}
                  className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 font-bold text-white shadow-lg transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sharingImage ? (
                    <RefreshCw size={19} className="animate-spin" />
                  ) : (
                    <ImageIcon size={19} />
                  )}

                  {sharingImage
                    ? "Preparing Image..."
                    : "Share Birthday Card Image"}
                </button>

                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white shadow-lg transition hover:bg-emerald-800"
                >
                  <MessageCircle size={19} />
                  Share Wishes on WhatsApp
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white shadow-lg transition hover:bg-indigo-700"
                >
                  <Printer size={19} />
                  Print / Save as PDF
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="rounded-xl border border-white/30 bg-white/10 px-5 py-3 font-semibold text-white transition hover:bg-white/20"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// Reusable statistics card.
function StatCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>

          <p className="mt-3 text-3xl font-extrabold text-slate-900">{value}</p>

          <p className="mt-2 text-xs text-slate-400">{subtitle}</p>
        </div>

        <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
          {icon}
        </div>
      </div>
    </div>
  );
}
