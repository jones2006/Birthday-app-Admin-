import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminSession } from "@/app/lib/auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error("Supabase server configuration is missing.");
}

const supabase = createClient(supabaseUrl, supabaseSecretKey);

async function checkAdmin() {
  return await verifyAdminSession();
}

export async function GET() {
  try {
    if (!(await checkAdmin())) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("Student")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;

    const students = (data ?? []).map((student) => ({
      id: student.id,
      name: student.name,
      registerNumber: student.registerNumber,
      whatsappNumber: student.whatsappNumber,
      academicYear: student.academicYear,
      dateOfBirth: student.dateOfBirth,
      photo: student.photo,
    }));

    return NextResponse.json(students);
  } catch (error) {
    console.error("Error fetching students:", error);

    return NextResponse.json(
      { error: "Failed to fetch students." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!(await checkAdmin())) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const registerNumber = String(body.registerNumber ?? "").trim();
    const whatsappNumber = String(body.whatsappNumber ?? "").trim();
    const academicYear = Number(body.academicYear);
    const dateOfBirth = String(body.dateOfBirth ?? "");
    const photo = body.photo ? String(body.photo) : null;

    if (
      !name ||
      !registerNumber ||
      !whatsappNumber ||
      !Number.isInteger(academicYear) ||
      academicYear < 1 ||
      academicYear > 4 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) ||
      Number.isNaN(Date.parse(dateOfBirth))
    ) {
      return NextResponse.json(
        { error: "Please provide valid student details." },
        { status: 400 },
      );
    }

    const { data: student, error } = await supabase
      .from("Student")
      .insert({
        name,
        registerNumber,
        whatsappNumber,
        academicYear,
        dateOfBirth,
        photo,
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "This register number already exists." },
          { status: 409 },
        );
      }

      throw error;
    }

    return NextResponse.json(
      {
        id: student.id,
        name: student.name,
        registerNumber: student.registerNumber,
        whatsappNumber: student.whatsappNumber,
        academicYear: student.academicYear,
        dateOfBirth: student.dateOfBirth,
        photo: student.photo,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating student:", error);

    return NextResponse.json(
      { error: "Could not save the student." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    if (!(await checkAdmin())) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Student ID is required." },
        { status: 400 },
      );
    }

    const { error } = await supabase.from("Student").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({
      message: "Student deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting student:", error);

    return NextResponse.json(
      { error: "Could not delete the student." },
      { status: 500 },
    );
  }
}
