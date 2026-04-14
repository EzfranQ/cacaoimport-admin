import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Table } from "@/shared/components/ui/table";
import { useUsers } from "../hooks/useUsers";

export const UsersListPage = () => {
  const { data: users, isLoading, error } = useUsers();

  if (isLoading) {
    return <div className="p-6">Cargando usuarios...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">Error: {(error as any).message}</div>;
  }

  return (
    <div className="space-y-6 pb-20 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          Usuarios
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Listado de usuarios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded shadow-sm overflow-hidden bg-white">
            <Table>
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-3 font-semibold text-slate-600 w-16">#</th>
                  <th className="text-left p-3 font-semibold text-slate-600">Nombre</th>
                  <th className="text-left p-3 font-semibold text-slate-600">Celular</th>
                  <th className="text-left p-3 font-semibold text-slate-600">Biografía (Bio)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!users || users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-muted-foreground">
                      No hay usuarios que coincidan con la búsqueda.
                    </td>
                  </tr>
                ) : (
                  users.map((user, index) => (
                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-slate-500 font-medium">
                        {index + 1}
                      </td>
                      <td className="p-3 text-slate-900 font-medium">
                        {[user.first_name, user.last_name].filter(Boolean).join(" ") || "Desconocido"}
                      </td>
                      <td className="p-3 text-slate-700">
                        {user.phone || "-"}
                      </td>
                      <td className="p-3 text-slate-700 whitespace-pre-wrap">
                        {user.bio || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
