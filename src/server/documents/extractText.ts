import mammoth from 'mammoth';

export async function extractTextFromUpload(args: {
    filename: string;
    mime: string;
    bytes: ArrayBuffer;
}): Promise<string> {
    const name = args.filename.toLowerCase();
    const mime = args.mime.toLowerCase();
    const buf = Buffer.from(args.bytes);

    if (mime === 'application/pdf' || name.endsWith('.pdf')) {
        const mod = await import('pdf-parse');
        const pdfParse: (b: Buffer) => Promise<{ text?: string }> =
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ((mod as any).default ?? mod) as any;
        const out = await pdfParse(buf);
        return (out.text ?? '').trim();
    }

    if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || name.endsWith('.docx')) {
        const out = await mammoth.extractRawText({ buffer: buf });
        return (out.value ?? '').trim();
    }

    if (mime.startsWith('text/') || name.endsWith('.txt') || name.endsWith('.md')) {
        return buf.toString('utf8').trim();
    }

    return '';
}
