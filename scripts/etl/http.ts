/** fetch con reintentos y User-Agent de navegador (datos.gob.ar devuelve 403 al UA por defecto). */
export const UA = "Mozilla/5.0 (compatible; observatorio-construccion-etl/1.0)";

export async function fetchJson<T = unknown>(url: string, headers: Record<string, string> = {}, intentos = 4): Promise<T> {
  let ultimoError: unknown;
  for (let i = 0; i < intentos; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json", ...headers }, signal: AbortSignal.timeout(90_000) });
      if (res.status === 401 || res.status === 403) {
        throw Object.assign(new Error(`HTTP ${res.status} en ${redactar(url)}: ${(await res.text()).slice(0, 200)}`), { fatal: true });
      }
      if (!res.ok && res.status !== 206) throw new Error(`HTTP ${res.status} en ${redactar(url)}: ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as T;
    } catch (e) {
      ultimoError = e;
      if ((e as { fatal?: boolean }).fatal) break;
      await new Promise((r) => setTimeout(r, 2000 * 2 ** i));
    }
  }
  throw ultimoError;
}

function redactar(url: string): string {
  return url.length > 160 ? url.slice(0, 160) + "…" : url;
}
