import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ExportOptions {
  orientation?: 'landscape' | 'portrait';
  pageBreakSelectors?: string[];
  quality?: number;
  scale?: number;
}

/**
 * Exports an HTML element to PDF with multi-page support
 * @param elementId - The ID of the HTML element to capture
 * @param filename - The name for the downloaded PDF file
 * @param options - Export configuration options
 */
export async function exportToPDF(
  elementId: string,
  filename: string,
  options: ExportOptions = {}
): Promise<void> {
  const {
    orientation = 'landscape',
    pageBreakSelectors = [],
    quality = 0.95,
    scale = 2,
  } = options;

  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  // Store original styles to restore later
  const originalOverflow = element.style.overflow;
  const originalHeight = element.style.height;
  const originalPosition = element.style.position;

  // Temporarily modify element to capture full content
  element.style.overflow = 'visible';
  element.style.height = 'auto';
  element.style.position = 'relative';

  try {
    // Capture the element as canvas
    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#0f172a', // Match the dark background
      logging: false,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    // PDF dimensions (in mm)
    const pdfWidth = orientation === 'landscape' ? 297 : 210; // A4
    const pdfHeight = orientation === 'landscape' ? 210 : 297;
    const margin = 10;

    const contentWidth = pdfWidth - margin * 2;
    const contentHeight = pdfHeight - margin * 2;

    // Calculate image dimensions
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    // Calculate scale to fit width
    const ratio = contentWidth / imgWidth;
    const scaledWidth = contentWidth;
    const scaledHeight = imgHeight * ratio;

    // Calculate number of pages needed
    const totalPages = Math.ceil(scaledHeight / contentHeight);

    // Create PDF
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
    });

    // Add pages
    for (let page = 0; page < totalPages; page++) {
      if (page > 0) {
        pdf.addPage();
      }

      // Calculate source Y position for this page
      const sourceY = (page * contentHeight) / ratio;
      const sourceHeight = Math.min(contentHeight / ratio, imgHeight - sourceY);

      // Create a temporary canvas for this page slice
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = imgWidth;
      pageCanvas.height = sourceHeight;

      const ctx = pageCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(
          canvas,
          0,
          sourceY,
          imgWidth,
          sourceHeight,
          0,
          0,
          imgWidth,
          sourceHeight
        );

        const pageImgData = pageCanvas.toDataURL('image/jpeg', quality);
        const pageScaledHeight = sourceHeight * ratio;

        pdf.addImage(
          pageImgData,
          'JPEG',
          margin,
          margin,
          scaledWidth,
          pageScaledHeight
        );
      }

      // Add page number footer
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text(
        `Paceful Investor Deck - Page ${page + 1} of ${totalPages}`,
        pdfWidth / 2,
        pdfHeight - 5,
        { align: 'center' }
      );
    }

    // Download the PDF
    pdf.save(filename);
  } finally {
    // Restore original styles
    element.style.overflow = originalOverflow;
    element.style.height = originalHeight;
    element.style.position = originalPosition;
  }
}

/**
 * Exports investor deck with section-based page breaks
 * Each major section becomes its own page for cleaner presentation
 */
export async function exportInvestorDeckToPDF(
  elementId: string,
  filename: string
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  // Find all major sections
  const sections = element.querySelectorAll('section, header, footer');

  if (sections.length === 0) {
    // Fallback to standard export if no sections found
    return exportToPDF(elementId, filename, { orientation: 'landscape' });
  }

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = 297;
  const pdfHeight = 210;
  const margin = 10;
  const contentWidth = pdfWidth - margin * 2;
  const contentHeight = pdfHeight - margin * 2;

  let isFirstPage = true;

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i] as HTMLElement;

    // Skip footer for separate page
    if (section.tagName.toLowerCase() === 'footer') {
      continue;
    }

    try {
      const canvas = await html2canvas(section, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#0f172a',
        logging: false,
      });

      if (!isFirstPage) {
        pdf.addPage();
      }
      isFirstPage = false;

      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      // Calculate scaling to fit the page while maintaining aspect ratio
      const widthRatio = contentWidth / imgWidth;
      const heightRatio = contentHeight / imgHeight;
      const ratio = Math.min(widthRatio, heightRatio);

      const scaledWidth = imgWidth * ratio;
      const scaledHeight = imgHeight * ratio;

      // Center the content on the page
      const x = margin + (contentWidth - scaledWidth) / 2;
      const y = margin + (contentHeight - scaledHeight) / 2;

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', x, y, scaledWidth, scaledHeight);

      // Add page number footer
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      const pageNum = i + 1;
      const totalPages = sections.length - 1; // Exclude footer
      pdf.text(
        `Paceful Investor Deck - Page ${pageNum} of ${totalPages}`,
        pdfWidth / 2,
        pdfHeight - 5,
        { align: 'center' }
      );
    } catch (error) {
      console.error(`Error capturing section ${i}:`, error);
    }
  }

  pdf.save(filename);
}
