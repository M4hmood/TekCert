'use client';

import { AVATAR_ACCEPTED_TYPES, AVATAR_MAX_BYTES, AvatarSchema } from '@tekcert/types';
import { Alert, Button, cn, Icon, Dialog, DialogContent, DialogTitle } from '@tekcert/ui';
import { type DragEvent, useEffect, useRef, useState } from 'react';
import Cropper, { type Area, type Point } from 'react-easy-crop';
import { Avatar, initials } from '@/components/Avatar';
import { deleteRequest, putForm, withSessionRefresh } from '@/lib/client-api';
import { StepHeading } from './steps';
import { Switch } from './Switch';

export interface PhotoStepProps {
  firstName: string;
  lastName: string;
  avatarPath: string | null;
  onAvatarChange: (avatarPath: string | null) => void;
  leaderboardVisible: boolean;
  onLeaderboardChange: (visible: boolean) => void;
  /** "Later": continue without a photo. */
  onLater: () => void;
}

/** Checked in the browser for a quick answer; the API checks the real bytes again. */
export function photoProblem(file: Pick<File, 'type' | 'size'>): string | null {
  if (!(AVATAR_ACCEPTED_TYPES as readonly string[]).includes(file.type)) {
    return 'Use a JPG or PNG image.';
  }
  if (file.size > AVATAR_MAX_BYTES) return 'This photo is larger than 5 MB. Choose a smaller one.';
  return null;
}

export function PhotoStep(props: PhotoStepProps) {
  const { firstName, lastName, avatarPath } = props;
  const input = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  // Release the preview URL when the crop dialog closes.
  useEffect(() => () => void (source && URL.revokeObjectURL(source)), [source]);

  const choose = (file: File | undefined) => {
    if (!file) return;
    const problem = photoProblem(file);
    setError(problem);
    if (!problem) setSource(URL.createObjectURL(file));
  };

  const upload = async (blob: Blob) => {
    setSource(null);
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.append('photo', blob, 'photo.jpg');
    const result = await withSessionRefresh(() => putForm('/me/avatar', form, AvatarSchema));
    setBusy(false);
    if (result.ok) props.onAvatarChange(result.data.avatarPath);
    else setError(result.problem.detail ?? 'The photo could not be saved. Try again.');
  };

  const remove = async () => {
    setBusy(true);
    const result = await withSessionRefresh(() => deleteRequest('/me/avatar'));
    setBusy(false);
    if (result.ok) props.onAvatarChange(null);
    else setError('The photo could not be removed. Try again.');
  };

  const drop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    choose(event.dataTransfer.files[0]);
  };

  return (
    <>
      <div className="flex flex-col gap-2.5 max-md:gap-1.5">
        <StepHeading>Add a profile photo</StepHeading>
        <p className="text-ink2 text-[16.5px] max-md:text-[14.5px]">
          Classmates will recognise you more easily when they look for help.
        </p>
      </div>
      <div className="grid grid-cols-[auto_1fr] items-center gap-12 max-md:grid-cols-1 max-md:justify-items-center max-md:gap-6">
        <div
          className={cn(
            'flex flex-col items-center justify-center gap-2.5 size-55 border-2 border-dashed border-ln2 rounded-full bg-sf max-md:size-42',
            dragging && 'border-pri bg-pri-sf',
            avatarPath && 'border-solid border-ln',
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={drop}
          aria-busy={busy}
        >
          {avatarPath ? (
            <Avatar
              firstName={firstName}
              lastName={lastName}
              avatarPath={avatarPath}
              className="size-full text-[64px] max-md:text-[48px]"
            />
          ) : (
            <>
              <span
                className="text-pri font-serif text-[64px] font-medium leading-none max-md:text-[48px]"
                aria-hidden
              >
                {initials(firstName, lastName)}
              </span>
              <span className="text-ink3 text-[13px]">
                {busy ? 'Uploading…' : 'Drag an image here'}
              </span>
            </>
          )}
        </div>

        <div className="flex flex-col gap-4.5 max-md:w-full">
          <div className="flex gap-2.5">
            <Button icon="upload" onClick={() => input.current?.click()} disabled={busy}>
              {avatarPath ? 'Change photo' : 'Upload a photo'}
            </Button>
            {avatarPath ? (
              <Button variant="ghost" onClick={remove} disabled={busy}>
                Remove
              </Button>
            ) : (
              <Button variant="ghost" onClick={props.onLater} disabled={busy}>
                Later
              </Button>
            )}
            <input
              ref={input}
              type="file"
              accept={AVATAR_ACCEPTED_TYPES.join(',')}
              className="hidden"
              aria-label="Profile photo file"
              onChange={(e) => {
                choose(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </div>
          <span className="text-ink3 text-[13.5px]">JPG or PNG, 5 MB max. Square crop.</span>
          {error && <Alert tone="error">{error}</Alert>}

          <div className="flex flex-col mt-2 border-t border-ln">
            <div className="flex items-center justify-between gap-5 py-4 border-b border-ln">
              <span className="flex flex-col gap-0.75">
                <span className="text-[15px] font-semibold">
                  Your profile is visible to students
                </span>
                <span className="text-ink2 text-[13.5px]">
                  Name, class, certifications and institute email.
                </span>
              </span>
              <Icon name="visibility" size={22} className="me-2.75 text-ink3" />
            </div>
            <Switch
              label="Appear on leaderboards"
              description="Class, specialty, year and institute."
              checked={props.leaderboardVisible}
              onChange={props.onLeaderboardChange}
            />
          </div>
        </div>
      </div>

      {source && <CropDialog source={source} onCancel={() => setSource(null)} onConfirm={upload} />}
    </>
  );
}

/** Square crop with zoom; arrow keys move the image when the crop area has focus. */
function CropDialog({
  source,
  onCancel,
  onConfirm,
}: {
  source: string;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);

  const confirm = async () => {
    if (!area) return;
    const blob = await cropToBlob(source, area);
    if (blob) onConfirm(blob);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent
        aria-describedby={undefined}
        className="w-[min(100vw-32px,460px)]"
        // Dragging the photo past the edge of the box mustn't close it.
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogTitle className="mb-4 type-h3">Crop your photo</DialogTitle>
        <div className="relative h-80 overflow-hidden rounded-[10px] bg-sf2">
          <Cropper
            image={source}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, pixels) => setArea(pixels)}
          />
        </div>
        <label className="flex items-center gap-2.5 my-4 text-ink3 [&_input]:flex-1 [&_input]:accent-pri">
          <Icon name="zoom_out" size={20} />
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            aria-label="Zoom"
            onChange={(e) => setZoom(Number(e.target.value))}
          />
          <Icon name="zoom_in" size={20} />
        </label>
        <div className="flex justify-end gap-2.5">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={!area}>
            Use this photo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Up to 1024 px: the API resizes to 512 anyway, and a smaller upload is faster. */
const MAX_CROP_SIZE = 1024;

async function cropToBlob(source: string, area: Area): Promise<Blob | null> {
  const image = new Image();
  image.src = source;
  await image.decode();
  const size = Math.min(Math.round(area.width), MAX_CROP_SIZE);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  canvas
    .getContext('2d')
    ?.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, size, size);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
}
