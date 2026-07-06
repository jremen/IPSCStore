import { useDropzone } from 'react-dropzone';
import { Button, Spinner } from 'flowbite-react';

interface FileDropzoneProps {
  accept: Record<string, string[]>;
  onFileSelected: (file: File) => void;
  disabled?: boolean;
  icon?: string;
  dropHint: string;
  dragHint: string;
  browseHint: string;
  extraButton?: { label: string; onClick: () => void };
}

export default function FileDropzone({
  accept,
  onFileSelected,
  disabled = false,
  icon,
  dropHint,
  dragHint,
  browseHint,
  extraButton,
}: FileDropzoneProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (file) onFileSelected(file);
    },
    accept,
    multiple: false,
    disabled,
  });

  return (
    <div
      {...getRootProps()}
      className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
        ${isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'}
        ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
    >
      <input {...getInputProps()} />
      {disabled && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-gray-900/60 rounded-lg z-10">
          <div className="flex flex-col items-center gap-2">
            <Spinner size="xl" />
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Importing...
            </p>
          </div>
        </div>
      )}
      {icon != null && <div className="text-4xl mb-3">{icon}</div>}
      <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
        {isDragActive ? dropHint : dragHint}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        {browseHint}
      </p>
      {extraButton && !disabled && (
        <div className="mt-4">
          <Button size="xs" color="light" onClick={(e) => { e.stopPropagation(); extraButton.onClick(); }}>
            {extraButton.label}
          </Button>
        </div>
      )}
    </div>
  );
}
