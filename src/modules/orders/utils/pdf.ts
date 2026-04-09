import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const generateInvoicePDF = (order: any, logoBase64?: string | null) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // ----- HEADER -----
  if (logoBase64) {
    // Determine format from base64 string
    const formatMatch = logoBase64.match(/data:image\/(.*?);base64,/);
    const format = formatMatch ? formatMatch[1].toUpperCase() : 'PNG';
    // Add image. (x, y, width, height)
    doc.addImage(logoBase64, format, 14, 15, 40, 20, undefined, 'FAST');
  }

  // "Cotización" text, top right
  doc.setFontSize(28);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(33, 43, 54);
  doc.text("Cotización", pageWidth - 14, 25, { align: "right" });

  // Invoice Number
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text(`# ${order.id}`, pageWidth - 14, 32, { align: "right" });

  // Date
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("Fecha:", pageWidth - 50, 45, { align: "right" });
  doc.setTextColor(33, 43, 54);
  doc.text(new Date(order.created_at).toLocaleDateString(), pageWidth - 14, 45, { align: "right" });

  // Balance Due block
  doc.setFillColor(245, 245, 245);
  doc.rect(pageWidth - 80, 50, 66, 10, "F");

  doc.setFont("helvetica", "bold");
  doc.text("Total a Pagar:", pageWidth - 45, 56.5, { align: "right" });
  const total = Number(order.total ?? 0).toFixed(2);
  doc.text(`$${total}`, pageWidth - 14, 56.5, { align: "right" });

  // ----- BILLING INFO -----
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  // Cobrar A (Solo Nombre)
  doc.setTextColor(150, 150, 150);
  doc.text("Cobrar A:", 14, 65);
  doc.setTextColor(33, 43, 54);
  doc.setFont("helvetica", "bold");
  doc.text(order.profile?.full_name ?? "Desconocido", 14, 71);

  // Enviar A (Dirección completa)
  doc.setFont("helvetica", "normal");
  doc.setTextColor(150, 150, 150);
  doc.text("Enviar A:", 90, 65);
  doc.setTextColor(33, 43, 54);

  doc.setFont("helvetica", "normal");
  let addressY = 71;
  if (order.address) {
    const addressLines = [];
    if (order.address.address) addressLines.push(order.address.address);
    if (order.address.address_line_2) addressLines.push(order.address.address_line_2);

    let locationLine = "";
    if (order.address.department_name || order.address.department_id) {
      locationLine += (order.address.department_name ?? order.address.department_id);
    }
    if (locationLine) addressLines.push(locationLine);
    if (order.address.phone) addressLines.push(`Tel: ${order.address.phone}`);

    const fullAddressText = addressLines.join("\n");
    const splitAddress = doc.splitTextToSize(fullAddressText, 70);
    doc.text(splitAddress, 90, addressY);
    addressY += (splitAddress.length * 5);
  }

  // ----- ITEMS TABLE -----
  const tableColumn = ["Artículo", "Cantidad", "Precio", "Monto"];
  const tableRows: any[] = [];

  const items = order.items ?? [];
  items.forEach((item: any) => {
    const name = item.name ?? item.product_name ?? item.product?.name ?? item.product_id ?? "-";
    const quantity = item.quantity ?? 1;
    const price = item.unit_price ?? item.sale_price ?? item.price ?? 0;
    const subtotal = price * quantity;

    tableRows.push([
      name,
      quantity.toString(),
      `$${Number(price).toFixed(2)}`,
      `$${Number(subtotal).toFixed(2)}`
    ]);
  });

  // Calculate table offset dynamically based on address length
  const tableStartY = Math.max(90, addressY + 10);

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: tableStartY,
    theme: 'plain',
    headStyles: {
      fillColor: [50, 50, 50],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    bodyStyles: {
      textColor: [50, 50, 50],
    },
    columnStyles: {
      0: { cellWidth: 'auto' }, // Item (takes remaining)
      1: { cellWidth: 25, halign: 'center' }, // Quantity
      2: { cellWidth: 30, halign: 'right' }, // Rate
      3: { cellWidth: 30, halign: 'right' }  // Amount
    },
    margin: { left: 14, right: 14 },
    willDrawCell: function (data) {
      // Add a bottom border to each row in the body
      if (data.section === 'body' && data.row.index !== tableRows.length - 1) {
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.1);
        doc.line(
          data.cell.x,
          data.cell.y + data.cell.height,
          data.cell.x + data.cell.width,
          data.cell.y + data.cell.height
        );
      }
    }
  });

  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : tableStartY;

  // ----- TOTALS (Bottom right) -----
  const totalsX = pageWidth - 65;
  const valuesX = pageWidth - 14;
  let currentY = finalY + 15;

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");

  // Subtotal
  doc.text("Subtotal:", totalsX, currentY, { align: "right" });
  doc.setTextColor(33, 43, 54);
  doc.text(`$${Number(order.subtotal ?? 0).toFixed(2)}`, valuesX, currentY, { align: "right" });

  // Shipping / Tax
  currentY += 7;
  doc.setTextColor(100, 100, 100);
  doc.text("Envío:", totalsX, currentY, { align: "right" });
  doc.setTextColor(33, 43, 54);
  doc.text(`$${Number(order.shipping ?? 0).toFixed(2)}`, valuesX, currentY, { align: "right" });

  // Total
  currentY += 10;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);
  doc.text("Total:", totalsX, currentY, { align: "right" });
  doc.setTextColor(33, 43, 54);
  doc.text(`$${total}`, valuesX, currentY, { align: "right" });

  // ----- NOTES / TERMS (Bottom left) -----
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Notas:", 14, currentY - 5);
  doc.setTextColor(33, 43, 54);
  doc.text("Gracias por su compra.", 14, currentY);

  // Download
  doc.save(`Cotizacion_${order.id}.pdf`);
};
