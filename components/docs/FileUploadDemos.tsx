'use client';

import React, { useState } from 'react';
import { FileUpload, FileCard, FileCardGroup } from '@plexui/ui/components/FileUpload';
import { Button } from '@plexui/ui/components/Button';
import { AuthFormStage } from './AuthFormStage';

function createMockFile(name: string, sizeKB: number, type: string): File {
  const bytes = new Uint8Array(sizeKB * 1024);
  return new File([bytes], name, { type });
}

const MOCK_FILES = [
  createMockFile('government-id-scan.pdf', 2100, 'application/pdf'),
  createMockFile('passport-photo.png', 340, 'image/png'),
  createMockFile('non-citizen-travel-2026-approved-document.pdf', 1500, 'application/pdf'),
];

export function FileUploadDemo() {
  const [files, setFiles] = useState<File[]>([]);

  return (
    <div data-demo-stage className="py-10">
      <div className="w-[360px]">
        <FileUpload
          accept=".pdf,.png,.jpg,.jpeg"
          multiple
          maxFiles={5}
          maxSize={10 * 1024 * 1024}
          value={files}
          onValueChange={setFiles}
        />
      </div>
    </div>
  );
}

export function FileUploadWithFilesDemo() {
  const [files, setFiles] = useState<File[]>(MOCK_FILES);

  return (
    <div data-demo-stage className="py-10">
      <div className="w-[360px]">
        <FileUpload
          accept=".pdf,.png"
          multiple
          maxFiles={5}
          value={files}
          onValueChange={setFiles}
        />
      </div>
    </div>
  );
}

export function FileUploadDisabledDemo() {
  return (
    <div data-demo-stage className="py-10">
      <div className="w-[360px]">
        <FileUpload disabled />
      </div>
    </div>
  );
}

export function FileUploadErrorDemo() {
  const [files, setFiles] = useState<File[]>(MOCK_FILES.slice(0, 1));

  return (
    <div data-demo-stage className="py-10">
      <div className="w-[360px]">
        <FileUpload
          accept=".pdf"
          multiple
          value={files}
          onValueChange={setFiles}
          errorMessage="Please upload at least 2 documents."
        />
      </div>
    </div>
  );
}

export function FileCardDemo() {
  return (
    <div data-demo-stage className="py-10">
      <div className="w-[360px]">
        <FileCardGroup>
          <FileCard file={createMockFile('project-brief.pdf', 2400, 'application/pdf')} />
        </FileCardGroup>
      </div>
    </div>
  );
}

export function FileCardWithRemoveDemo() {
  const [file, setFile] = useState<File | null>(
    () => createMockFile('project-brief.pdf', 2400, 'application/pdf'),
  );

  if (!file) return (
    <div data-demo-stage className="py-10">
      <div className="w-[360px] text-center text-sm text-tertiary">File removed</div>
    </div>
  );

  return (
    <div data-demo-stage className="py-10">
      <div className="w-[360px]">
        <FileCardGroup>
          <FileCard file={file} onRemove={() => setFile(null)} />
        </FileCardGroup>
      </div>
    </div>
  );
}

export function FileCardListDemo() {
  const [files, setFiles] = useState<File[]>(MOCK_FILES);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div data-demo-stage className="py-10">
      <div className="w-[360px]">
        <FileCardGroup>
          {files.map((file, index) => (
            <FileCard
              key={`${file.name}-${file.size}`}
              file={file}
              onRemove={() => removeFile(index)}
            />
          ))}
        </FileCardGroup>
      </div>
    </div>
  );
}

export function FileCardReadOnlyListDemo() {
  return (
    <div data-demo-stage className="py-10">
      <div className="w-[360px]">
        <FileCardGroup>
          {MOCK_FILES.map((file) => (
            <FileCard key={`${file.name}-${file.size}`} file={file} />
          ))}
        </FileCardGroup>
      </div>
    </div>
  );
}

export function FileUploadFormDemo() {
  const [files, setFiles] = useState<File[]>(MOCK_FILES);

  return (
    <AuthFormStage title="Upload documents">
      <div className="w-[360px]">
        <div className="mb-6 text-center">
          <h3 className="text-2xl font-semibold tracking-tight">Upload documents</h3>
          <p className="text-secondary text-sm mt-1">Please provide the required files to continue.</p>
        </div>
        <div className="flex flex-col gap-3">
          <FileUpload
            accept=".pdf,.png"
            multiple
            maxFiles={5}
            value={files}
            onValueChange={setFiles}
          />
          <Button color="primary" size="3xl" pill block className="h-[3.25rem] mt-3">
            Continue
          </Button>
        </div>
      </div>
    </AuthFormStage>
  );
}
