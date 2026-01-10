import { useState, useCallback } from 'react';

interface UseFormSubmitOptions<T> {
  endpoint: string;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

interface UseFormSubmitReturn<T> {
  submit: (data: Record<string, unknown>) => Promise<T>;
  isSubmitting: boolean;
  error: string | null;
  success: boolean;
  reset: () => void;
}

export function useFormSubmit<T = unknown>({
  endpoint,
  onSuccess,
  onError,
}: UseFormSubmitOptions<T>): UseFormSubmitReturn<T> {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submit = useCallback(async (data: Record<string, unknown>): Promise<T> => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Submission failed');
      }

      const result = await response.json() as T;
      setSuccess(true);
      onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error.message);
      onError?.(error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [endpoint, onSuccess, onError]);

  const reset = useCallback(() => {
    setError(null);
    setSuccess(false);
  }, []);

  return { submit, isSubmitting, error, success, reset };
}
