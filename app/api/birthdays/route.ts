import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminSession } from "@/app/lib/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET() {
  try {
    const isAdmin = await verifyAdminSession();

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: students, error } = await supabase
      .from("Student")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;

    // Get today's date in Indian timezone
    const todayParts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());

    const todayMonth = Number(
      todayParts.find((part) => part.type === "month")?.value,
    );

    const todayDay = Number(
      todayParts.find((part) => part.type === "day")?.value,
    );

    const todayYear = Number(
      todayParts.find((part) => part.type === "year")?.value,
    );

    // Compare the stored DOB calendar date without timezone conversion
    const todaysBirthdays = (students || []).filter((student) => {
      const dobDate = String(student.dateOfBirth).slice(0, 10);
      const [, month, day] = dobDate.split("-").map(Number);

      return month === todayMonth && day === todayDay;
    });

    return NextResponse.json({
      date: `${todayYear}-${String(todayMonth).padStart(2, "0")}-${String(
        todayDay,
      ).padStart(2, "0")}`,
      count: todaysBirthdays.length,
      birthdays: todaysBirthdays,
    });
  } catch (error) {
    console.error("Error fetching today's birthdays:", error);

    return NextResponse.json(
      { error: "Could not load today's birthdays." },
      { status: 500 },
    );
  }
}
