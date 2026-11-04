import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  try {
    const students = await prisma.student.findMany({
      orderBy: { name: "asc" },
    });

    const today = new Date();

    const indiaDate = new Date(
      today.toLocaleString("en-US", {
        timeZone: "Asia/Kolkata",
      })
    );

    const todayMonth = indiaDate.getMonth();
    const todayDate = indiaDate.getDate();

    const todaysBirthdays = students.filter((student: {
      dateOfBirth: Date;
    }) => {
      const dob = new Date(student.dateOfBirth);

      return (
        dob.getMonth() === todayMonth &&
        dob.getDate() === todayDate
      );
    });

    return NextResponse.json({
      date: `${indiaDate.getFullYear()}-${String(
        indiaDate.getMonth() + 1
      ).padStart(2, "0")}-${String(indiaDate.getDate()).padStart(2, "0")}`, count: todaysBirthdays.length,
      birthdays: todaysBirthdays,
    });
  } catch (error) {
    console.error("Error fetching today's birthdays:", error);

    return NextResponse.json(
      { error: "Could not load today's birthdays." },
      { status: 500 }
    );
  }
}
