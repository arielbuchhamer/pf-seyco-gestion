// El backend devuelve los errores como { "message": "..." } (ver GlobalExceptionHandler y
// SecurityConfig). Por las dudas también se acepta un body de texto plano, que Angular envuelve
// en err.error = { text: "<mensaje original>" }. Si no viene nada reconocible, se usa el fallback.
export function extraerMensajeError(err: unknown, fallback: string): string {
  const body = (err as { error?: unknown })?.error;
  if (typeof body === 'string' && body.trim()) {
    return body;
  }
  if (body && typeof body === 'object') {
    const { message, text } = body as { message?: unknown; text?: unknown };
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
    if (typeof text === 'string' && text.trim()) {
      return text;
    }
  }
  return fallback;
}
