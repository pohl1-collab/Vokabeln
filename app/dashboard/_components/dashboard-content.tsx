'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Upload, GraduationCap, TrendingUp, Calendar, RotateCcw, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FadeIn, SlideIn, Stagger, StaggerItem } from '@/components/ui/animate';
import { SafeDate } from '@/components/safe-format';

interface Stats {
  totalVocabs: number;
  todayVocabs: number;
  totalSessions: number;
  accuracy: number;
  dueForReview: number;
  recentSessions: any[];
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const duration = 800;
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      setDisplay(Math.round(progress * value));
      if (progress >= 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <>{display}</>;
}

const modeLabels: Record<string, string> = {
  flashcard: 'Karteikarten',
  multiplechoice: 'Multiple Choice',
  writing: 'Schreiben',
  spaced: 'Spaced Repetition',
};

export function DashboardContent() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then((data: any) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const s = stats ?? { totalVocabs: 0, todayVocabs: 0, totalSessions: 0, accuracy: 0, dueForReview: 0, recentSessions: [] };

  return (
    <div className="space-y-8">
      <FadeIn>
        <h1 className="font-display text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Dein Lernfortschritt auf einen Blick</p>
      </FadeIn>

      {/* Quick Actions */}
      <SlideIn from="bottom">
        <div className="flex flex-wrap gap-3">
          <Link href="/upload">
            <Button className="gap-2">
              <Upload className="h-4 w-4" />
              Vokabeln hinzufügen
            </Button>
          </Link>
          <Link href="/learn">
            <Button variant="secondary" className="gap-2">
              <GraduationCap className="h-4 w-4" />
              Jetzt lernen
            </Button>
          </Link>
        </div>
      </SlideIn>

      {/* Stat Cards */}
      <Stagger staggerDelay={0.1}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StaggerItem>
            <Card style={{ boxShadow: 'var(--shadow-md)' }}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Vokabeln gesamt</CardTitle>
                <BookOpen className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-display tracking-tight">
                  <AnimatedNumber value={s.totalVocabs} />
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card style={{ boxShadow: 'var(--shadow-md)' }}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Heute hinzugefügt</CardTitle>
                <Calendar className="h-4 w-4 text-secondary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-display tracking-tight">
                  <AnimatedNumber value={s.todayVocabs} />
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card style={{ boxShadow: 'var(--shadow-md)' }}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Trefferquote</CardTitle>
                <Target className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-display tracking-tight">
                  <AnimatedNumber value={s.accuracy} />%
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card style={{ boxShadow: 'var(--shadow-md)' }}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Zur Wiederholung</CardTitle>
                <RotateCcw className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-display tracking-tight">
                  <AnimatedNumber value={s.dueForReview} />
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        </div>
      </Stagger>

      {/* Recent Sessions */}
      <FadeIn>
        <Card style={{ boxShadow: 'var(--shadow-md)' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <TrendingUp className="h-5 w-5 text-primary" />
              Letzte Lernsessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(s.recentSessions?.length ?? 0) === 0 ? (
              <p className="text-muted-foreground text-sm">Noch keine Lernsessions absolviert. Starte jetzt!</p>
            ) : (
              <div className="space-y-3">
                {(s.recentSessions ?? []).map((sess: any) => (
                  <div key={sess?.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{modeLabels[sess?.mode] ?? sess?.mode}</p>
                      <p className="text-xs text-muted-foreground">
                        {sess?.direction === 'de-en' ? 'DE → EN' : 'EN → DE'} · <SafeDate date={sess?.startedAt} options={{ dateStyle: 'medium' }} />
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">
                        {sess?.correctCount ?? 0}/{sess?.totalCards ?? 0}
                      </p>
                      <p className="text-xs text-muted-foreground">richtig</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
