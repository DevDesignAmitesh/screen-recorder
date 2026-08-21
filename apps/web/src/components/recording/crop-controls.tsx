// Crop-out-the-taskbar sliders, shown once live (before recording starts)
// — see compositor.ts's ScreenCrop for what these actually do.
export function CropControls({
  cropTop,
  onCropTopChange,
  cropBottom,
  onCropBottomChange,
  cropLeft,
  onCropLeftChange,
  cropRight,
  onCropRightChange,
}: {
  cropTop: number;
  onCropTopChange: (value: number) => void;
  cropBottom: number;
  onCropBottomChange: (value: number) => void;
  cropLeft: number;
  onCropLeftChange: (value: number) => void;
  cropRight: number;
  onCropRightChange: (value: number) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-3 rounded-[1.75rem] border border-border bg-card p-4 sm:grid-cols-2">
      <p className="col-span-1 text-sm font-medium sm:col-span-2">
        Crop out a taskbar or tab bar <span className="font-normal text-muted-foreground">(if it&apos;s showing)</span>
      </p>
      <CropSlider label="Top" value={cropTop} onChange={onCropTopChange} />
      <CropSlider label="Bottom" value={cropBottom} onChange={onCropBottomChange} />
      <CropSlider label="Left" value={cropLeft} onChange={onCropLeftChange} />
      <CropSlider label="Right" value={cropRight} onChange={onCropRightChange} />
    </div>
  );
}

function CropSlider({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="flex items-center gap-3 text-sm">
      <span className="w-14 shrink-0 text-muted-foreground">{label}</span>
      <input
        type="range"
        min={0}
        max={0.3}
        step={0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-primary"
      />
      <span className="w-10 shrink-0 text-right font-mono text-xs text-muted-foreground">{Math.round(value * 100)}%</span>
    </label>
  );
}
