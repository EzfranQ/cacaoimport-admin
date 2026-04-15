/**
 * Hooks de TanStack Query para el módulo de Órdenes
 * Consulta paginada, detalle, actualización de estado y historial, usando supabase-js directamente.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/app/libs/supabase";

export interface OrderStatus {
  id: string;
  label: string;
  description?: string | null;
}

export interface Order {
  id: string;
  profile_id: string;
  subtotal: number;
  shipping: number;
  total: number;
  payment_proof_url?: string | null;
  created_at: string;
  updated_at?: string | null;
  id_status: string;
  order_status?: { id: string; label: string } | null;
  profile?: { id: string; full_name?: string | null } | null;
}

export interface OrdersQueryParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  statusId?: string;
  profileId?: string;
}

export interface OrdersResult {
  data: Order[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export const useOrders = (params: OrdersQueryParams = {}) => {
  const {
    page = 1,
    pageSize = 20,
    sortBy = "created_at",
    sortOrder = "desc",
    statusId,
    profileId,
  } = params;

  return useQuery({
    queryKey: ["orders", { page, pageSize, sortBy, sortOrder, statusId, profileId }],
    queryFn: async (): Promise<OrdersResult> => {
      const offset = (page - 1) * pageSize;

      let query = supabase
        .from("orders")
        .select(
          [
            "id",
            "profile_id",
            "subtotal",
            "shipping",
            "total",
            "payment_proof_url",
            "created_at",
            "updated_at",
            "id_status",
            "order_status:order_status(id,label)",
          ].join(","),
          { count: "exact" }
        );

      if (statusId) query = query.eq("id_status", statusId);
      if (profileId) query = query.eq("profile_id", profileId);

      const allowedSortBy = ["created_at", "updated_at", "total", "subtotal"];
      const safeSortBy = allowedSortBy.includes(sortBy) ? sortBy : "created_at";

      const { data, error, count } = await query
        .order(safeSortBy, { ascending: sortOrder === "asc" })
        .range(offset, offset + pageSize - 1);

      if (error) {
        throw new Error(`Error fetching orders: ${error.message}`);
      }

      // Enriquecer con datos de perfil (batched), tolerante a esquemas distintos
      const orders = (data ?? []) as unknown as Order[];
      const profileIds = Array.from(new Set(orders.map((o) => o.profile_id).filter(Boolean)));
      let profilesMap: Record<string, any> = {};
      if (profileIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("*")
          .in("id", profileIds);
        (profilesData ?? []).forEach((p: any) => {
          profilesMap[p.id] = p;
        });
      }

      const enriched = orders.map((o) => {
        const p = profilesMap[o.profile_id];
        const name = (p?.full_name ?? ([p?.first_name, p?.last_name].filter(Boolean).join(" ") || null));
        return { ...o, profile: p ? { id: p.id, full_name: name } : undefined } as Order;
      });

      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        data: enriched,
        totalCount,
        totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useOrder = (id: string) => {
  return useQuery({
    queryKey: ["orders", id],
    queryFn: async (): Promise<Order & { items?: any[]; address?: any | null }> => {
      // Orden base con perfil
      const { data: order, error } = await supabase
        .from("orders")
        .select(
          [
            "id",
            "profile_id",
            "subtotal",
            "shipping",
            "total",
            "payment_proof_url",
            "created_at",
            "updated_at",
            "id_status",
            "order_status:order_status(id,label)",
          ].join(",")
        )
        .eq("id", id)
        .single();

      if (error) {
        throw new Error(`Error fetching order: ${error.message}`);
      }

      // Perfil del cliente (tolerante a esquemas)
      let profile: { id: string; full_name?: string | null } | undefined = undefined;
      if ((order as any)?.profile_id) {
        const { data: p } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", (order as any).profile_id)
          .limit(1)
          .maybeSingle();
        if (p) {
          const name = (p.full_name ?? ([p.first_name, p.last_name].filter(Boolean).join(" ") || null));
          profile = { id: p.id, full_name: name };
        }
      }

      // Items vinculados (sin relación embebida). Hacemos join en cliente para tolerar ausencia de FK
      const { data: rawItems, error: itemsErr } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", id);
      if (itemsErr) console.warn("Error fetching order items", itemsErr.message);

      const items = rawItems ?? [];

      // Dirección de envío (snapshot) desde order_shipping_addresses, con fallback
      let address: any | null = null;
      {
        const { data: addr, error: shipAddrErr } = await supabase
          .from("order_shipping_addresses")
          .select("*")
          .eq("order_id", id)
          .limit(1)
          .maybeSingle();
        if (shipAddrErr) console.warn("Error fetching order_shipping_addresses", shipAddrErr.message);
        address = addr ?? null;
      }

      // Regla de negocio: NO hacer fallback. Si no hay snapshot, superficie un warning para diagnóstico.
      if (!address) {
        console.warn(
          "No existe snapshot de dirección en order_shipping_addresses para la orden",
          { orderId: id }
        );
      }

      return { ...(order as unknown as Order), profile, items: items ?? [], address };
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useOrderStatuses = () => {
  return useQuery({
    queryKey: ["order_status"],
    queryFn: async (): Promise<OrderStatus[]> => {
      const { data, error } = await supabase
        .from("order_status")
        .select("id,label,description")
        .order("label", { ascending: true });

      if (error) {
        throw new Error(`Error fetching order statuses: ${error.message}`);
      }
      return (data ?? []) as OrderStatus[];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      statusId,
      statusLabel,
    }: {
      orderId: string;
      statusId?: string;
      statusLabel?: string;
    }) => {
      let nextStatusId = statusId;
      if (!nextStatusId && statusLabel) {
        const { data: status, error: statusErr } = await supabase
          .from("order_status")
          .select("id,label")
          .eq("label", statusLabel)
          .single();
        if (statusErr || !status) {
          throw new Error(`Estado desconocido: ${statusLabel}`);
        }
        nextStatusId = status.id as string;
      }

      const { data, error } = await supabase
        .from("orders")
        .update({ id_status: nextStatusId })
        .eq("id", orderId)
        .select("id,id_status,order_status:order_status(label)")
        .single();

      if (error) {
        // El trigger validate_order_status_transition devuelve errores descriptivos de transición inválida
        throw new Error(`Error actualizando estado: ${error.message}`);
      }
      return data as unknown as Pick<Order, "id" | "id_status"> & { order_status?: { label: string } };
    },
    onSuccess: (_data, variables) => {
      // Refrescar el listado y el detalle impactados
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      if (variables.orderId) {
        queryClient.invalidateQueries({ queryKey: ["orders", variables.orderId] });
        queryClient.invalidateQueries({ queryKey: ["order_status_history", variables.orderId] });
      }
    },
  });
};

export const useOrderHistory = (orderId: string) => {
  return useQuery({
    queryKey: ["order_status_history", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_status_history")
        .select("id,order_id,status_id,changed_at,changed_by,order_status:order_status(label)")
        .eq("order_id", orderId)
        .order("changed_at", { ascending: false });

      if (error) {
        throw new Error(`Error obteniendo historial: ${error.message}`);
      }
      return data ?? [];
    },
    enabled: !!orderId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useUpdateOrderDetails = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      items,
      subtotal,
      total,
      shipping,
    }: {
      orderId: string;
      items: any[];
      subtotal: number;
      total: number;
      shipping: number;
    }) => {
      // Get current items from DB
      const { data: currentItems } = await supabase.from("order_items").select("id").eq("order_id", orderId);
      const currentIds = currentItems?.map((i) => i.id) || [];

      // Separate existing vs new items
      const existingItems = items.filter((it) => it.id && !String(it.id).startsWith('new-'));
      const newItems = items.filter((it) => !it.id || String(it.id).startsWith('new-'));

      // Delete items that were removed
      const keptIds = existingItems.map((it) => it.id);
      const idsToDelete = currentIds.filter((id) => !keptIds.includes(id));
      if (idsToDelete.length > 0) {
        await supabase.from("order_items").delete().in("id", idsToDelete);
      }

      // Update existing items
      for (const it of existingItems) {
        const { error: updateErr } = await supabase.from("order_items").update({
          name: it.name ?? it.product_name ?? "-",
          sku: it.sku ?? it.product_sku ?? "-",
          quantity: typeof it.quantity === "string" ? parseInt(it.quantity) : it.quantity,
          unit_price: typeof it.unit_price === "string" ? parseFloat(it.unit_price) : (it.unit_price ?? it.price ?? 0),
        }).eq("id", it.id);
        if (updateErr) throw new Error("Error updating items: " + updateErr.message);
      }

      // Insert new items (no id — let DB generate it)
      if (newItems.length > 0) {
        const toInsert = newItems.map((it) => ({
          order_id: orderId,
          name: it.name ?? it.product_name ?? "-",
          sku: it.sku ?? it.product_sku ?? "-",
          quantity: typeof it.quantity === "string" ? parseInt(it.quantity) : it.quantity,
          unit_price: typeof it.unit_price === "string" ? parseFloat(it.unit_price) : (it.unit_price ?? it.price ?? 0),
        }));
        const { error: insertErr } = await supabase.from("order_items").insert(toInsert);
        if (insertErr) throw new Error("Error updating items: " + insertErr.message);
      }

      // Update totals
      const { error: orderErr } = await supabase.from("orders").update({ subtotal, total, shipping }).eq("id", orderId);
      if (orderErr) throw new Error("Error updating order totals: " + orderErr.message);

      return true;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders", variables.orderId] });
    },
  });
};