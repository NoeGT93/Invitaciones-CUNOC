export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Llamada al Worker. `body` se envía como JSON; `form` como multipart. */
export async function api<T = unknown>(ruta: string, opts: { method?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  const r = await fetch(`/api/admin/${ruta}`, {
    method: opts.method ?? (opts.body || opts.form ? 'POST' : 'GET'),
    headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.form ?? (opts.body ? JSON.stringify(opts.body) : undefined),
    credentials: 'same-origin',
  });
  const datos = await r.json().catch(() => null);
  if (!r.ok) throw new ApiError(r.status, datos?.error ?? `Error ${r.status}`);
  return datos as T;
}

export const urlInvitacion = (slug: string) => `${location.origin}/invitacion/${slug}`;
