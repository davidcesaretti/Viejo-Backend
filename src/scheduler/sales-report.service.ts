import { Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { SaleRepository } from '../repositories/sale/sale.repository';
import type { SaleDocument } from '../repositories/sale/sale.schema';

// ─── Palette ─────────────────────────────────────────────────────────────────
const C = {
  TITLE_BG:      'FF3730A3', // indigo-700
  TITLE_FG:      'FFFFFFFF',
  COL_HEADER_BG: 'FF4F46E5', // indigo-600
  COL_HEADER_FG: 'FFFFFFFF',
  CLIENT_BAR_BG: 'FFEDE9FE', // violet-100
  CLIENT_BAR_FG: 'FF4C1D95', // violet-900
  SUBTOTAL_BG:   'FFE0E7FF', // indigo-100
  SUBTOTAL_FG:   'FF312E81', // indigo-900
  ROW_ODD:       'FFFFFFFF',
  ROW_EVEN:      'FFF5F3FF', // violet-50
  SUMMARY_BG:    'FF1E1B4B', // indigo-950
  TOTAL_BG:      'FFC7D2FE', // indigo-200
  TOTAL_FG:      'FF1E1B4B',
  PAID_FG:       'FF16A34A',
  PARTIAL_FG:    'FFD97706',
  UNPAID_FG:     'FFDC2626',
};

function fill(argb: string): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}
function fnt(argb: string, bold = false, size = 10): Partial<ExcelJS.Font> {
  return { color: { argb }, bold, size, name: 'Calibri' };
}
function brd(): Partial<ExcelJS.Borders> {
  const s = { style: 'thin' as ExcelJS.BorderStyle, color: { argb: 'FFD4D4D4' } };
  return { top: s, bottom: s, left: s, right: s };
}
function fmtDate(d: Date): string {
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}
function fmtCurrency(n: number): string {
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function applyColHeader(row: ExcelJS.Row) {
  row.eachCell((c) => {
    c.fill = fill(C.COL_HEADER_BG);
    c.font = fnt(C.COL_HEADER_FG, true, 10);
    c.border = brd();
    c.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  row.height = 22;
}
function applyDataRow(row: ExcelJS.Row, even: boolean) {
  row.eachCell({ includeEmpty: true }, (c) => {
    c.fill = fill(even ? C.ROW_EVEN : C.ROW_ODD);
    c.border = brd();
    c.font = fnt('FF1F2937', false, 10);
    c.alignment = { vertical: 'middle' };
  });
  row.height = 18;
}

@Injectable()
export class SalesReportService {
  private readonly logger = new Logger(SalesReportService.name);

  constructor(private readonly saleRepository: SaleRepository) {}

  /**
   * Genera un buffer Excel con las ventas del rango de fechas indicado.
   * @param dateFrom  Inicio del día (00:00:00)
   * @param dateTo    Fin del día (23:59:59.999)
   */
  async generateExcelBuffer(dateFrom: Date, dateTo: Date): Promise<Buffer> {
    const docs = await this.saleRepository.findAllForExport(
      undefined,
      dateFrom,
      dateTo,
    );
    this.logger.log(
      `Generando Excel para ${fmtDate(dateFrom)} — ${docs.length} ventas encontradas`,
    );

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Sistema de Gestión';
    wb.created = new Date();

    this.buildDetailSheet(wb, docs, dateFrom);
    this.buildProductSheet(wb, docs);

    return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }

  // ─── Hoja 1: Detalle de ventas ──────────────────────────────────────────────
  private buildDetailSheet(
    wb: ExcelJS.Workbook,
    docs: SaleDocument[],
    date: Date,
  ) {
    const ws = wb.addWorksheet('Detalle de ventas', {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
    });

    // Ancho de columnas
    ws.getColumn('A').width = 13; // Fecha
    ws.getColumn('B').width = 22; // Cliente
    ws.getColumn('C').width = 24; // Producto
    ws.getColumn('D').width = 14; // Variante
    ws.getColumn('E').width = 10; // Cantidad
    ws.getColumn('F').width = 14; // Precio unit.
    ws.getColumn('G').width = 14; // Subtotal
    ws.getColumn('H').width = 14; // Cobrado
    ws.getColumn('I').width = 14; // Saldo

    // Título
    const titleRow = ws.addRow([`REPORTE DE VENTAS — ${fmtDate(date)}`]);
    ws.mergeCells(`A1:I1`);
    titleRow.getCell(1).fill = fill(C.TITLE_BG);
    titleRow.getCell(1).font = fnt(C.TITLE_FG, true, 13);
    titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    titleRow.height = 28;

    const sub = ws.addRow([
      `Generado: ${new Date().toLocaleString('es-AR')}  |  Total ventas: ${docs.length}`,
    ]);
    ws.mergeCells(`A2:I2`);
    sub.getCell(1).fill = fill('FFE0E7FF');
    sub.getCell(1).font = fnt('FF312E81', false, 10);
    sub.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    sub.height = 18;

    ws.addRow([]);

    // Cabecera de columnas
    const ch = ws.addRow(['Fecha', 'Cliente', 'Producto', 'Variante', 'Cantidad', 'Precio unit.', 'Subtotal', 'Cobrado', 'Saldo']);
    applyColHeader(ch);

    // Agrupar por cliente
    const byClient = new Map<string, { name: string; docs: SaleDocument[] }>();
    for (const doc of docs) {
      const pop = doc.clientId as unknown as { _id: unknown; name: string } | string;
      const clientId = typeof pop === 'object' && pop !== null && '_id' in pop
        ? String(pop._id) : String(doc.clientId);
      const clientName = typeof pop === 'object' && pop !== null && 'name' in pop
        ? pop.name : 'Sin cliente';
      if (!byClient.has(clientId)) byClient.set(clientId, { name: clientName, docs: [] });
      byClient.get(clientId)!.docs.push(doc);
    }

    let rowIdx = 0;
    let grandTotal = 0;
    let grandPaid = 0;

    for (const { name: clientName, docs: clientDocs } of byClient.values()) {
      // Barra de cliente
      const barRow = ws.addRow([clientName, ...Array(8).fill('')]);
      ws.mergeCells(`A${barRow.number}:I${barRow.number}`);
      barRow.getCell(1).fill = fill(C.CLIENT_BAR_BG);
      barRow.getCell(1).font = fnt(C.CLIENT_BAR_FG, true, 10);
      barRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      barRow.eachCell((c) => { c.border = brd(); });
      barRow.height = 20;

      let cliTotal = 0;
      let cliPaid = 0;

      for (const doc of clientDocs) {
        const saleDate = doc.saleDate instanceof Date ? fmtDate(doc.saleDate) : '';
        const salePaid = doc.amountPaid ?? 0;
        const saleTotal = doc.totalAmount;

        for (const item of doc.items ?? []) {
          const fraction = saleTotal > 0 ? item.subtotal / saleTotal : 0;
          const itemPaid = Math.round(salePaid * fraction * 100) / 100;
          const itemSaldo = Math.round((item.subtotal - itemPaid) * 100) / 100;

          const row = ws.addRow([
            saleDate,
            clientName,
            item.productName,
            item.variantName || '—',
            item.quantity,
            fmtCurrency(item.unitPrice),
            fmtCurrency(item.subtotal),
            fmtCurrency(itemPaid),
            fmtCurrency(itemSaldo),
          ]);
          applyDataRow(row, rowIdx % 2 === 1);
          for (const col of [5, 6, 7, 8, 9]) {
            row.getCell(col).alignment = { vertical: 'middle', horizontal: 'right' };
          }
          // Color saldo
          const sCell = row.getCell(9);
          if (itemSaldo <= 0) sCell.font = fnt(C.PAID_FG, false, 10);
          else if (itemPaid > 0) sCell.font = fnt(C.PARTIAL_FG, false, 10);
          else sCell.font = fnt(C.UNPAID_FG, false, 10);

          rowIdx++;
        }
        cliTotal += saleTotal;
        cliPaid += salePaid;
      }

      // Subtotal cliente
      const st = ws.addRow(['', `Subtotal ${clientName}`, '', '', '', '', fmtCurrency(cliTotal), fmtCurrency(cliPaid), fmtCurrency(cliTotal - cliPaid)]);
      st.eachCell({ includeEmpty: true }, (c) => {
        c.fill = fill(C.SUBTOTAL_BG);
        c.font = fnt(C.SUBTOTAL_FG, true, 10);
        c.border = brd();
        c.alignment = { vertical: 'middle' };
      });
      for (const col of [7, 8, 9]) st.getCell(col).alignment = { vertical: 'middle', horizontal: 'right' };
      st.height = 20;
      ws.mergeCells(`B${st.number}:F${st.number}`);

      grandTotal += cliTotal;
      grandPaid += cliPaid;
    }

    // Total general
    ws.addRow([]);
    const tot = ws.addRow(['', 'TOTAL GENERAL', '', '', '', '', fmtCurrency(grandTotal), fmtCurrency(grandPaid), fmtCurrency(grandTotal - grandPaid)]);
    tot.eachCell({ includeEmpty: true }, (c) => {
      c.fill = fill(C.TOTAL_BG);
      c.font = fnt(C.TOTAL_FG, true, 11);
      c.border = brd();
      c.alignment = { vertical: 'middle' };
    });
    for (const col of [7, 8, 9]) tot.getCell(col).alignment = { vertical: 'middle', horizontal: 'right' };
    tot.height = 24;
    ws.mergeCells(`B${tot.number}:F${tot.number}`);
  }

  // ─── Hoja 2: Resumen por producto ───────────────────────────────────────────
  private buildProductSheet(wb: ExcelJS.Workbook, docs: SaleDocument[]) {
    const ws = wb.addWorksheet('Resumen por producto', {
      pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1 },
    });

    ws.getColumn('A').width = 26;
    ws.getColumn('B').width = 16;
    ws.getColumn('C').width = 12;
    ws.getColumn('D').width = 16;
    ws.getColumn('E').width = 16;
    ws.getColumn('F').width = 16;

    const title = ws.addRow(['RESUMEN POR PRODUCTO']);
    ws.mergeCells(`A1:F1`);
    title.getCell(1).fill = fill(C.SUMMARY_BG);
    title.getCell(1).font = fnt(C.TITLE_FG, true, 13);
    title.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    title.height = 28;
    ws.addRow([]);

    const ch = ws.addRow(['Producto', 'Variante', 'Unidades', 'Total facturado', 'Total cobrado', 'Saldo pendiente']);
    applyColHeader(ch);

    // Agrupar por producto+variante
    const map = new Map<string, { product: string; variant: string; units: number; amount: number; paid: number }>();
    for (const doc of docs) {
      const salePaid = doc.amountPaid ?? 0;
      const saleTotal = doc.totalAmount;
      for (const item of doc.items ?? []) {
        const key = `${item.productName}|${item.variantName ?? ''}`;
        if (!map.has(key)) map.set(key, { product: item.productName, variant: item.variantName ?? '', units: 0, amount: 0, paid: 0 });
        const ps = map.get(key)!;
        ps.units += item.quantity;
        ps.amount += item.subtotal;
        const frac = saleTotal > 0 ? item.subtotal / saleTotal : 0;
        ps.paid += Math.round(salePaid * frac * 100) / 100;
      }
    }

    const sorted = [...map.values()].sort((a, b) => b.amount - a.amount);
    let sumU = 0, sumA = 0, sumP = 0;
    let rowIdx = 0;

    for (const ps of sorted) {
      const saldo = ps.amount - ps.paid;
      const row = ws.addRow([ps.product, ps.variant || '—', ps.units, fmtCurrency(ps.amount), fmtCurrency(ps.paid), fmtCurrency(saldo)]);
      applyDataRow(row, rowIdx % 2 === 1);
      for (const col of [3, 4, 5, 6]) row.getCell(col).alignment = { vertical: 'middle', horizontal: 'right' };
      const sc = row.getCell(6);
      if (saldo <= 0) sc.font = fnt(C.PAID_FG, false, 10);
      else if (ps.paid > 0) sc.font = fnt(C.PARTIAL_FG, false, 10);
      else sc.font = fnt(C.UNPAID_FG, false, 10);
      sumU += ps.units;
      sumA += ps.amount;
      sumP += ps.paid;
      rowIdx++;
    }

    ws.addRow([]);
    const tot = ws.addRow(['TOTAL', '', sumU, fmtCurrency(sumA), fmtCurrency(sumP), fmtCurrency(sumA - sumP)]);
    tot.eachCell({ includeEmpty: true }, (c) => {
      c.fill = fill(C.TOTAL_BG);
      c.font = fnt(C.TOTAL_FG, true, 11);
      c.border = brd();
      c.alignment = { vertical: 'middle' };
    });
    for (const col of [3, 4, 5, 6]) tot.getCell(col).alignment = { vertical: 'middle', horizontal: 'right' };
    tot.height = 24;
  }
}
