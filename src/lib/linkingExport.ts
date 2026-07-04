import { getRessourceLabel } from '@/config/resourceConfig';

export interface LinkingExportRow {
  id: number;
  title: string;
  type: string;
  keywords: string[];
}

function escapeCsvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/**
 * Télécharge un fichier CSV (UTF-8 BOM, séparateur ;) compatible Excel français.
 */
export function downloadLinkingCatalogExcel(rows: LinkingExportRow[], filenamePrefix = 'catalogue-liens-edisem'): void {
  const headers = ['ID', 'Titre', 'Mots-clés', 'Type'];
  const lines = [
    headers.join(';'),
    ...rows.map((row) => {
      const keywords = row.keywords.join(', ');
      const typeLabel = getRessourceLabel(row.type);
      return [String(row.id), row.title, keywords, typeLabel].map(escapeCsvCell).join(';');
    }),
  ];

  const date = new Date().toISOString().slice(0, 10);
  const blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${filenamePrefix}-${date}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
