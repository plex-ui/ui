'use client';

import { useState } from 'react';
import { Label } from '@plexui/ui/components/Label';
import { Checkbox } from '@plexui/ui/components/Checkbox';

/* ============================================================
   Overview — shadcn's primary Label demo (Checkbox + Label)
   ============================================================ */

export function LabelOverviewDemo() {
  const [accepted, setAccepted] = useState(true);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Checkbox
        id="label-demo-terms"
        checked={accepted}
        onCheckedChange={setAccepted}
      />
      <Label htmlFor="label-demo-terms">Accept terms and conditions</Label>
    </div>
  );
}
