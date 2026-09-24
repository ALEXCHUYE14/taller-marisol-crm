export const queryKeys = {
  settings: ["settings"] as const,
  dashboard: ["dashboard"] as const,
  clients: (search = "") => ["clients", search] as const,
  client: (id: string) => ["client", id] as const,
  clientHistory: (id: string) => ["client-history", id] as const,
  inventory: (filters: object = {}) => ["inventory", filters] as const,
  inventoryAvailable: ["inventory", "available"] as const,
  inventoryFacets: ["inventory", "facets"] as const,
  rentals: (filter: string) => ["rentals", filter] as const,
  tailoring: (includeDelivered: boolean) => ["tailoring", includeDelivered] as const,
  payments: (scope: string) => ["payments", scope] as const,
  /** Caja: todas empiezan con "caja" para invalidarlas juntas */
  caja: {
    incomes: (r: { from: string; to: string }) => ["caja", "incomes", r.from, r.to] as const,
    expenses: (r: { from: string; to: string }) => ["caja", "expenses", r.from, r.to] as const,
    closing: (date: string) => ["caja", "closing", date] as const,
    previousClosing: (date: string) => ["caja", "previous-closing", date] as const,
    closings: ["caja", "closings"] as const,
    receivables: ["caja", "receivables"] as const,
  },
};
