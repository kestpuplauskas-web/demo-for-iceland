import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const ALLOWED = ["image/png", "image/svg+xml"];

export function ImageUploadField({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    if (!ALLOWED.includes(file.type) || file.size > 5 * 1024 * 1024) {
      toast.error(t("settings.imageUpload.invalid"));
      return;
    }
    setBusy(true);
    try {
      const ext = file.type === "image/svg+xml" ? "svg" : "png";
      const path = `branding/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage
        .from("car-images")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      onChange(supabase.storage.from("car-images").getPublicUrl(path).data.publicUrl);
    } catch (e) {
      console.error(e);
      toast.error(t("settings.imageUpload.failed"));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
      <div className="flex h-16 w-40 items-center justify-center overflow-hidden rounded-md border bg-[repeating-conic-gradient(var(--muted)_0%_25%,transparent_0%_50%)] bg-[length:16px_16px]">
        {value ? (
          <img src={value} alt="" className="max-h-14 max-w-[9.5rem] object-contain" />
        ) : (
          <span className="text-xs text-muted-foreground">{t("settings.imageUpload.none")}</span>
        )}
      </div>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/png,image/svg+xml"
        className="hidden"
        disabled={disabled || busy}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
        {busy
          ? t("settings.imageUpload.uploading")
          : value
            ? t("settings.imageUpload.replace")
            : t("settings.imageUpload.upload")}
      </Button>
      {value && (
        <Button type="button" variant="ghost" size="sm" disabled={disabled || busy} onClick={() => onChange("")}>
          <X className="mr-1.5 h-4 w-4" />
          {t("settings.imageUpload.remove")}
        </Button>
      )}
    </div>
  );
}
