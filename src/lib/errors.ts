/** Błąd z komunikatem gotowym do pokazania użytkownikowi (po polsku). */
export class AppError extends Error {
  constructor(
    message: string,
    /** Czy ponowienie tej samej operacji ma sens (np. błąd sieci), czy trzeba zmienić plik. */
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function toUserMessage(error: unknown): { message: string; retryable: boolean } {
  if (error instanceof AppError) return { message: error.message, retryable: error.retryable };
  return { message: 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.', retryable: true };
}
