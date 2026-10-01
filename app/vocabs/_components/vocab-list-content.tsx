'use client';
import { useEffect, useState, useCallback } from 'react';
import { List, Plus, Trash2, Edit2, Check, X, Search, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FadeIn, Stagger, StaggerItem } from '@/components/ui/animate';
import { SafeDate } from '@/components/safe-format';
import { toast } from 'sonner';

interface Vocab {
  id: string;
  germanWord: string;
  englishWord: string;
  dateAdded: string;
}

export function VocabListContent() {
  const [vocabs, setVocabs] = useState<Vocab[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editGerman, setEditGerman] = useState('');
  const [editEnglish, setEditEnglish] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newGerman, setNewGerman] = useState('');
  const [newEnglish, setNewEnglish] = useState('');

  const fetchVocabs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (fromDate) params.set('from', fromDate);
    if (toDate) params.set('to', toDate);
    try {
      const res = await fetch(`/api/vocab?${params.toString()}`);
      const data = await res.json();
      if (Array.isArray(data)) setVocabs(data);
    } catch {
      toast.error('Laden fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => { fetchVocabs(); }, [fetchVocabs]);

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/vocab?id=${id}`, { method: 'DELETE' });
      setVocabs((prev) => prev.filter((v) => v.id !== id));
      toast.success('Vokabel gelöscht');
    } catch {
      toast.error('Löschen fehlgeschlagen');
    }
  };

  const startEdit = (v: Vocab) => {
    setEditingId(v.id);
    setEditGerman(v.germanWord);
    setEditEnglish(v.englishWord);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      await fetch('/api/vocab', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, german: editGerman, english: editEnglish }),
      });
      setVocabs((prev) =>
        prev.map((v) => (v.id === editingId ? { ...v, germanWord: editGerman, englishWord: editEnglish } : v))
      );
      setEditingId(null);
      toast.success('Aktualisiert');
    } catch {
      toast.error('Aktualisierung fehlgeschlagen');
    }
  };

  const addVocab = async () => {
    if (!newGerman.trim() || !newEnglish.trim()) {
      toast.error('Beide Felder ausfüllen');
      return;
    }
    try {
      const res = await fetch('/api/vocab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ german: newGerman, english: newEnglish }),
      });
      const data = await res.json();
      if (res.ok) {
        setVocabs((prev) => [data, ...prev]);
        setNewGerman('');
        setNewEnglish('');
        setShowAdd(false);
        toast.success('Vokabel hinzugefügt');
      }
    } catch {
      toast.error('Hinzufügen fehlgeschlagen');
    }
  };

  const filtered = vocabs.filter((v) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return v.germanWord.toLowerCase().includes(s) || v.englishWord.toLowerCase().includes(s);
  });

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Vokabelliste</h1>
            <p className="text-muted-foreground mt-1">{vocabs.length} Vokabeln insgesamt</p>
          </div>
          <Button onClick={() => setShowAdd(!showAdd)} className="gap-2">
            <Plus className="h-4 w-4" />
            Neue Vokabel
          </Button>
        </div>
      </FadeIn>

      {/* Add Form */}
      {showAdd && (
        <FadeIn>
          <Card style={{ boxShadow: 'var(--shadow-md)' }}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Input placeholder="Deutsch" value={newGerman} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewGerman(e.target.value)} className="flex-1" />
                <span className="text-muted-foreground">↔</span>
                <Input placeholder="English" value={newEnglish} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEnglish(e.target.value)} className="flex-1" />
                <Button size="icon" onClick={addVocab}><Check className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => setShowAdd(false)}><X className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* Filters */}
      <FadeIn delay={0.1}>
        <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Suchen..."
                  value={search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input type="date" value={fromDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFromDate(e.target.value)} className="w-40" />
                <span className="text-muted-foreground text-sm">bis</span>
                <Input type="date" value={toDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setToDate(e.target.value)} className="w-40" />
              </div>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {/* Vocab List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card style={{ boxShadow: 'var(--shadow-sm)' }}>
          <CardContent className="p-8 text-center">
            <List className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Keine Vokabeln gefunden</p>
          </CardContent>
        </Card>
      ) : (
        <Stagger staggerDelay={0.03}>
          <div className="space-y-2">
            {filtered.map((v) => (
              <StaggerItem key={v.id}>
                <div className="flex items-center gap-3 rounded-lg bg-card px-4 py-3 transition-shadow hover:shadow-md" style={{ boxShadow: 'var(--shadow-sm)' }}>
                  {editingId === v.id ? (
                    <>
                      <Input value={editGerman} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditGerman(e.target.value)} className="flex-1" />
                      <span className="text-muted-foreground">↔</span>
                      <Input value={editEnglish} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditEnglish(e.target.value)} className="flex-1" />
                      <Button size="icon" variant="ghost" onClick={saveEdit}><Check className="h-4 w-4 text-green-500" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{v.germanWord}</p>
                      </div>
                      <span className="text-muted-foreground text-sm shrink-0">↔</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-muted-foreground truncate">{v.englishWord}</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                        <SafeDate date={v.dateAdded} options={{ dateStyle: 'short' }} />
                      </span>
                      <Button size="icon" variant="ghost" onClick={() => startEdit(v)} className="shrink-0">
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(v.id)} className="text-destructive shrink-0">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </StaggerItem>
            ))}
          </div>
        </Stagger>
      )}
    </div>
  );
}
