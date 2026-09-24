const PAGE_SIZE = 1000; // límite por consulta de Supabase (PostgREST)

/**
 * Lee TODAS las filas de una consulta paginando de 1000 en 1000.
 * Sin esto, un rango grande de fechas se cortaría en silencio a 1000 filas y la caja saldría mal.
 */
export async function fetchAllPages<T>(
  page: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const rows = (data ?? []) as T[];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) return all;
  }
}
