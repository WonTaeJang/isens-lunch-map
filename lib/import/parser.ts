import ExcelJS from "exceljs";

export class ImportError extends Error {}
export type ImportRow = { name: string; address: string; category: string; main_menu: string; distance: number | null; active: boolean; row: number };
export const identity = (r: { name: string; address: string | null }) => JSON.stringify([r.name.normalize('NFKC').replace(/\s+/g, '').toLowerCase(), (r.address ?? "").normalize('NFKC').replace(/\s+/g, '').toLowerCase()]);

function text(cell: ExcelJS.Cell) {
  if (cell.type === ExcelJS.ValueType.Formula || cell.type === ExcelJS.ValueType.Error) throw new ImportError(`${cell.address}: 수식 대신 값을 입력해 주세요.`);
  return cell.text.trim();
}
function struck(cell: ExcelJS.Cell) {
  if (cell.font?.strike) return true;
  const value = cell.value;
  return !!(value && typeof value === 'object' && 'richText' in value && value.richText.some(run => run.text.trim() && run.font?.strike));
}
export async function parseWorkbook(buffer: Buffer): Promise<ImportRow[]> {
  const workbook = new ExcelJS.Workbook();
  try { await workbook.xlsx.load(buffer as never); } catch { throw new ImportError('엑셀 파일을 읽을 수 없습니다. .xlsx 파일을 확인해 주세요.'); }
  const tables: { sheet: ExcelJS.Worksheet; header: number; columns: Record<string, number> }[] = [];
  for (const sheet of workbook.worksheets) {
    if (sheet.state !== "visible") continue;
    if (sheet.rowCount > 5000 || sheet.columnCount > 100) throw new ImportError('시트 크기가 너무 큽니다. 불필요한 행과 열을 제거해 주세요.');
    sheet.eachRow((row, number) => {
      if (number > 30) return;
      const columns: Record<string, number> = {};
      row.eachCell((cell, col) => { columns[cell.text.replace(/\s+/g, '')] = col; });
      if (columns['가맹점명'] && columns['주소']) tables.push({ sheet, header: number, columns });
    });
  }
  if (tables.length !== 1) throw new ImportError('가맹점명·주소 헤더가 있는 표가 정확히 하나 필요합니다. 한 시트의 전체 목록을 업로드해 주세요.');
  const { sheet, header, columns } = tables[0];
  const rows: ImportRow[] = [];
  const keys = new Set<string>();
  for (let n = header + 1; n <= sheet.rowCount; n++) {
    const row = sheet.getRow(n);
    const fields = ['가맹점명', '주소', '카테고리', '대표메뉴', '거리'];
    const cells = fields.map(field => columns[field] ? row.getCell(columns[field]) : null);
    const values = cells.map(cell => cell ? text(cell) : '');
    if (values.every(value => !value)) continue;
    const [name, address, category, main_menu, rawDistance] = values;
    if (!name || !address) throw new ImportError(`${n}행: 가맹점명과 주소가 모두 필요합니다.`);
    if (cells.some(cell => cell?.isMerged)) throw new ImportError(`${n}행: 데이터 셀의 병합을 해제해 주세요.`);
    if (name.length > 200 || address.length > 500 || category.length > 200 || main_menu.length > 1000) throw new ImportError(`${n}행: 입력값이 너무 깁니다.`);
    let distance: number | null = null;
    if (rawDistance) {
      const match = rawDistance.replace(/,/g, '').match(/^(\d+(?:\.\d+)?)\s*(km|m|미터|킬로미터)?$/i);
      if (!match) throw new ImportError(`${n}행: 거리는 0.1Km 또는 100m 형식으로 입력해 주세요.`);
      distance = Math.round(Number(match[1]) * (/^(km|킬로미터)$/i.test(match[2] ?? '') ? 1000 : 1));
      if (!Number.isSafeInteger(distance)) throw new ImportError(`${n}행: 거리값을 확인해 주세요.`);
    }
    const item = { name, address, category, main_menu, distance, active: !cells.some(cell => cell && struck(cell)), row: n };
    const key = identity(item);
    if (keys.has(key)) throw new ImportError(`${n}행: 같은 가맹점명과 주소가 중복되어 있습니다.`);
    keys.add(key); rows.push(item);
  }
  if (!rows.length || rows.length > 1000) throw new ImportError('식당은 1~1,000개여야 합니다. 빈 파일은 반영하지 않습니다.');
  return rows;
}
