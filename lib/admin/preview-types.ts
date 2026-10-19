// 관리자 화면의 미리보기(거리·좌표 재측정, 엑셀 가져오기): 서버 응답과 화면이 함께 쓰는 타입

export type DistanceChange = {
  id: string;
  name: string;
  active: boolean;
  /** Stored meters; null when empty. */
  before: number | null;
  /** Recomputed meters; null when the restaurant has no valid coordinates. */
  after: number | null;
};
export type DistancePreview = {
  rows: DistanceChange[];
  summary: { total: number; changed: number; missingCoordinates: number };
  revision: string;
};
export type CoordinateChange = {
  id: string;
  name: string;
  active: boolean;
  address: string;
  /** Stored coordinates; null when none were saved. */
  before: { latitude: string | null; longitude: string | null };
  /** Coordinates Kakao returns for the stored address now. */
  after: { latitude: string; longitude: string };
  /** Meters between the two, to 0.1 m; null when nothing was stored. */
  moved: number | null;
};
/** A restaurant whose address did not resolve to exactly one place; its coordinates stay. */
export type CoordinateFailure = { id: string; name: string; active: boolean; address: string };
export type CoordinatePreview = {
  rows: CoordinateChange[];
  failed: CoordinateFailure[];
  /** Restaurants without an address are not looked up. */
  summary: { total: number; missingAddress: number };
  revision: string;
  /** Signs `revision` with the previewed coordinates, so the save applies exactly these. */
  token: string;
};
export type ImportSummary = { added: number; updated: number; inactive: number; missing: number };
export type ImportPreview = {
  rows: {
    key: string;
    name: string;
    address: string | null;
    active: boolean;
    row: number | null;
    changes: string[];
  }[];
  summary: ImportSummary;
  revision: string;
  token: string;
};
