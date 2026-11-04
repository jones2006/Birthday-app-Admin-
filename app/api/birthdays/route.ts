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

    const indiaDate = new Date(
      new Date().toLocaleString("en-US", {
        timeZone: "Asia/Kolkata",
      }),
    );

    const todayMonth = indiaDate.getMonth();
    const todayDate = indiaDate.getDate();

    const todaysBirthdays = (students || []).filter((student) => {
      const dob = new Date(student.dateOfBirth);

      return dob.getUTCMonth() === todayMonth && dob.getUTCDate() === todayDate;
    });

    return NextResponse.json({
      date: `${indiaDate.getFullYear()}-${String(todayMonth + 1).padStart(
        2,
        "0",
      )}-${String(todayDate).padStart(2, "0")}`,
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
