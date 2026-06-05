/**
 * Hooks de TanStack Query para el módulo de Facturas (invoices).
 *
 * Una factura es un snapshot independiente de los pedidos: guarda el cliente,
 * los ítems (JSONB) y la dirección (JSONB) tal como estaban al facturar.
 * Fuentes: facturación manual (sin profile_id/order_id) y pedidos facturados.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/app/libs/supabase";

export interface InvoiceItem {
  name: string;
  sku?: string | null;
  quantity: number;
  unit_price: number;
}

export interface InvoiceAddress {
  address?: string | null;
  address_line_2?: string | null;
  department_name?: string | null;
  phone?: string | null;
}

export interface Invoice {
  id: number;
  created_at: string;
  client_name: string;
  client_phone?: string | null;
  profile_id?: string | null;
  order_id?: string | null;
  seller?: string | null;
  payment_methods?: string | null;
  delivered: boolean;
  subtotal: number;
  total: number;
  address?: InvoiceAddress | null;
  items: InvoiceItem[];
}

export type NewInvoice = Omit<Invoice, "id" | "created_at">;

/** Datos agregados de un cliente, derivados de sus facturas. */
export interface ClientSummary {
  key: string;
  name: string;
  phone?: string | null;
  profileId?: string | null;
  invoiceCount: number;
  totalAcum: number;
  lastInvoiceAt: string;
}

const normalize = (s?: string | null) =>
  (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Clave estable de cliente: por perfil cuando existe, si no por nombre+teléfono.
 * Se usa como parámetro de ruta (URL-encoded por el consumidor).
 */
export const clientKeyFor = (row: {
  profile_id?: string | null;
  client_name: string;
  client_phone?: string | null;
}): string =>
  row.profile_id
    ? `p:${row.profile_id}`
    : `m:${normalize(row.client_name)}|${normalize(row.client_phone)}`;

const INVOICE_COLUMNS =
  "id,created_at,client_name,client_phone,profile_id,order_id,seller,payment_methods,delivered,subtotal,total,address,items";

/** Lista de clientes con facturas, agregada en cliente (base pequeña). */
export const useClients = () => {
  return useQuery({
    queryKey: ["invoice-clients"],
    queryFn: async (): Promise<ClientSummary[]> => {
      const { data, error } = await supabase
        .from("invoices")
        .select("client_name,client_phone,profile_id,total,created_at")
        .order("created_at", { ascending: false });

      if (error) throw new Error(`Error obteniendo clientes: ${error.message}`);

      const map = new Map<string, ClientSummary>();
      for (const row of data ?? []) {
        const key = clientKeyFor(row as any);
        const existing = map.get(key);
        const total = Number((row as any).total ?? 0);
        const createdAt = (row as any).created_at as string;
        if (existing) {
          existing.invoiceCount += 1;
          existing.totalAcum += total;
          if (createdAt > existing.lastInvoiceAt) existing.lastInvoiceAt = createdAt;
        } else {
          map.set(key, {
            key,
            name: (row as any).client_name ?? "Desconocido",
            phone: (row as any).client_phone ?? null,
            profileId: (row as any).profile_id ?? null,
            invoiceCount: 1,
            totalAcum: total,
            lastInvoiceAt: createdAt,
          });
        }
      }

      return Array.from(map.values()).sort((a, b) =>
        b.lastInvoiceAt.localeCompare(a.lastInvoiceAt)
      );
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

/** Facturas de un cliente según su clave (`p:<uuid>` o `m:<nombre>|<tel>`). */
export const useInvoicesByClient = (clientKey: string) => {
  return useQuery({
    queryKey: ["invoices-by-client", clientKey],
    queryFn: async (): Promise<Invoice[]> => {
      let query = supabase.from("invoices").select(INVOICE_COLUMNS);

      if (clientKey.startsWith("p:")) {
        query = query.eq("profile_id", clientKey.slice(2));
      } else {
        // Cliente manual: traemos las facturas sin perfil y afinamos por clave
        // en cliente (la clave normaliza nombre/teléfono).
        query = query.is("profile_id", null);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw new Error(`Error obteniendo facturas: ${error.message}`);

      const rows = (data ?? []) as unknown as Invoice[];
      // Para clientes manuales, garantizamos coincidencia exacta de clave.
      const filtered = clientKey.startsWith("p:")
        ? rows
        : rows.filter((r) => clientKeyFor(r) === clientKey);
      return filtered;
    },
    enabled: !!clientKey,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useCreateInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (invoice: NewInvoice): Promise<Invoice> => {
      const { data, error } = await supabase
        .from("invoices")
        .insert(invoice)
        .select(INVOICE_COLUMNS)
        .single();
      if (error) throw new Error(`Error guardando factura: ${error.message}`);
      return data as unknown as Invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-clients"] });
      queryClient.invalidateQueries({ queryKey: ["invoices-by-client"] });
    },
  });
};

export const useUpdateInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: number;
      patch: Partial<NewInvoice>;
    }): Promise<Invoice> => {
      const { data, error } = await supabase
        .from("invoices")
        .update(patch)
        .eq("id", id)
        .select(INVOICE_COLUMNS)
        .single();
      if (error) throw new Error(`Error actualizando factura: ${error.message}`);
      return data as unknown as Invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-clients"] });
      queryClient.invalidateQueries({ queryKey: ["invoices-by-client"] });
    },
  });
};

export const useDeleteInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw new Error(`Error eliminando factura: ${error.message}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-clients"] });
      queryClient.invalidateQueries({ queryKey: ["invoices-by-client"] });
    },
  });
};

/** Borra TODAS las facturas con más de 6 meses de antigüedad. */
export const useDeleteOldInvoices = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<number> => {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - 6);
      const { data, error } = await supabase
        .from("invoices")
        .delete()
        .lt("created_at", cutoff.toISOString())
        .select("id");
      if (error) throw new Error(`Error limpiando facturas: ${error.message}`);
      return (data ?? []).length;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-clients"] });
      queryClient.invalidateQueries({ queryKey: ["invoices-by-client"] });
    },
  });
};
