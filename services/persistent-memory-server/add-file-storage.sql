-- File Storage for Memory V5
-- Tracks uploaded files (images, audio, video) with metadata

CREATE TYPE file_type AS ENUM (
    'image',
    'audio',
    'video',
    'document'
);

CREATE TABLE files (
    file_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- File metadata
    file_type file_type NOT NULL,
    mime_type TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_size BIGINT NOT NULL,  -- bytes

    -- Storage
    storage_path TEXT NOT NULL UNIQUE,  -- Relative path from storage root

    -- Image-specific
    width INTEGER,
    height INTEGER,

    -- Timestamps
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accessed_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMPTZ,

    -- Who uploaded
    uploaded_by TEXT,  -- 'steve', 'aurora', etc.

    -- Optional memory association
    memory_id UUID REFERENCES memories(memory_id) ON DELETE SET NULL
);

CREATE INDEX idx_files_type ON files(file_type);
CREATE INDEX idx_files_uploaded ON files(uploaded_at DESC);
CREATE INDEX idx_files_memory ON files(memory_id);
CREATE INDEX idx_files_accessed ON files(accessed_count DESC);

COMMENT ON TABLE files IS 'File storage metadata for uploaded images, audio, video';
COMMENT ON COLUMN files.storage_path IS 'Relative path from STORAGE_ROOT directory';
