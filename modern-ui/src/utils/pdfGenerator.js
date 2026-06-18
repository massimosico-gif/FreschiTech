import { jsPDF } from 'jspdf'
import { applyPlugin } from 'jspdf-autotable'
import { formatEuro, formatPercent, prepareClientPdfData, prepareInternalPdfData } from './pdfDataPreparer'
import { logoBase64 } from './logoBase64'

// Applica il plugin a jsPDF per renderlo disponibile come metodo doc.autoTable
applyPlugin(jsPDF);

// ─── Funzioni di Disegno (Layout) ───────────────────────────────────

// Common header drawer
const drawHeader = (doc, title, project, client, isInternal) => {
  const primaryColor = isInternal ? [30, 41, 59] : [79, 70, 229]; // Slate vs Indigo
  
  // Header line accent
  doc.setFillColor(...primaryColor);
  doc.rect(15, 15, doc.internal.pageSize.width - 30, 4, 'F');

  // Logo image
  doc.addImage(logoBase64, 'PNG', 15, 25, 54, 14.5);

  // Document details
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.text(title, doc.internal.pageSize.width - 15, 30, { align: 'right' });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text(`Data Report: ${new Date().toLocaleDateString('it-IT')}`, doc.internal.pageSize.width - 15, 36, { align: 'right' });
  
  if (isInternal) {
    doc.text(`ID Commessa: #${project.id}`, doc.internal.pageSize.width - 15, 41, { align: 'right' });
  }

  // Pre-calculate wrapped lines to determine dynamic box height
  const maxTextWidth = 78;
  const nameLines = doc.splitTextToSize(`Nome: ${project.name}`, maxTextWidth);
  const addressLines = doc.splitTextToSize(`Indirizzo: ${project.address || 'Nessuno'}`, maxTextWidth);
  
  const nameLinesRight = doc.splitTextToSize(`Ragione Sociale: ${client?.name || '---'}`, maxTextWidth);
  const addrStr = `${client?.street || ''} ${client?.city || ''} (${client?.province || ''})`.trim();
  const addressLinesRight = doc.splitTextToSize(`Indirizzo: ${addrStr || '---'}`, maxTextWidth);
  const emailLinesRight = doc.splitTextToSize(`Email: ${client?.email || '---'}`, maxTextWidth);

  const lineSpacing = 4.5;
  const topPadding = 12;
  const bottomPadding = 4;
  
  const leftLinesCount = nameLines.length + 1 + addressLines.length + 1;
  const leftRequiredHeight = topPadding + (leftLinesCount - 1) * lineSpacing + bottomPadding;
  
  const rightLinesCount = nameLinesRight.length + addressLinesRight.length + 1 + emailLinesRight.length + 1;
  const rightRequiredHeight = topPadding + (rightLinesCount - 1) * lineSpacing + bottomPadding;
  
  const boxHeight = Math.max(38, leftRequiredHeight, rightRequiredHeight);

  // Left: Commessa Details
  doc.setFillColor(248, 250, 252);
  doc.rect(15, 48, 88, boxHeight, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(15, 48, 88, boxHeight, 'S');

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text("DETTAGLI COMMESSA", 20, 54);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(70);
  
  let leftY = 60;
  nameLines.forEach(line => {
    doc.text(line, 20, leftY);
    leftY += lineSpacing;
  });
  
  const statusStr = project.status === 'active' ? 'Attiva' : 'Completata';
  doc.text(`Stato: ${statusStr}`, 20, leftY);
  leftY += lineSpacing;
  
  addressLines.forEach(line => {
    doc.text(line, 20, leftY);
    leftY += lineSpacing;
  });
  
  doc.text(`Distanza: ${project.distance || 0} km`, 20, leftY);

  // Right: Client Details
  doc.setFillColor(248, 250, 252);
  doc.rect(107, 48, doc.internal.pageSize.width - 122, boxHeight, 'F');
  doc.rect(107, 48, doc.internal.pageSize.width - 122, boxHeight, 'S');

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text("CLIENTE DESTINATARIO", 112, 54);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(70);
  
  let rightY = 60;
  nameLinesRight.forEach(line => {
    doc.text(line, 112, rightY);
    rightY += lineSpacing;
  });
  
  addressLinesRight.forEach(line => {
    doc.text(line, 112, rightY);
    rightY += lineSpacing;
  });
  
  const vatStr = client?.vat_id || client?.tax_code || '---';
  doc.text(`P.IVA / CF: ${vatStr}`, 112, rightY);
  rightY += lineSpacing;
  
  emailLinesRight.forEach(line => {
    doc.text(line, 112, rightY);
    rightY += lineSpacing;
  });
  
  doc.text(`Telefono: ${client?.phone || '---'}`, 112, rightY);

  return boxHeight;
};

// Footer page numbers
const addFooterPageNumbers = (doc) => {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      `Pagina ${i} di ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }
};

// ═══════════════════════════════════════════════════════════════════════
//  CLIENT PDF GENERATOR
//  Shows final client prices (markup included). Costs/markups hidden.
// ═══════════════════════════════════════════════════════════════════════

export const generateClientPdf = (project, client, costCenters, materials, labor, expenses) => {
  const doc = new jsPDF();
  
  // Draw header
  const headerBoxHeight = drawHeader(doc, "PROFORMA RIEPILOGATIVO COMMESSA", project, client, false);
  let currentY = 48 + headerBoxHeight + 6;

  // Prepare data (logica pura, nessun disegno)
  const { groups, grandTotalSale } = prepareClientPdfData(costCenters, materials, labor, expenses);

  // Render each group
  groups.forEach(group => {
    // Page break check
    if (currentY > doc.internal.pageSize.height - 40) {
      doc.addPage();
      currentY = 25;
    }

    // Group title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(group.title, 15, currentY);
    currentY += 4;

    // Table
    doc.autoTable({
      head: [['Codice', 'Descrizione della Voce', 'Q.tà', 'U.M.', 'Prezzo Unit.', 'Totale']],
      body: group.rows,
      startY: currentY,
      margin: { left: 15, right: 15 },
      theme: 'grid',
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8
      },
      columnStyles: {
        0: { cellWidth: 28, halign: 'left' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 15, halign: 'center' },
        3: { cellWidth: 22, halign: 'center' },
        4: { cellWidth: 28, halign: 'right' },
        5: { cellWidth: 28, halign: 'right' }
      },
      styles: {
        fontSize: 8,
        cellPadding: 1.8,
        valign: 'middle'
      },
      didParseCell: (data) => {
        if (data.section === 'head') {
          if (data.column.index === 2 || data.column.index === 3) {
            data.cell.styles.halign = 'center';
          } else {
            data.cell.styles.halign = 'left';
          }
        }
      },
      footStyles: {
        fillColor: [248, 250, 252],
        textColor: [30, 41, 59],
        fontStyle: 'bold'
      }
    });

    currentY = doc.lastAutoTable.finalY + 6;

    // Subtotal
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(`Totale Parziale: ${formatEuro(group.subtotal)}`, doc.internal.pageSize.width - 15, currentY, { align: 'right' });
    currentY += 10;
  });

  // Final summary box
  if (currentY > doc.internal.pageSize.height - 40) {
    doc.addPage();
    currentY = 25;
  }

  currentY += 5;
  doc.setDrawColor(79, 70, 229);
  doc.setFillColor(243, 244, 246);
  doc.rect(15, currentY, doc.internal.pageSize.width - 30, 22, 'FD');
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(30, 41, 59);
  doc.text("IMPORTO FINALE DA PAGARE", 22, currentY + 14);

  doc.setFontSize(16);
  doc.setTextColor(79, 70, 229);
  doc.text(formatEuro(grandTotalSale), doc.internal.pageSize.width - 22, currentY + 14, { align: 'right' });

  addFooterPageNumbers(doc);
  return doc;
};

// ═══════════════════════════════════════════════════════════════════════
//  INTERNAL PDF GENERATOR
//  Shows costs, markups, sales, margin in € and margin %
// ═══════════════════════════════════════════════════════════════════════

export const generateInternalPdf = (project, client, costCenters, materials, labor, expenses) => {
  const doc = new jsPDF();
  
  // Draw header
  const headerBoxHeight = drawHeader(doc, "REPORT INTERNO MARGINALITÀ COMMESSA", project, client, true);
  let currentY = 48 + headerBoxHeight + 6;

  // Prepare data (logica pura, nessun disegno)
  const { groups, summary } = prepareInternalPdfData(project, costCenters, materials, labor, expenses);

  // Render each group
  groups.forEach(group => {
    if (currentY > doc.internal.pageSize.height - 40) {
      doc.addPage();
      currentY = 25;
    }

    // Group title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(group.title, 15, currentY);
    currentY += 4;

    // Table
    doc.autoTable({
      head: [['Codice', 'Descrizione', 'Q.tà', 'U.M.', 'Costo Unit.', 'Rincaro', 'Prezzo Cli.', 'Utile €', 'Margine %']],
      body: group.rows,
      startY: currentY,
      margin: { left: 15, right: 15 },
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 7
      },
      columnStyles: {
        0: { cellWidth: 24, halign: 'left' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 10, halign: 'center' },
        3: { cellWidth: 16, halign: 'center' },
        4: { cellWidth: 20, halign: 'right' },
        5: { cellWidth: 16, halign: 'right' },
        6: { cellWidth: 20, halign: 'right' },
        7: { cellWidth: 20, halign: 'right' },
        8: { cellWidth: 16, halign: 'right' }
      },
      styles: {
        fontSize: 7,
        cellPadding: 1.4,
        valign: 'middle'
      },
      didParseCell: (data) => {
        if (data.section === 'head') {
          if (data.column.index === 2 || data.column.index === 3) {
            data.cell.styles.halign = 'center';
          } else {
            data.cell.styles.halign = 'left';
          }
        }
      }
    });

    currentY = doc.lastAutoTable.finalY + 6;

    // Subtotal and Margin for this cost center
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(
      `Costo: ${formatEuro(group.subtotalCost)} | Ricavo: ${formatEuro(group.subtotalSale)}`,
      15,
      currentY
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(
      `Margine CC: ${formatEuro(group.subtotalMargin)} (${formatPercent(group.subtotalMarginPercent)})`,
      doc.internal.pageSize.width - 15,
      currentY,
      { align: 'right' }
    );
    
    currentY += 12;
  });

  // Final summary dashboard
  if (currentY > doc.internal.pageSize.height - 76) {
    doc.addPage();
    currentY = 25;
  }

  currentY += 5;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.rect(15, currentY, doc.internal.pageSize.width - 30, 56, 'FD');

  const s = summary;

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text("ANALISI ECONOMICA COMMESSA", 20, currentY + 10);
  
  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.line(20, currentY + 14, doc.internal.pageSize.width - 20, currentY + 14);

  // Row 1: Cost vs Sale
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100);
  doc.text("Costo Totale:", 20, currentY + 22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(formatEuro(s.grandTotalCost), 75, currentY + 22);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text("Valore di Vendita Totale:", 115, currentY + 22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(formatEuro(s.grandTotalSale), 168, currentY + 22);

  // Row 2: Utile Teorico vs Margine Teorico %
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text("Utile Teorico a Listino:", 20, currentY + 29);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(16, 185, 129);
  doc.text(formatEuro(s.grandMargin), 75, currentY + 29);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text("Margine Teorico %:", 115, currentY + 29);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(79, 70, 229);
  doc.text(formatPercent(s.grandMarginPercent), 168, currentY + 29);

  // Row 3: Preventivo Accettato vs Scostamento
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text("Budget / Preventivo Accettato:", 20, currentY + 36);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(formatEuro(s.budget), 75, currentY + 36);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text("Scostamento da Listino:", 115, currentY + 36);
  doc.setFont("helvetica", "bold");
  if (s.budgetDiff < 0) {
    doc.setTextColor(239, 68, 68);
    doc.text(`${formatEuro(s.budgetDiff)}`, 168, currentY + 36);
  } else {
    doc.setTextColor(16, 185, 129);
    doc.text(`+${formatEuro(s.budgetDiff)}`, 168, currentY + 36);
  }

  // Row 4: Utile Effettivo vs Margine Effettivo %
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text("Utile Effettivo (su Budget):", 20, currentY + 43);
  doc.setFont("helvetica", "bold");
  if (s.utileEffettivo < 0) {
    doc.setTextColor(239, 68, 68);
    doc.text(`${formatEuro(s.utileEffettivo)}`, 75, currentY + 43);
  } else {
    doc.setTextColor(16, 185, 129);
    doc.text(`${formatEuro(s.utileEffettivo)}`, 75, currentY + 43);
  }

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text("Margine Effettivo %:", 115, currentY + 43);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(79, 70, 229);
  doc.text(formatPercent(s.utileEffettivoPercent), 168, currentY + 43);

  // Row 5: Ore Totali Lavorate
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text("Ore Totali Lavorate:", 20, currentY + 50);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(`${s.totalLaborHours} ore`, 75, currentY + 50);

  addFooterPageNumbers(doc);
  return doc;
};
