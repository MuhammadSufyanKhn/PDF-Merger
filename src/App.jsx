import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import {
  DndContext, closestCenter, PointerSensor,
  useSensor, useSensors, DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext,
  rectSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

/* ─── Styles ── */
const S = {
  app: { minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Inter', system-ui, sans-serif", color: '#1e293b' },
  landing: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)' },
  landingCard: { background: '#fff', borderRadius: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.08)', padding: '48px 40px', maxWidth: '560px', width: '100%', textAlign: 'center' },
  brandWrap: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '8px' },
  brandIcon: { width: '44px', height: '44px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  brandTitle: { fontSize: '26px', fontWeight: '700', color: '#1e293b', margin: 0 },
  brandSpan: { color: '#4f46e5' },
  landingSubtitle: { color: '#64748b', fontSize: '15px', marginBottom: '32px', margin: '8px 0 32px' },
  dropzone: (active) => ({ border: `2px dashed ${active ? '#4f46e5' : '#c7d2fe'}`, borderRadius: '16px', padding: '48px 24px', cursor: 'pointer', background: active ? '#eef2ff' : '#f8faff', transition: 'all 0.2s', outline: 'none' }),
  uploadIconWrap: { width: '64px', height: '64px', background: '#eef2ff', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' },
  dropTitle: { fontSize: '18px', fontWeight: '600', color: '#1e293b', margin: '0 0 8px' },
  dropSub: { fontSize: '14px', color: '#94a3b8', margin: '0 0 24px' },
  btnPrimary: { display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', border: 'none', padding: '12px 28px', borderRadius: '10px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 14px rgba(79,70,229,0.35)' },
  editor: { display: 'flex', flexDirection: 'column', minHeight: '100vh' },
  topbar: { background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  topLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
  topBrandIcon: { width: '32px', height: '32px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  topBrandName: { fontSize: '16px', fontWeight: '700', color: '#1e293b' },
  divider: { width: '1px', height: '24px', background: '#e2e8f0' },
  pageBadge: { background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '4px 12px', fontSize: '13px', color: '#64748b', fontWeight: '500' },
  hint: { fontSize: '13px', color: '#94a3b8' },
  topRight: { display: 'flex', alignItems: 'center', gap: '10px' },
  btnOutline: { display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fff', color: '#374151', border: '1.5px solid #e2e8f0', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' },
  btnDanger: { display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fff', color: '#ef4444', border: '1.5px solid #fecaca', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer' },
  btnMerge: (disabled) => ({ display: 'inline-flex', alignItems: 'center', gap: '8px', background: disabled ? '#a5b4fc' : 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', border: 'none', padding: '10px 22px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: disabled ? 'not-allowed' : 'pointer', boxShadow: disabled ? 'none' : '0 4px 12px rgba(79,70,229,0.3)' }),
  progressWrap: { height: '3px', background: '#e0e7ff' },
  progressFill: (pct) => ({ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #4f46e5, #7c3aed)', transition: 'width 0.3s' }),
  errorBar: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 24px', background: '#fef2f2', borderBottom: '1px solid #fecaca', color: '#dc2626', fontSize: '14px' },
  gridWrap: { flex: 1, padding: '28px 24px', overflowY: 'auto' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: '16px' },
  card: (selected, dragging) => ({ position: 'relative', background: '#fff', borderRadius: '12px', border: `2px solid ${selected ? '#4f46e5' : '#e2e8f0'}`, boxShadow: selected ? '0 0 0 3px rgba(79,70,229,0.15)' : '0 1px 4px rgba(0,0,0,0.06)', cursor: 'pointer', opacity: dragging ? 0 : 1, overflow: 'hidden', transition: 'all 0.15s', userSelect: 'none' }),
  thumbWrap: { aspectRatio: '3/4', background: '#f8fafc', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  thumbImg: { width: '100%', height: '100%', objectFit: 'contain' },
  cardFooter: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderTop: '1px solid #f1f5f9', background: '#fff' },
  cardNum: { fontSize: '12px', fontWeight: '600', color: '#64748b', fontFamily: 'monospace' },
  editedBadge: { fontSize: '10px', background: '#eef2ff', color: '#4f46e5', padding: '2px 7px', borderRadius: '20px', fontWeight: '600' },
  delBtn: { position: 'absolute', top: '8px', right: '8px', width: '24px', height: '24px', borderRadius: '50%', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', opacity: 0, transition: 'opacity 0.15s', zIndex: 10 },
  editBtn: { position: 'absolute', top: '8px', left: '8px', width: '24px', height: '24px', borderRadius: '50%', background: '#4f46e5', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', opacity: 0, transition: 'opacity 0.15s', zIndex: 10 },
  footer: { background: '#fff', borderTop: '1px solid #e2e8f0', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '20px', fontSize: '12px', color: '#94a3b8' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.72)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backdropFilter: 'blur(4px)' },
  modalBox: { background: '#fff', borderRadius: '20px', boxShadow: '0 25px 80px rgba(0,0,0,0.2)', width: '100%', maxWidth: '860px', maxHeight: '93vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  modalHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #f1f5f9' },
  modalTitle: { fontSize: '17px', fontWeight: '600', color: '#1e293b', margin: 0 },
  modalSub: { fontSize: '13px', color: '#94a3b8', margin: '2px 0 0' },
  modalClose: { width: '32px', height: '32px', borderRadius: '50%', background: '#f1f5f9', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#64748b' },
  modalBody: { flex: 1, overflow: 'auto', display: 'flex', gap: 0 },
  modalFoot: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderTop: '1px solid #f1f5f9', background: '#fff' },
  btnGhost: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#94a3b8', padding: '8px 0' },
  modalActions: { display: 'flex', gap: '10px' },
  btnCancel: { background: '#f1f5f9', color: '#374151', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
  btnApply: { background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 12px rgba(79,70,229,0.3)' },
  toast: { position: 'fixed', bottom: '28px', left: '50%', transform: 'translateX(-50%)', background: '#1e293b', color: '#fff', padding: '12px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: '500', zIndex: 2000, boxShadow: '0 8px 30px rgba(0,0,0,0.2)', whiteSpace: 'nowrap' },
  loadingWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' },
  spinner: { width: '44px', height: '44px', border: '4px solid #e0e7ff', borderTop: '4px solid #4f46e5', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  progressLabel: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b', marginBottom: '6px' },
  progressBar: { width: '240px', height: '6px', background: '#e0e7ff', borderRadius: '99px', overflow: 'hidden' },
  progressBarFill: (pct) => ({ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #4f46e5, #7c3aed)', borderRadius: '99px', transition: 'width 0.3s' }),
};

/* ─── Page Card ── */
function PageCard({ page, index, isSelected, onSelect, onDelete, onEdit }) {
  const [hovered, setHovered] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.id });

  return (
    <div
      ref={setNodeRef}
      style={{ ...S.card(isSelected, isDragging), transform: CSS.Transform.toString(transform), transition }}
      {...attributes} {...listeners}
      onClick={() => onSelect(page)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={S.thumbWrap}>
        <img src={page.editedDataUrl || page.thumbnail} alt="" style={S.thumbImg} draggable={false} />
      </div>
      <div style={S.cardFooter}>
        <span style={S.cardNum}>pg {index + 1}</span>
        {page.edited && <span style={S.editedBadge}>✏ edited</span>}
      </div>
      {/* Edit button */}
      <button
        style={{ ...S.editBtn, opacity: hovered ? 1 : 0 }}
        onClick={e => { e.stopPropagation(); onEdit(page); }}
        title="Edit page"
      >✏</button>
      {/* Delete button */}
      <button
        style={{ ...S.delBtn, opacity: hovered ? 1 : 0 }}
        onClick={e => { e.stopPropagation(); onDelete(page.id); }}
        title="Remove"
      >×</button>
      <div style={{ position: 'absolute', bottom: '36px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: '10px', padding: '3px 8px', borderRadius: '20px', whiteSpace: 'nowrap', opacity: hovered ? 1 : 0, transition: 'opacity 0.15s' }}>click ✏ to edit</div>
    </div>
  );
}

/* ─── Edit Modal ── */
function EditModal({ page, onSave, onClose }) {
  // Tool state
  const [tool, setTool] = useState('crop'); // crop | rotate | text | adjust

  // Crop state
  const [crop, setCrop] = useState(null);
  const [completedCrop, setCompletedCrop] = useState(null);
  const imgRef = useRef(null);

  // Rotation / flip state
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);

  // Text state
  const [texts, setTexts] = useState([]); // [{id, text, x, y, size, color, bold}]
  const [addingText, setAddingText] = useState(false);
  const [newText, setNewText] = useState('');
  const [newTextColor, setNewTextColor] = useState('#FF0000');
  const [newTextSize, setNewTextSize] = useState(24);
  const [newTextBold, setNewTextBold] = useState(false);
  const [draggingTextId, setDraggingTextId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const imageContainerRef = useRef(null);

  // Adjust state
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);

  // Preview canvas
  const canvasRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Which image src to use as base
  const baseSrc = page.thumbnail;

  // Build CSS filter for live preview in non-crop tools
  const cssFilter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
  const cssTransform = `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`;

  // ── Apply edits to canvas and produce final dataURL ──
  const applyToCanvas = () => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // Determine canvas size after rotation
        const rad = (rotation * Math.PI) / 180;
        const sin = Math.abs(Math.sin(rad));
        const cos = Math.abs(Math.cos(rad));
        let cw, ch;

        // If crop is applied, use crop dimensions after rotation
        // For simplicity: apply crop first on original, then rotate
        // Step 1: determine source rect (crop or full)
        let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
        if (completedCrop && imgRef.current) {
          const displayed = imgRef.current;
          const scaleX = img.naturalWidth / displayed.width;
          const scaleY = img.naturalHeight / displayed.height;
          sx = completedCrop.x * scaleX;
          sy = completedCrop.y * scaleY;
          sw = completedCrop.width * scaleX;
          sh = completedCrop.height * scaleY;
        }

        // Step 2: rotated canvas dimensions
        cw = Math.round(sw * cos + sh * sin);
        ch = Math.round(sw * sin + sh * cos);

        const canvas = document.createElement('canvas');
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext('2d');

        // Apply adjustments via filter
        ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

        // Transform for rotation + flip
        ctx.translate(cw / 2, ch / 2);
        ctx.rotate(rad);
        ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
        ctx.drawImage(img, sx, sy, sw, sh, -sw / 2, -sh / 2, sw, sh);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.filter = 'none';

        // Draw text overlays
        texts.forEach(t => {
          // Text positions stored as fractions of original (sw x sh)
          const tx = (t.x / 100) * cw;
          const ty = (t.y / 100) * ch;
          ctx.font = `${t.bold ? 'bold ' : ''}${t.size}px sans-serif`;
          ctx.fillStyle = t.color;
          ctx.strokeStyle = 'rgba(0,0,0,0.4)';
          ctx.lineWidth = 2;
          ctx.strokeText(t.text, tx, ty);
          ctx.fillText(t.text, tx, ty);
        });

        resolve(canvas.toDataURL('image/png'));
      };
      img.src = baseSrc;
    });
  };

  const handleApply = async () => {
    const dataUrl = await applyToCanvas();
    // Build crop data for backend if crop was applied
    let cropData = null;
    if (completedCrop && imgRef.current) {
      const img = imgRef.current;
      const scaleX = img.naturalWidth / img.width;
      const scaleY = img.naturalHeight / img.height;
      cropData = {
        x: completedCrop.x * scaleX,
        y: completedCrop.y * scaleY,
        width: completedCrop.width * scaleX,
        height: completedCrop.height * scaleY,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
      };
    }
    onSave(page.id, {
      crop: cropData,
      rotation,
      flipH,
      flipV,
      brightness,
      contrast,
      saturation,
      texts,
      editedDataUrl: dataUrl,
    });
  };

  const handleReset = () => {
    setCrop(null);
    setCompletedCrop(null);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setTexts([]);
  };

  // ── Text drag handlers ──
  const handleTextMouseDown = (e, id) => {
    e.stopPropagation();
    const container = imageContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const t = texts.find(tx => tx.id === id);
    if (!t) return;
    const curX = (t.x / 100) * rect.width;
    const curY = (t.y / 100) * rect.height;
    setDraggingTextId(id);
    setDragOffset({ x: e.clientX - rect.left - curX, y: e.clientY - rect.top - curY });
  };

  const handleMouseMove = useCallback((e) => {
    if (!draggingTextId) return;
    const container = imageContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const nx = ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100;
    const ny = ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100;
    setTexts(prev => prev.map(t => t.id === draggingTextId ? { ...t, x: Math.max(0, Math.min(100, nx)), y: Math.max(0, Math.min(100, ny)) } : t));
  }, [draggingTextId, dragOffset]);

  const handleMouseUp = useCallback(() => { setDraggingTextId(null); }, []);

  useEffect(() => {
    if (draggingTextId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingTextId, handleMouseMove, handleMouseUp]);

  const addTextOverlay = () => {
    if (!newText.trim()) return;
    setTexts(prev => [...prev, { id: Date.now(), text: newText, x: 50, y: 50, size: newTextSize, color: newTextColor, bold: newTextBold }]);
    setNewText('');
    setAddingText(false);
  };

  // ── Tool sidebar config ──
  const tools = [
    { id: 'crop', icon: '✂', label: 'Crop' },
    { id: 'rotate', icon: '↻', label: 'Rotate' },
    { id: 'text', icon: 'T', label: 'Text' },
    { id: 'adjust', icon: '☀', label: 'Adjust' },
  ];

  const sidebarStyle = {
    width: '220px',
    flexShrink: 0,
    borderRight: '1px solid #f1f5f9',
    background: '#fff',
    display: 'flex',
    flexDirection: 'column',
    padding: '16px 12px',
    gap: '6px',
    overflowY: 'auto',
  };

  const toolBtnStyle = (active) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    borderRadius: '10px',
    border: 'none',
    background: active ? '#eef2ff' : 'transparent',
    color: active ? '#4f46e5' : '#475569',
    fontWeight: active ? '600' : '500',
    fontSize: '14px',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
    transition: 'all 0.15s',
  });

  const previewAreaStyle = {
    flex: 1,
    background: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    overflow: 'auto',
    position: 'relative',
  };

  return (
    <div style={S.modalOverlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.modalBox}>
        {/* Header */}
        <div style={S.modalHead}>
          <div>
            <p style={S.modalTitle}>Edit Page</p>
            <p style={S.modalSub}>{page.filename} · Page {page.page_num + 1}</p>
          </div>
          <button style={S.modalClose} onClick={onClose}>×</button>
        </div>

        {/* Body: sidebar + preview */}
        <div style={S.modalBody}>
          {/* Sidebar */}
          <div style={sidebarStyle}>
            <p style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 4px', marginBottom: '4px' }}>Tools</p>
            {tools.map(t => (
              <button key={t.id} style={toolBtnStyle(tool === t.id)} onClick={() => setTool(t.id)}>
                <span style={{ width: '24px', height: '24px', background: tool === t.id ? '#4f46e5' : '#f1f5f9', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: tool === t.id ? '#fff' : '#64748b', fontWeight: '700', flexShrink: 0 }}>{t.icon}</span>
                {t.label}
              </button>
            ))}

            <div style={{ borderTop: '1px solid #f1f5f9', margin: '8px 0' }} />

            {/* Tool-specific controls */}
            {tool === 'rotate' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', margin: 0 }}>Rotation</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  {[0, 90, 180, 270].map(deg => (
                    <button key={deg} onClick={() => setRotation(deg)} style={{ padding: '8px', borderRadius: '8px', border: `1.5px solid ${rotation === deg ? '#4f46e5' : '#e2e8f0'}`, background: rotation === deg ? '#eef2ff' : '#fff', color: rotation === deg ? '#4f46e5' : '#374151', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>{deg}°</button>
                  ))}
                </div>
                <button onClick={() => setRotation(r => (r + 90) % 360)} style={{ padding: '8px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#374151', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>↻ Rotate 90° CW</button>
                <button onClick={() => setRotation(r => (r - 90 + 360) % 360)} style={{ padding: '8px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#374151', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>↺ Rotate 90° CCW</button>

                <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', margin: '8px 0 0' }}>Flip</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <button onClick={() => setFlipH(f => !f)} style={{ padding: '8px', borderRadius: '8px', border: `1.5px solid ${flipH ? '#4f46e5' : '#e2e8f0'}`, background: flipH ? '#eef2ff' : '#fff', color: flipH ? '#4f46e5' : '#374151', fontSize: '12px', cursor: 'pointer' }}>⇄ Horizontal</button>
                  <button onClick={() => setFlipV(f => !f)} style={{ padding: '8px', borderRadius: '8px', border: `1.5px solid ${flipV ? '#4f46e5' : '#e2e8f0'}`, background: flipV ? '#eef2ff' : '#fff', color: flipV ? '#4f46e5' : '#374151', fontSize: '12px', cursor: 'pointer' }}>⇅ Vertical</button>
                </div>

                <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', margin: '8px 0 0' }}>Custom angle</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="range" min="-180" max="180" value={rotation > 180 ? rotation - 360 : rotation} onChange={e => setRotation((parseInt(e.target.value) + 360) % 360)} style={{ flex: 1 }} />
                  <span style={{ fontSize: '12px', color: '#64748b', minWidth: '36px' }}>{rotation}°</span>
                </div>
              </div>
            )}

            {tool === 'adjust' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {[
                  { label: 'Brightness', value: brightness, set: setBrightness, min: 0, max: 200 },
                  { label: 'Contrast', value: contrast, set: setContrast, min: 0, max: 200 },
                  { label: 'Saturation', value: saturation, set: setSaturation, min: 0, max: 200 },
                ].map(({ label, value, set, min, max }) => (
                  <div key={label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>
                      <span>{label}</span><span>{value}%</span>
                    </div>
                    <input type="range" min={min} max={max} value={value} onChange={e => set(parseInt(e.target.value))} style={{ width: '100%' }} />
                  </div>
                ))}
                <button onClick={() => { setBrightness(100); setContrast(100); setSaturation(100); }} style={{ padding: '7px', borderRadius: '7px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: '12px', cursor: 'pointer' }}>Reset adjustments</button>
              </div>
            )}

            {tool === 'text' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Add text overlays. Drag them to position.</p>
                <input
                  type="text"
                  placeholder="Type text here…"
                  value={newText}
                  onChange={e => setNewText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTextOverlay()}
                  style={{ padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', outline: 'none', width: '100%' }}
                />
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <label style={{ fontSize: '12px', color: '#64748b' }}>Color</label>
                  <input type="color" value={newTextColor} onChange={e => setNewTextColor(e.target.value)} style={{ width: '36px', height: '28px', border: 'none', cursor: 'pointer', borderRadius: '4px' }} />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}><span>Size</span><span>{newTextSize}px</span></div>
                  <input type="range" min="10" max="80" value={newTextSize} onChange={e => setNewTextSize(parseInt(e.target.value))} style={{ width: '100%' }} />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={newTextBold} onChange={e => setNewTextBold(e.target.checked)} />
                  <strong>Bold</strong>
                </label>
                <button onClick={addTextOverlay} disabled={!newText.trim()} style={{ padding: '9px', borderRadius: '8px', background: newText.trim() ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : '#e2e8f0', color: newText.trim() ? '#fff' : '#94a3b8', border: 'none', fontSize: '13px', fontWeight: '600', cursor: newText.trim() ? 'pointer' : 'default' }}>+ Add Text</button>

                {texts.length > 0 && (
                  <>
                    <p style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '4px 0 0' }}>Added texts</p>
                    {texts.map(t => (
                      <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: '12px', color: '#374151', fontWeight: t.bold ? '700' : '400', color: t.color, maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.text}</span>
                        <button onClick={() => setTexts(prev => prev.filter(x => x.id !== t.id))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px', padding: '0 2px' }}>×</button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {tool === 'crop' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Drag on the image to select the crop area.</p>
                {completedCrop && (
                  <div style={{ fontSize: '12px', color: '#4f46e5', background: '#eef2ff', padding: '8px', borderRadius: '8px' }}>
                    ✂ Crop selected:<br />
                    {Math.round(completedCrop.width)} × {Math.round(completedCrop.height)} px
                  </div>
                )}
                <button onClick={() => { setCrop(null); setCompletedCrop(null); }} style={{ padding: '7px', borderRadius: '7px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: '12px', cursor: 'pointer' }}>Clear crop</button>
              </div>
            )}
          </div>

          {/* Preview area */}
          <div style={previewAreaStyle}>
            {tool === 'crop' ? (
              <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)}>
                <img
                  ref={imgRef}
                  src={baseSrc}
                  alt="edit"
                  style={{ maxWidth: '100%', maxHeight: '62vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', filter: cssFilter }}
                  draggable={false}
                />
              </ReactCrop>
            ) : (
              <div
                ref={imageContainerRef}
                style={{ position: 'relative', display: 'inline-block', cursor: draggingTextId ? 'grabbing' : 'default' }}
              >
                <img
                  src={baseSrc}
                  alt="edit"
                  style={{ maxWidth: '100%', maxHeight: '62vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', filter: cssFilter, transform: cssTransform, display: 'block' }}
                  draggable={false}
                />
                {/* Text overlays */}
                {texts.map(t => (
                  <div
                    key={t.id}
                    onMouseDown={e => handleTextMouseDown(e, t.id)}
                    style={{
                      position: 'absolute',
                      left: `${t.x}%`,
                      top: `${t.y}%`,
                      transform: 'translate(-50%, -50%)',
                      fontSize: `${t.size}px`,
                      color: t.color,
                      fontWeight: t.bold ? '700' : '400',
                      cursor: 'grab',
                      userSelect: 'none',
                      textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                      fontFamily: 'sans-serif',
                      whiteSpace: 'nowrap',
                      pointerEvents: tool === 'text' ? 'auto' : 'none',
                    }}
                  >
                    {t.text}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={S.modalFoot}>
          <button style={S.btnGhost} onClick={handleReset}>↺ Reset all edits</button>
          <div style={S.modalActions}>
            <button style={S.btnCancel} onClick={onClose}>Cancel</button>
            <button style={S.btnApply} onClick={handleApply}>✓ Apply Edits</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Upload View ── */
function UploadView({ onDrop, isLoading, progress }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'application/pdf': ['.pdf'] }, multiple: true });
  return (
    <div style={S.landing}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');`}</style>
      <div style={S.landingCard}>
        <div style={S.brandWrap}>
          <div style={S.brandIcon}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          </div>
          <h1 style={S.brandTitle}>PDF <span style={S.brandSpan}>Merger</span></h1>
        </div>
        <p style={S.landingSubtitle}>Upload · Reorder · Edit · Merge into one PDF</p>
        <div {...getRootProps()} style={S.dropzone(isDragActive)}>
          <input {...getInputProps()} />
          {isLoading ? (
            <div style={S.loadingWrap}>
              <div style={S.spinner} />
              <div>
                <div style={S.progressLabel}><span>Extracting pages…</span><span>{Math.round(progress)}%</span></div>
                <div style={S.progressBar}><div style={S.progressBarFill(progress)} /></div>
              </div>
            </div>
          ) : (
            <>
              <div style={S.uploadIconWrap}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/></svg>
              </div>
              <h3 style={S.dropTitle}>{isDragActive ? '📂 Release to upload' : 'Drop multiple PDFs here'}</h3>
              <p style={S.dropSub}>or click to browse files · Multiple PDFs supported</p>
              <button style={S.btnPrimary} type="button">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/></svg>
                Select PDF Files
              </button>
            </>
          )}
        </div>
        <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '20px' }}>All processing happens locally · No files uploaded to any server</p>
      </div>
    </div>
  );
}

/* ─── Main App ── */
export default function App() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [merging, setMerging] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const onDrop = useCallback(async (files) => {
    if (!files.length) return;
    setLoading(true); setProgress(10); setError('');
    const form = new FormData();
    files.forEach(f => form.append('files', f));
    try {
      const res = await axios.post(`${API}/extract`, form, { onUploadProgress: e => setProgress(30 + (e.loaded / e.total) * 50) });
      setPages(prev => { const combined = [...prev, ...res.data.pages]; if (!selected) setSelected(combined[0]?.id); return combined; });
      setProgress(100);
      showToast(`✓ ${res.data.total} pages extracted`);
    } catch (e) { setError(e.response?.data?.detail || 'Failed — is backend running on port 8000?'); }
    setLoading(false); setTimeout(() => setProgress(0), 600);
  }, [selected]);

  const { getRootProps: moreProps, getInputProps: moreInput } = useDropzone({ onDrop, accept: { 'application/pdf': ['.pdf'] }, multiple: true });

  const handleEditSave = (id, editData) => {
    setPages(prev => prev.map(p => p.id === id ? {
      ...p,
      crop: editData.crop || null,
      editedDataUrl: editData.editedDataUrl,
      edited: true,
      _edits: editData,
    } : p));
    setEditTarget(null);
    showToast('✓ Edits applied');
  };

  const handleMerge = async () => {
    if (!pages.length) return;
    setMerging(true); setError('');
    try {
      const res = await axios.post(`${API}/merge`, {
        pages: pages.map(p => ({
          pdf_id: p.pdf_id,
          page_num: p.page_num,
          crop: p.edited ? null : (p.crop || null),
          // If page was edited client-side, send the baked canvas image
          image_data: p.editedDataUrl
            ? p.editedDataUrl.replace(/^data:image\/\w+;base64,/, '')
            : null,
        }))
      }, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = 'merged.pdf';
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      showToast(`✓ ${pages.length} pages merged & downloaded!`);
    } catch (e) { setError('Merge failed — check backend logs'); }
    setMerging(false);
  };

  if (!pages.length) return <UploadView onDrop={onDrop} isLoading={loading} progress={progress} />;

  const activePageObj = pages.find(p => p.id === activeId);

  return (
    <div style={S.editor}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } * { box-sizing: border-box; }`}</style>

      {/* Topbar */}
      <header style={S.topbar}>
        <div style={S.topLeft}>
          <div style={S.topBrandIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          </div>
          <span style={S.topBrandName}>PDF <span style={{ color: '#4f46e5' }}>Merger</span></span>
          <div style={S.divider} />
          <span style={S.pageBadge}>{pages.length} page{pages.length !== 1 ? 's' : ''}</span>
          <span style={S.hint}>Drag to reorder · Hover ✏ to edit</span>
        </div>
        <div style={S.topRight}>
          <div {...moreProps()}>
            <input {...moreInput()} />
            <button style={S.btnOutline} type="button">
              {loading ? <span style={{ ...S.spinner, width: '14px', height: '14px', borderWidth: '2px' }} /> : '+'}
              Add PDFs
            </button>
          </div>
          <button style={S.btnDanger} onClick={() => { setPages([]); setSelected(null); }}>✕ Clear all</button>
          <button style={S.btnMerge(merging || !pages.length)} onClick={handleMerge} disabled={merging || !pages.length}>
            {merging
              ? <><span style={{ ...S.spinner, width: '14px', height: '14px', borderWidth: '2px', borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)', display: 'inline-block' }} /> Merging…</>
              : <><svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/></svg> Merge &amp; Download</>
            }
          </button>
        </div>
      </header>

      {loading && progress > 0 && (
        <div style={S.progressWrap}><div style={S.progressFill(progress)} /></div>
      )}
      {error && (
        <div style={S.errorBar}>
          ⚠ {error}
          <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '16px' }}>×</button>
        </div>
      )}

      {/* Grid */}
      <div style={S.gridWrap}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={({ active }) => setActiveId(active.id)}
          onDragEnd={({ active, over }) => {
            setActiveId(null);
            if (over && active.id !== over.id) {
              setPages(items => {
                const oi = items.findIndex(i => i.id === active.id);
                const ni = items.findIndex(i => i.id === over.id);
                return arrayMove(items, oi, ni);
              });
            }
          }}
        >
          <SortableContext items={pages.map(p => p.id)} strategy={rectSortingStrategy}>
            <div style={S.grid}>
              {pages.map((page, i) => (
                <PageCard
                  key={page.id}
                  page={page}
                  index={i}
                  isSelected={selected === page.id}
                  onSelect={p => setSelected(p.id)}
                  onDelete={id => { setPages(prev => { const n = prev.filter(p => p.id !== id); if (!n.length) setSelected(null); return n; }); }}
                  onEdit={setEditTarget}
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay>
            {activePageObj && (
              <div style={{ width: '155px', background: '#fff', borderRadius: '12px', border: '2px solid #4f46e5', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', overflow: 'hidden', transform: 'rotate(3deg) scale(1.05)' }}>
                <div style={S.thumbWrap}><img src={activePageObj.editedDataUrl || activePageObj.thumbnail} alt="" style={S.thumbImg} /></div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Footer */}
      <footer style={S.footer}>
        <span>📄 {pages.length} pages total</span>
        <span>✏ {pages.filter(p => p.edited).length} edited</span>
        <span style={{ marginLeft: 'auto' }}>Drag thumbnails to reorder · Hover ✏ to edit pages</span>
      </footer>

      {/* Edit Modal */}
      {editTarget && <EditModal page={editTarget} onSave={handleEditSave} onClose={() => setEditTarget(null)} />}

      {/* Toast */}
      {toast && <div style={S.toast}>{toast}</div>}
    </div>
  );
}
