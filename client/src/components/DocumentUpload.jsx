import React, { useRef, useState } from 'react';

export default function DocumentUpload({ onFileSelect, accept = '.pdf,.docx,.pptx,.ppt,.txt', maxSize = 20 }) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const inputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) selectFile(droppedFile);
  };

  const handleClick = () => inputRef.current?.click();

  const handleChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) selectFile(selectedFile);
  };

  const selectFile = (f) => {
    if (f.size > maxSize * 1024 * 1024) {
      alert(`File size exceeds ${maxSize}MB limit`);
      return;
    }
    setFile(f);
    onFileSelect(f);
  };

  const removeFile = () => {
    setFile(null);
    onFileSelect(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (name) => {
    const ext = name.split('.').pop().toLowerCase();
    if (ext === 'pdf') return '📄';
    if (ext === 'docx' || ext === 'doc') return '📝';
    if (ext === 'pptx' || ext === 'ppt') return '📊';
    return '📎';
  };

  return (
    <div>
      <div
        className={`upload-zone ${dragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          style={{ display: 'none' }}
        />
        <div className="upload-zone-icon">
          <svg viewBox="0 0 24 24">
            <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
          </svg>
        </div>
        <div className="upload-zone-text">
          <strong>Click to upload</strong> or drag and drop
        </div>
        <div className="upload-zone-hint">
          PDF, DOCX, PPTX, or TXT (max {maxSize}MB)
        </div>
      </div>

      {file && (
        <div className="upload-file-preview">
          <div className="upload-file-icon">
            <span style={{ fontSize: '18px' }}>{getFileIcon(file.name)}</span>
          </div>
          <div>
            <div className="upload-file-name">{file.name}</div>
            <div className="upload-file-size">{formatSize(file.size)}</div>
          </div>
          <button className="upload-file-remove" onClick={removeFile} title="Remove file">
            <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
