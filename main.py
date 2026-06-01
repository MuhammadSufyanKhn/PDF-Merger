from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import fitz  # PyMuPDF
import base64
import io
from PIL import Image

app = FastAPI(title="PDF Merger API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store: pdf_id -> raw bytes
pdf_store: dict[str, bytes] = {}


class CropData(BaseModel):
    x: float       # pixels on the rendered image
    y: float
    width: float
    height: float
    naturalWidth: float   # original rendered image width
    naturalHeight: float  # original rendered image height


class PageItem(BaseModel):
    pdf_id: str
    page_num: int                    # 0-indexed
    crop: Optional[CropData] = None
    image_data: Optional[str] = None  # base64 PNG — set when page was edited client-side


class MergeRequest(BaseModel):
    pages: List[PageItem]


# ── /extract ──────────────────────────────────────────────────────────────────

@app.post("/extract")
async def extract(files: List[UploadFile] = File(...)):
    """
    Receive N PDFs, render every page to a PNG thumbnail, return JSON array.
    All PDF bytes are stored in memory so /merge can access them later.
    """
    result = []

    for upload in files:
        raw = await upload.read()
        pdf_id = upload.filename or f"pdf_{len(pdf_store)}"

        # Handle duplicate filenames
        base_id = pdf_id
        counter = 1
        while pdf_id in pdf_store:
            pdf_id = f"{base_id}__{counter}"
            counter += 1

        pdf_store[pdf_id] = raw

        try:
            doc = fitz.open(stream=raw, filetype="pdf")
        except Exception as e:
            raise HTTPException(400, f"Cannot open {upload.filename}: {e}")

        for i in range(len(doc)):
            page = doc.load_page(i)
            # Thumbnail at 150 DPI — good balance of quality vs payload size
            pix = page.get_pixmap(dpi=150)
            png_bytes = pix.tobytes("png")
            b64 = base64.b64encode(png_bytes).decode()

            result.append({
                "id": f"{pdf_id}__p{i}",
                "pdf_id": pdf_id,
                "page_num": i,
                "filename": upload.filename,
                "thumbnail": f"data:image/png;base64,{b64}",
                "width": page.rect.width,
                "height": page.rect.height,
            })

    return {"pages": result, "total": len(result)}


# ── /merge ────────────────────────────────────────────────────────────────────

@app.post("/merge")
async def merge(req: MergeRequest):
    """
    Build the final PDF from the ordered page list.
    Applies crop if provided (coordinates are relative to the rendered PNG).
    """
    if not req.pages:
        raise HTTPException(400, "No pages supplied.")

    final = fitz.open()

    for item in req.pages:
        # ── Case 1: client sent a pre-rendered image (rotation/text/adjustments applied) ──
        if item.image_data:
            img_bytes = base64.b64decode(item.image_data)
            # Get image dimensions via PIL
            from io import BytesIO
            pil_img = Image.open(BytesIO(img_bytes))
            w_px, h_px = pil_img.size
            # Convert pixels → PDF points at 150 DPI (same as thumbnail render)
            dpi = 150
            w_pts = w_px * 72 / dpi
            h_pts = h_px * 72 / dpi
            new_page = final.new_page(width=w_pts, height=h_pts)
            new_page.insert_image(new_page.rect, stream=img_bytes)
            continue

        # ── Case 2: original PDF page, with optional crop ──
        raw = pdf_store.get(item.pdf_id)
        if raw is None:
            raise HTTPException(404, f"PDF '{item.pdf_id}' not found in memory. Re-upload.")

        src = fitz.open(stream=raw, filetype="pdf")
        page = src.load_page(item.page_num)

        if item.crop:
            c = item.crop
            # Scale crop coords from rendered image → PDF points
            scale_x = page.rect.width  / c.naturalWidth
            scale_y = page.rect.height / c.naturalHeight
            rect = fitz.Rect(
                c.x * scale_x,
                c.y * scale_y,
                (c.x + c.width)  * scale_x,
                (c.y + c.height) * scale_y,
            )
            # Render just the cropped region as a high-res image, insert into new page
            pix = page.get_pixmap(clip=rect, dpi=200)
            img_bytes = pix.tobytes("png")

            # Create a new page matching crop dimensions in PDF points
            new_page = final.new_page(width=rect.width, height=rect.height)
            new_page.insert_image(new_page.rect, stream=img_bytes)
        else:
            final.insert_pdf(src, from_page=item.page_num, to_page=item.page_num)

    out = final.tobytes(garbage=4, deflate=True)
    return Response(
        content=out,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="all in one file.pdf"'},
    )