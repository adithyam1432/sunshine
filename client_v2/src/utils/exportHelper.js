import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Handles exporting data to CSV or PDF.
 * @param {string} type - 'csv' or 'pdf'
 * @param {Array} data - Array of objects to export
 * @param {Array} columns - Array of column definitions: { header: 'Title', key: 'dataKey' }
 * @param {string} fileName - Base filename without extension
 * @param {string} title - Title for the PDF document
 */
export const handleExport = async (type, data, columns, fileName, title) => {
    try {
        if (type === 'csv') {
            await generateCSV(data, columns, fileName);
        } else {
            await generatePDF(data, columns, fileName, title);
        }
    } catch (error) {
        console.error("Export failed:", error);
        alert("Export failed: " + error.message);
    }
};

const generateCSV = async (data, columns, fileName) => {
    const escape = (str) => {
        if (str === null || str === undefined) return '';
        return String(str).replace(/"/g, '""');
    };

    const headers = columns.map(c => c.header).join(',');
    const rows = data.map(row =>
        columns.map(c => `"${escape(row[c.key])}"`).join(',')
    ).join('\n');

    const csvContent = [headers, rows].join('\n');
    const fullFileName = `${fileName}.csv`;

    await shareFile(csvContent, fullFileName, 'text/csv', 'Export CSV');
};

const generatePDF = async (data, columns, fileName, title) => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

    // Table
    const tableColumn = columns.map(c => c.header);
    const tableRows = data.map(row => columns.map(c => row[c.key]));

    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 40,
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: [79, 70, 229] } // Primary color approximate
    });

    // Output
    const pdfOutput = doc.output('datauristring');
    // For sharing, we usually need base64 data (without prefix) or writing to file
    // doc.output('datauristring') returns "data:application/pdf;filename=generated.pdf;base64,..."
    // We can write binary data directly if using Capacitor

    // Easier for Capacitor WriteFile: use base64 string
    const base64Data = doc.output('datauristring').split(',')[1];

    // For Web fallback
    if (!Capacitor.isNativePlatform()) {
        doc.save(`${fileName}.pdf`);
        return;
    }

    await shareFile(base64Data, `${fileName}.pdf`, 'application/pdf', 'Export PDF', true);
};

const shareFile = async (data, fileName, mimeType, dialogTitle, isBase64 = false) => {
    if (Capacitor.isNativePlatform()) {
        // Write to Cache
        await Filesystem.writeFile({
            path: fileName,
            data: data,
            directory: Directory.Cache,
            encoding: isBase64 ? undefined : Encoding.UTF8 // undefined defaults to binary/base64 in some versions, but explicit 'utf8' for text
        });

        // Get URI
        const uriResult = await Filesystem.getUri({
            directory: Directory.Cache,
            path: fileName
        });

        // Share
        await Share.share({
            title: dialogTitle,
            text: `Here is your ${fileName}`,
            url: uriResult.uri,
            dialogTitle: dialogTitle
        });
    } else {
        // Web Fallback (CSV only usually, PDF handled by doc.save)
        if (mimeType === 'application/pdf') return; // Handled by jsPDF.save()

        const blob = new Blob([data], { type: `${mimeType};charset=utf-8;` });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
