export default function TenantDashboard({ params }: { params: { tenant: string } }) {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Bienvenido a la ASADA</h1>
      <p className="text-lg">Tenant activo: {params.tenant}</p>
    </div>
  );
}
