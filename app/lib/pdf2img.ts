export interface PdfConversionResult {
  imageUrl: string;
  file: File | null;
  error?: string;
}

let pdfjsLib: any = null;
let isLoading = false;
let loadPromise: Promise<any> | null = null;

async function loadPdfJs(): Promise<any> {
  if (pdfjsLib) return pdfjsLib;
  if (loadPromise) return loadPromise;

  isLoading = true;
  // @ts-expect-error - pdfjs-dist/build/pdf.mjs is not a module
  loadPromise = import("pdfjs-dist/build/pdf.mjs")
    .then((lib) => {
      // Set worker source - try multiple fallback paths
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const workerPaths = [
        `${baseUrl}/pdf.worker.min.mjs`,
        `${baseUrl}/pdf.worker.mjs`,
        '/pdf.worker.min.mjs',
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs'
      ];
      
      // Try first available worker path
      lib.GlobalWorkerOptions.workerSrc = workerPaths[0];
      
      pdfjsLib = lib;
      isLoading = false;
      return lib;
    })
    .catch((err) => {
      console.error('Failed to load PDF.js:', err);
      loadPromise = null;
      isLoading = false;
      throw new Error(`PDF.js loading failed: ${err.message}`);
    });

  return loadPromise;
}

export async function convertPdfToImage(
  file: File
): Promise<PdfConversionResult> {
  try {
    // Validate input
    if (!file) {
      return {
        imageUrl: "",
        file: null,
        error: "No file provided",
      };
    }

    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      return {
        imageUrl: "",
        file: null,
        error: "File must be a PDF",
      };
    }

    if (typeof window === "undefined" || typeof document === "undefined") {
      return {
        imageUrl: "",
        file: null,
        error: "PDF conversion is only available in the browser.",
      };
    }

    console.log('Loading PDF.js library...');
    const lib = await loadPdfJs();
    console.log('PDF.js library loaded successfully');

    console.log('Reading PDF file...');
    const arrayBuffer = await file.arrayBuffer();
    console.log(`PDF file read: ${arrayBuffer.byteLength} bytes`);
    
    console.log('Loading PDF document...');
    const pdf = await lib.getDocument({ data: arrayBuffer }).promise;
    console.log(`PDF loaded with ${pdf.numPages} pages`);
    
    console.log('Getting first page...');
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: 4 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    if (!context) {
      throw new Error("Failed to obtain 2D canvas context.");
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    await page.render({ canvasContext: context, viewport }).promise;

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            // Create a File from the blob with the same name as the pdf
            const originalName = file.name.replace(/\.pdf$/i, "");
            const imageFile = new File([blob], `${originalName}.png`, {
              type: "image/png",
            });

            resolve({
              imageUrl: URL.createObjectURL(blob),
              file: imageFile,
            });
          } else {
            resolve({
              imageUrl: "",
              file: null,
              error: "Failed to create image blob",
            });
          }
        },
        "image/png",
        1.0
      ); // Set quality to maximum (1.0)
    });
  } catch (err) {
    return {
      imageUrl: "",
      file: null,
      error: `Failed to convert PDF: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }
}
