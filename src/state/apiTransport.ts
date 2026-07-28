export class ApiTransportError<TConflict = unknown> extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly conflict?: TConflict,
  ) {
    super(message);
  }
}

type ErrorConstructor<TConflict, TError extends ApiTransportError<TConflict>> = new (
  message: string,
  status: number,
  conflict?: TConflict,
) => TError;

export async function requestJson<TResult, TConflict, TError extends ApiTransportError<TConflict>>(
  path: string,
  init: RequestInit | undefined,
  ErrorType: ErrorConstructor<TConflict, TError>,
  conflictField: string,
): Promise<TResult> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });
  } catch {
    throw new ErrorType('Servidor indisponível. O rascunho local foi preservado.', 0);
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    const message =
      typeof payload?.error === 'string' ? payload.error : 'Falha ao acessar o servidor.';
    throw new ErrorType(
      message,
      response.status,
      payload?.[conflictField] as TConflict | undefined,
    );
  }
  return response.status === 204 ? (undefined as TResult) : ((await response.json()) as TResult);
}
