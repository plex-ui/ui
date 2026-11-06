'use client';

import React, { useRef, useState } from 'react';
import { FileUpload, FileCard, FileCardGroup } from '@plexui/ui/components/FileUpload';
import { Button } from '@plexui/ui/components/Button';
import { AuthFormStage } from './AuthFormStage';
import { removeFileWithFocus } from './fileRemovalFocus';
import { controlsTableStyle, DemoControlBoolean } from './ButtonDemos';
import { ScreenPresentationControls, useScreenPresentation } from './ScreenPresentationControls';

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
  const [errorMessage, setErrorMessage] = useState(false);
  const [disabled, setDisabled] = useState(false);

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="errorMessage" value={errorMessage} onChange={setErrorMessage} />
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      </div>
      <div data-demo-stage className="py-10">
        <div className="w-[360px]">
          <FileUpload
            accept=".pdf,.png,.jpg,.jpeg"
            multiple
            maxFiles={5}
            maxSize={10 * 1024 * 1024}
            value={files}
            onValueChange={setFiles}
            errorMessage={errorMessage ? 'Please upload at least 2 documents.' : undefined}
            disabled={disabled}
          />
        </div>
      </div>
    </>
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
  const cards = useRef<HTMLDivElement>(null);
  const [file, setFile] = useState<File | null>(
    () => createMockFile('project-brief.pdf', 2400, 'application/pdf'),
  );

  return (
    <div data-demo-stage className="py-10">
      <div ref={cards} className="w-[360px]">
        {file && <FileCardGroup>
          <FileCard file={file} onRemove={() => removeFileWithFocus(cards.current, 0, () => setFile(null))} />
        </FileCardGroup>}
        <div role="status" tabIndex={-1} data-file-removal-status className={file ? 'sr-only' : 'text-center text-sm text-tertiary'}>
          {file ? '' : 'File removed'}
        </div>
      </div>
    </div>
  );
}

export function FileCardListDemo() {
  const cards = useRef<HTMLDivElement>(null);
  const [files, setFiles] = useState<File[]>(MOCK_FILES);

  const removeFile = (index: number) => {
    removeFileWithFocus(cards.current, index, () => {
      setFiles((prev) => prev.filter((_, i) => i !== index));
    });
  };

  return (
    <div data-demo-stage className="py-10">
      <div ref={cards} className="w-[360px]">
        {files.length > 0 && <FileCardGroup>
          {files.map((file, index) => (
            <FileCard
              key={`${file.name}-${file.size}`}
              file={file}
              onRemove={() => removeFile(index)}
            />
          ))}
        </FileCardGroup>}
        <div role="status" tabIndex={-1} data-file-removal-status className={files.length > 0 ? 'sr-only' : 'text-center text-sm text-tertiary'}>
          {files.length > 0 ? '' : 'Files removed'}
        </div>
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
  const presentation = useScreenPresentation();
  const [files, setFiles] = useState<File[]>(MOCK_FILES);

  return (
    <>
    <div data-demo-controls style={controlsTableStyle}><ScreenPresentationControls {...presentation} /></div>
    <AuthFormStage title="Upload documents" surface={presentation.surface} dialog={presentation.dialog} onDialogChange={presentation.setDialog}>
      <div className="w-[360px]">
        <div className="mb-6 text-center">
          <h3 data-auth-title className="text-2xl font-semibold tracking-tight">Upload documents</h3>
          <p data-auth-description className="text-secondary text-sm mt-1">Please provide the required files to continue.</p>
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
    </>
  );
}
