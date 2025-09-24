-- Create chart_images table for storing SVG chart images
CREATE TABLE chart_images (
  id VARCHAR(255) PRIMARY KEY,
  segment_id VARCHAR(255) NOT NULL REFERENCES analysis_results(id) ON DELETE CASCADE,
  svg_content TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  format VARCHAR(10) NOT NULL DEFAULT 'svg',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create index on segment_id for faster lookups
CREATE INDEX idx_chart_images_segment_id ON chart_images(segment_id);
