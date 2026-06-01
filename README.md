# PDF Merger — Professional Batch PDF Tool

Upload multiple PDFs → Reorder pages → Crop individual pages → Merge into one PDF.

## Stack
- **Backend**: Python FastAPI + PyMuPDF (fitz)
- **Frontend**: React + Tailwind CSS + @dnd-kit + react-image-crop

## Quick Start

### Option A — One command
```bash
./start.sh
```

### Option B — Manual (two terminals)

**Terminal 1 — Backend**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend**
```bash
cd frontend
npm install
npm start
```

Open **http://localhost:3000**

---

## How It Works

### Batch Processing Flow
1. **Upload** — all PDFs sent to `/extract` in one `FormData` POST
2. **Extract** — backend opens each PDF with PyMuPDF, renders every page at 150 DPI → PNG thumbnail → base64
3. **Workspace** — React displays all pages as a sortable grid
4. **Reorder** — drag thumbnails with @dnd-kit (no iterative merging)
5. **Crop** — double-click any page → react-image-crop modal → crop coords saved in state
6. **Merge** — `/merge` receives the ordered page list with optional crop data; assembles final PDF using `insert_pdf` (full pages) or `insert_image` (cropped pages)

### API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/extract` | Upload PDFs, returns page thumbnails |
| POST | `/merge` | Ordered page list → returns merged PDF blob |

### Crop Coordinate Handling
Crop coordinates from the UI (pixels on rendered image) are scaled back to PDF points:
```
scale_x = page_width_pts / image_naturalWidth
scale_y = page_height_pts / image_naturalHeight
pdf_rect = crop_px * scale
```

## Project Structure
```
pdf-merger/
├── backend/
│   ├── main.py          # FastAPI app
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx      # All React components
│   │   └── index.css    # Tailwind + crop overrides
│   ├── tailwind.config.js
│   └── package.json
├── start.sh             # One-command launcher
└── README.md
```
