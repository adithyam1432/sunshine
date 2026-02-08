import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Handles exporting data to CSV.
 * @param {Array} data - Array of objects to export
 * @param {Array} columns - Array of column definitions: { header: 'Title', key: 'dataKey' }
 * @param {string} fileName - Base filename without extension
 * @param {string} title - Title for the share dialog
 */
export const handleExport = async (data, columns, fileName, title) => {
    try {
        await generateCSV(data, columns, fileName, title);
    } catch (error) {
        console.error("Export failed:", error);
        alert("Export failed: " + error.message);
    }
};

const generateCSV = async (data, columns, fileName, title) => {
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

    await shareFile(csvContent, fullFileName, 'text/csv', title || 'Export CSV');
};

const shareFile = async (data, fileName, mimeType, dialogTitle) => {
    if (Capacitor.isNativePlatform()) {
        // Write to Cache
        await Filesystem.writeFile({
            path: fileName,
            data: data,
            directory: Directory.Cache,
            encoding: Encoding.UTF8
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
        // Web Fallback
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
