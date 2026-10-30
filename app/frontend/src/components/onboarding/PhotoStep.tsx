'use client';

import { AVATAR_ACCEPTED_TYPES, AVATAR_MAX_BYTES, AvatarSchema } from '@tekcert/types';
import { Alert, Button, cx, Icon } from '@tekcert/ui';
import { type DragEvent, useEffect, useRef, useState } from 'react';
import Cropper, { type Area, type Point } from 'react-easy-crop';
import { Avatar, initials } from '@/components/Avatar';
import { deleteRequest, putForm, withSessionRefresh } from '@/lib/client-api';
import styles from './onboarding.module.css';
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
      <div className={styles.intro}>
        <StepHeading>Add a profile photo</StepHeading>
        <p className={styles.lead}>
          Classmates will recognise you more easily when they look for help.
        </p>
      </div>
      <div className={styles.photoLayout}>
        <div
          className={cx(styles.dropZone, dragging && styles.dragging, avatarPath && styles.filled)}
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
              className={styles.dropAvatar}
            />
          ) : (
            <>
              <span className={styles.dropInitials} aria-hidden>
                {initials(firstName, lastName)}
              </span>
              <span className={styles.dropHint}>{busy ? 'Uploading…' : 'Drag an image here'}</span>
            </>
          )}
        </div>

        <div className={styles.photoSide}>
          <div className={styles.photoActions}>
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
              className={styles.fileInput}
              aria-label="Profile photo file"
              onChange={(e) => {
                choose(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </div>
          <span className={styles.hint}>JPG or PNG, 5 MB max. Square crop.</span>
          {error && <Alert tone="error">{error}</Alert>}

          <div className={styles.settings}>
            <div className={styles.settingRow}>
              <span className={styles.settingText}>
                <span className={styles.settingLabel}>Your profile is visible to students</span>
                <span className={styles.settingDescription}>
                  Name, class, certifications and institute email.
                </span>
              </span>
              <Icon name="visibility" size={22} className={styles.settingIcon} />
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
  const dialog = useRef<HTMLDialogElement>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);

  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
  }, []);

  const confirm = async () => {
    if (!area) return;
    const blob = await cropToBlob(source, area);
    if (blob) onConfirm(blob);
  };

  return (
    <dialog
      ref={dialog}
      className={styles.cropDialog}
      aria-labelledby="crop-title"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      <h2 id="crop-title" className={styles.cropTitle}>
        Crop your photo
      </h2>
      <div className={styles.cropArea}>
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
      <label className={styles.zoom}>
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
      <div className={styles.cropActions}>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={confirm} disabled={!area}>
          Use this photo
        </Button>
      </div>
    </dialog>
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
