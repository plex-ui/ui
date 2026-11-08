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

// Starts with files, so one example shows the button and the list under it
export function FileUploadDemo() {
  const [files, setFiles] = useState<File[]>(MOCK_FILES);
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

// One list of cards: one file is a list of one, and without onRemove the cards are read-only
export function FileCardDemo() {
  const cards = useRef<HTMLDivElement>(null);
  const [removable, setRemovable] = useState(true);
  const [files, setFiles] = useState<File[]>(MOCK_FILES);

  const removeFile = (index: number) => {
    removeFileWithFocus(cards.current, index, () => {
      setFiles((prev) => prev.filter((_, i) => i !== index));
    });
  };

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="onRemove" value={removable} onChange={setRemovable} />
      </div>
      <div data-demo-stage className="py-10">
        <div ref={cards} className="w-[360px]">
          {files.length > 0 && <FileCardGroup>
            {files.map((file, index) => (
              <FileCard
                key={`${file.name}-${file.size}`}
                file={file}
                onRemove={removable ? () => removeFile(index) : undefined}
              />
            ))}
          </FileCardGroup>}
          <div role="status" tabIndex={-1} data-file-removal-status className={files.length > 0 ? 'sr-only' : 'text-center text-sm text-tertiary'}>
            {files.length > 0 ? '' : 'Files removed'}
          </div>
        </div>
      </div>
    </>
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
