'use client';

import { useState, type ComponentProps } from 'react';
import { VueDemo } from './VueDemo';
import { AuthFormStage } from '../AuthFormStage';

// MDX cannot pass File objects to a client component, so the files the
// templates read (`files`, `file`) are created here: the same mock files as
// the React demos in FileUploadDemos.tsx. Like those demos, every preview sits
// in a `py-10` demo stage (VueDemo only renders a stage when it has controls).

function createMockFile(name: string, sizeKB: number, type: string): File {
  const bytes = new Uint8Array(sizeKB * 1024);
  return new File([bytes], name, { type });
}

const createMockFiles = () => [
  createMockFile('government-id-scan.pdf', 2100, 'application/pdf'),
  createMockFile('passport-photo.png', 340, 'image/png'),
  createMockFile('non-citizen-travel-2026-approved-document.pdf', 1500, 'application/pdf'),
];

type VueFileUploadDemoProps = Omit<ComponentProps<typeof VueDemo>, 'stageClassName'> & {
  /** Initial `files`: none, the three mock files, or only the first one. @default "none" */
  files?: 'none' | 'all' | 'first';
  /** Full form screen, leaving isolated upload examples unchanged. */
  auth?: boolean;
};

/** A VueDemo whose template can read `files` (File[]) and `file` (one File). */
export function VueFileUploadDemo({ files = 'none', auth = false, state, ...props }: VueFileUploadDemoProps) {
  const [scope] = useState(() => {
    const mockFiles = createMockFiles();
    return {
      files: files === 'all' ? mockFiles : files === 'first' ? mockFiles.slice(0, 1) : [],
      file: createMockFile('project-brief.pdf', 2400, 'application/pdf'),
    };
  });

  const preview = <VueDemo {...props} state={{ ...scope, ...state }} />;
  return auth ? (
    <AuthFormStage title="Upload documents">{preview}</AuthFormStage>
  ) : (
    <div data-demo-stage className="py-10">{preview}</div>
  );
}
