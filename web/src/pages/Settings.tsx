import { BellRing } from 'lucide-react';
import { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import Band from '../components/Band';
import { useJourney } from '../JourneyContext';
import { useToast } from '../Toast';
import type { Reminders } from '../types';

const OPTIONS: { value: Reminders; title: string; text: string }[] = [
  { value: 'weekly', title: 'Every week', text: 'A Monday check-in: what is due, how your visions are doing, and a verse.' },
  { value: 'monthly', title: 'Once a month', text: 'A single check-in in the first week of each month.' },
  { value: 'off', title: 'No emails', text: 'You can still see everything in the app.' },
];

export default function Settings() {
  const { session } = useAuth();
  const { me, setReminders } = useJourney();
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  async function choose(value: Reminders) {
    if (!me || value === me.reminders) return;
    const previous = me.reminders;
    setReminders(value);
    setSaving(true);
    try {
      await api.setReminders(value);
      toast({ kind: 'info', title: 'Reminder preference saved' });
    } catch (err) {
      setReminders(previous);
      toast({ kind: 'info', title: 'Could not save', body: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <header className="page-head">
        <h1 className="script-title">My <span>Settings</span></h1>
        <p className="muted">{session?.name} · {session?.email}</p>
      </header>

      <section className="card-plain">
        <Band icon={BellRing} title="Email reminders" hint="How often should we check in?" />
        {me && !me.remindersConfigured && (
          <p className="notice">
            Reminder emails have not been switched on for this church yet, so nothing will be sent. Your choice below is
            saved and will apply once an admin enables them.
          </p>
        )}
        <div className="options" role="radiogroup" aria-label="Reminder frequency">
          {OPTIONS.map((o) => (
            <label key={o.value} className={`option ${me?.reminders === o.value ? 'on' : ''}`}>
              <input type="radio" name="reminders" disabled={!me || saving} checked={me?.reminders === o.value} onChange={() => void choose(o.value)} />
              <span><strong>{o.title}</strong><small>{o.text}</small></span>
            </label>
          ))}
        </div>
      </section>
    </>
  );
}
