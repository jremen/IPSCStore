import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from 'flowbite-react';
import { useStageStore } from '../../stores/stageStore';

interface Props {
  stageId: string;
}

export default function StageImageUpload({ stageId }: Props) {
  const uploadImage = useStageStore((s) => s.uploadImage);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      await uploadImage(stageId, acceptedFiles[0]);
    }
  }, [stageId, uploadImage]);

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [], 'image/gif': [] },
    maxSize: 10 * 1024 * 1024,
    noClick: true,
    noKeyboard: true,
  });

  return (
    <div {...getRootProps()}>
      <input {...getInputProps()} />
      <Button size="xs" color="light" onClick={open}>📷 Image</Button>
    </div>
  );
}