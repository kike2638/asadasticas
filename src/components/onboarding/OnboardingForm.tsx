"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const onboardingSchema = z.object({
  tenantName: z.string().min(3, "El nombre es muy corto"),
  slug: z.string().min(3, "El slug es muy corto"),
  haciendaUser: z.string().email("Debe ser un correo válido"),
  haciendaPassword: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  llavePin: z.string().min(4, "El PIN debe tener al menos 4 caracteres"),
});

export function OnboardingForm() {
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(onboardingSchema)
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFileBase64(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: any) => {
    if (!fileBase64) return alert("Por favor carga el archivo .p12");

    setLoading(true);
    const payload = { ...data, llaveCryptBase64: fileBase64 };

    const res = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    setLoading(false);

    if (result.success) alert("ASADA registrada con éxito");
    else alert("Error: " + result.error);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-md mx-auto space-y-4 p-6 border rounded shadow">
      <h2 className="text-xl font-bold">Registro de ASADA</h2>

      <input {...register("tenantName")} className="w-full p-2 border" placeholder="Nombre de la ASADA" />
      <input {...register("slug")} className="w-full p-2 border" placeholder="Slug (ej: asada-ejemplo)" />
      <input {...register("haciendaUser")} className="w-full p-2 border" placeholder="Usuario Hacienda (ATV)" />
      <input type="password" {...register("haciendaPassword")} className="w-full p-2 border" placeholder="Contraseña Hacienda" />
      <input type="password" {...register("llavePin")} className="w-full p-2 border" placeholder="PIN de Llave" />

      <div className="space-y-1">
        <label className="text-sm">Cargar Llave Criptográfica (.p12)</label>
        <input type="file" onChange={handleFileChange} className="w-full p-2 border" accept=".p12" />
      </div>

      <button
        disabled={loading}
        className="w-full bg-blue-600 text-white p-2 rounded disabled:bg-gray-400"
      >
        {loading ? "Registrando..." : "Registrar ASADA"}
      </button>
    </form>
  );
}
