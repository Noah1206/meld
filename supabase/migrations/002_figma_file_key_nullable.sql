-- figma_file_key를 nullable로 변경 (프로젝트 생성 시 Figma URL 없이도 가능)
ALTER TABLE projects ALTER COLUMN figma_file_key DROP NOT NULL;
