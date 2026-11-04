import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import Dashboard from "./Dashboard";
import { verifyAdminSession } from "./lib/auth";

async function HomeContent() {
  await connection();

  const isAuthenticated = await verifyAdminSession();

  if (!isAuthenticated) {
    redirect("/login");
  }

  return <Dashboard />;
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
