import { z } from 'zod';

export const SearchRequestSchema = z.object({
  q: z.string().min(1, 'Query is required'),
  page: z.coerce.number().int().min(0).default(0),
  countryCode: z.string().default('us'),
  languageCode: z.string().default('en'),
});

export type SearchRequest = z.infer<typeof SearchRequestSchema>;

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export type ApiResponse<T> = { data: T } | { error: { code: string; message: string } };
