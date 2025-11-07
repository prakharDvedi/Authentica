/**
 * Certificate Generation Utility
 */

import jsPDF from 'jspdf';
import QRCode from 'qrcode';

export interface CertificateData {
  creator: string;
  prompt: string;
  timestamp: string;
  combinedHash: string;
  txHash: string;
  ipfsLink: string;
  verificationUrl: string;
  faceHash?: string;
  faceVerified?: boolean;
}

/**
 * Generate PDF certificate
 */
export async function generatePDFCertificate(cert: CertificateData): Promise<void> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);

  const primaryColor: [number, number, number] = [34, 197, 94];
  const secondaryColor: [number, number, number] = [16, 185, 129];
  const textColor: [number, number, number] = [28, 25, 23];
  const lightGray: [number, number, number] = [245, 245, 244];

  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.text('AUTHENTICA', pageWidth / 2, 25, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Certificate of Authenticity', pageWidth / 2, 35, { align: 'center' });

  let yPos = 60;

  doc.setTextColor(...textColor);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('AI Artwork Proof of Creation', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  doc.setDrawColor(...secondaryColor);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 15;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setFont('helvetica', 'bold');
  doc.text('Creator:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(cert.creator.substring(0, 42) + (cert.creator.length > 42 ? '...' : ''), margin + 25, yPos);
  yPos += 10;

  doc.setFont('helvetica', 'bold');
  doc.text('Created:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(cert.timestamp).toLocaleString(), margin + 25, yPos);
  yPos += 10;

  doc.setFont('helvetica', 'bold');
  doc.text('Prompt:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  const promptLines = doc.splitTextToSize(cert.prompt, contentWidth - 25);
  doc.text(promptLines, margin + 25, yPos);
  yPos += promptLines.length * 5 + 5;

  doc.setFont('helvetica', 'bold');
  doc.text('Proof Hash:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...secondaryColor);
  const hashLines = doc.splitTextToSize(cert.combinedHash, contentWidth - 25);
  doc.text(hashLines, margin + 30, yPos);
  yPos += hashLines.length * 4 + 8;

  if (cert.txHash && cert.txHash !== 'not-registered') {
    doc.setFontSize(10);
    doc.setTextColor(...textColor);
    doc.setFont('helvetica', 'bold');
    doc.text('Blockchain TX:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...secondaryColor);
    const txLines = doc.splitTextToSize(cert.txHash, contentWidth - 30);
    doc.text(txLines, margin + 35, yPos);
    yPos += txLines.length * 4 + 8;
  }

  if (cert.faceVerified) {
    doc.setFontSize(10);
    doc.setTextColor(...textColor);
    doc.setFont('helvetica', 'bold');
    doc.text('Face Verified:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...secondaryColor);
    doc.text('✓ Verified', margin + 35, yPos);
    yPos += 10;
  }

  doc.setFontSize(10);
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'bold');
  doc.text('Verify at:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(59, 130, 246); // Blue
  const urlLines = doc.splitTextToSize(cert.verificationUrl, contentWidth - 25);
  doc.text(urlLines, margin + 25, yPos);
  yPos += urlLines.length * 4 + 10;

  const qrSize = 40;
  const qrX = pageWidth - margin - qrSize;
  const qrY = yPos;

  try {
    const qrImageData = await QRCode.toDataURL(cert.verificationUrl, {
      width: 200,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    
    doc.addImage(qrImageData, 'PNG', qrX, qrY, qrSize, qrSize);
  } catch (error) {
    console.error('Failed to add QR code:', error);
    doc.setDrawColor(...secondaryColor);
    doc.setLineWidth(0.5);
    doc.rect(qrX, qrY, qrSize, qrSize);
    doc.setFontSize(8);
    doc.setTextColor(...textColor);
    doc.text('QR Code', qrX + qrSize / 2, qrY + qrSize / 2, { align: 'center' });
  }

  doc.setFontSize(8);
  doc.setTextColor(...textColor);
  doc.text('Scan to verify', qrX + qrSize / 2, qrY + qrSize + 5, { align: 'center' });

  const footerY = pageHeight - 20;
  doc.setDrawColor(...lightGray);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFontSize(8);
  doc.setTextColor(120, 113, 108);
  doc.setFont('helvetica', 'italic');
  doc.text('This certificate proves the authenticity and ownership of AI-generated artwork.', pageWidth / 2, footerY + 8, { align: 'center' });
  doc.text('Stored immutably on blockchain and IPFS.', pageWidth / 2, footerY + 12, { align: 'center' });

  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128);
  doc.setFont('helvetica', 'normal');
  doc.text(`IPFS: ${cert.ipfsLink.substring(0, 50)}...`, pageWidth / 2, footerY + 16, { align: 'center' });

  doc.save(`Authentica-Certificate-${cert.combinedHash.substring(0, 8)}.pdf`);
}

