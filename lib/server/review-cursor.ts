import 'server-only';
import { ReviewError, uuid } from '@/lib/reviews/model';

export type ReviewCursor = {
  createdAt: string;
  id: string;
  restaurantActive?: boolean;
};

export function decodeReviewCursor(raw: string | null): ReviewCursor | null {
  if (!raw) return null;

  try {
    if (raw.length > 512) {
      throw new Error();
    }

    const value = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));

    if (
      typeof value.createdAt !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/.test(value.createdAt) ||
      !Number.isFinite(Date.parse(value.createdAt))
    ) {
      throw new Error();
    }

    if (value.restaurantActive !== undefined && typeof value.restaurantActive !== 'boolean')
      throw new Error();
    return {
      createdAt: value.createdAt,
      id: uuid(value.id),
      ...(value.restaurantActive === undefined ? {} : { restaurantActive: value.restaurantActive }),
    };
  } catch {
    throw new ReviewError('페이지 정보가 올바르지 않아요.');
  }
}
export function encodeReviewCursor(cursor: ReviewCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}
