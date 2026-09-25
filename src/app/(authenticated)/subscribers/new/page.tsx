import { getServerUser } from "@/lib/auth/helper";
import { redirect } from "next/navigation";
import NewForm from "./form";

export default async function NewSubscriberPage() {
  const s = await getServerUser(); if (!s) redirect("/login");
  return (
    <div className="space-y-6 max-w-2xl">
      <div><p className="section-label">Abonados</p><h1 className="page-title">Nuevo abonado</h1><p className="page-subtitle">NIS único por ASADA + medidor + georreferenciación opcional</p></div>
      <NewForm />
    </div>
  );
}
