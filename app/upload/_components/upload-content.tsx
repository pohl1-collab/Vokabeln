'use client';
import { useState, useRef, useCallback } from 'react';
import { Camera, Upload, Image as ImageIcon, Loader2, Check, X, Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FadeIn } from '@/components/ui/animate';
import { toast } from 'sonner';

interface VocabItem {
  german: string;
  english: string;
}

export function UploadContent() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [vocabs, setVocabs] = useState<VocabItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((selectedFile: File | null) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setSaved(false);
    setVocabs([]);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string ?? null);
    reader.readAsDataURL(selectedFile);
  }, []);

  const analyzeImage = async () => {
    if (!file) return;
    setAnalyzing(true);
    setVocabs([]);
    setSaved(false);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/vocab/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        toast.error(err?.error ?? 'Analyse fehlgeschlagen');
        setAnalyzing(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        toast.error('Kein Stream verfügbar');
        setAnalyzing(false);
        return;
      }

      const decoder = new TextDecoder();
      let partialRead = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        partialRead += decoder.decode(value, { stream: true });
        const lines = partialRead.split('\n');
        partialRead = lines.pop() ?? '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              if (parsed?.status === 'completed') {
                const result = parsed?.result;
                if (Array.isArray(result) && result.length > 0) {
                  setVocabs(result.map((v: any) => ({
                    german: v?.german ?? v?.deutsch ?? '',
                    english: v?.english ?? v?.englisch ?? '',
                  })).filter((v: VocabItem) => v.german || v.english));
                  toast.success(`${result.length} Vokabeln erkannt!`);
                } else {
                  toast.info('Keine Vokabeln im Bild erkannt.');
                }
              } else if (parsed?.status === 'error') {
                toast.error(parsed?.message ?? 'Fehler bei der Analyse');
              }
            } catch {
              // skip
            }
          }
        }
      }
    } catch (err: any) {
      toast.error('Analyse fehlgeschlagen: ' + (err?.message ?? 'Unbekannter Fehler'));
    } finally {
      setAnalyzing(false);
    }
  };

  const updateVocab = (index: number, field: 'german' | 'english', value: string) => {
    setVocabs((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...(updated[index] ?? { german: '', english: '' }), [field]: value };
      }
      return updated;
    });
  };

  const removeVocab = (index: number) => {
    setVocabs((prev) => prev.filter((_, i) => i !== index));
  };

  const addVocab = () => {
    setVocabs((prev) => [...prev, { german: '', english: '' }]);
  };

  const saveVocabs = async () => {
    const valid = vocabs.filter((v) => v.german.trim() && v.english.trim());
    if (valid.length === 0) {
      toast.error('Keine gültigen Vokabeln zum Speichern');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/vocab/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vocabs: valid }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`${data?.count ?? valid.length} Vokabeln gespeichert!`);
        setSaved(true);
      } else {
        toast.error(data?.error ?? 'Speichern fehlgeschlagen');
      }
    } catch {
      toast.error('Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  const resetAll = () => {
    setFile(null);
    setPreview(null);
    setVocabs([]);
    setSaved(false);
  };

  return (
    <div className="space-y-6">
      <FadeIn>
        <h1 className="font-display text-3xl font-bold tracking-tight">Vokabeln hochladen</h1>
        <p className="text-muted-foreground mt-1">Fotografiere oder lade ein Bild deiner Vokabeln hoch</p>
      </FadeIn>

      {/* Upload Area */}
      <FadeIn delay={0.1}>
        <Card style={{ boxShadow: 'var(--shadow-md)' }}>
          <CardContent className="p-6">
            {!preview ? (
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 p-12">
                <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-sm mb-6 text-center">Lade ein Foto oder Screenshot deiner Vokabeln hoch</p>
                <div className="flex flex-wrap gap-3 justify-center">
                  <Button onClick={() => cameraInputRef.current?.click()} className="gap-2">
                    <Camera className="h-4 w-4" />
                    Kamera
                  </Button>
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
                    <Upload className="h-4 w-4" />
                    Datei wählen
                  </Button>
                </div>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFileSelect(e.target?.files?.[0] ?? null)}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFileSelect(e.target?.files?.[0] ?? null)}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative aspect-video overflow-hidden rounded-xl bg-muted">
                  <img src={preview} alt="Hochgeladenes Bild" className="h-full w-full object-contain" />
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={analyzeImage} disabled={analyzing} className="gap-2">
                    {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    {analyzing ? 'Analysiere...' : 'Bild analysieren'}
                  </Button>
                  <Button variant="outline" onClick={resetAll} className="gap-2">
                    <X className="h-4 w-4" />
                    Anderes Bild
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>

      {/* Extracted Vocabs */}
      {vocabs.length > 0 && (
        <FadeIn>
          <Card style={{ boxShadow: 'var(--shadow-md)' }}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-display">Erkannte Vokabeln ({vocabs.length})</CardTitle>
              <Button variant="outline" size="sm" onClick={addVocab} className="gap-1">
                <Plus className="h-3 w-3" />
                Hinzufügen
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {vocabs.map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder="Deutsch"
                    value={v.german}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateVocab(i, 'german', e.target.value)}
                    className="flex-1"
                  />
                  <span className="text-muted-foreground text-sm">↔</span>
                  <Input
                    placeholder="English"
                    value={v.english}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateVocab(i, 'english', e.target.value)}
                    className="flex-1"
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeVocab(i)} className="text-destructive shrink-0">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-3 pt-4">
                <Button onClick={saveVocabs} disabled={saving || saved} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saved ? 'Gespeichert!' : saving ? 'Speichern...' : 'Alle speichern'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}
    </div>
  );
}
