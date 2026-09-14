// El backend devuelve el mensaje real como body de texto plano (ver GlobalExceptionHandler);
// como HttpClient espera JSON por defecto, Angular envuelve un body no-JSON en
// err.error = { text: "<mensaje original>" }. Si no viene nada reconocible, se usa el fallback.
export function extraerMensajeError(err: unknown, fallback: string): string {
  const body = (err as { error?: unknown })?.error;
  if (typeof body === 'string' && body.trim()) {
    return body;
  }
  if (body && typeof body === 'object' && typeof (body as { text?: unknown }).text === 'string') {
    return (body as { text: string }).text;
  }
  return fallback;
}
