import { useState } from 'react';
import { Button, Field, List, Select, TagInput } from '@plexui/react-native';
import { Segments, controlsTableStyle } from '../../ButtonDemos';
import { RNScreen, docsDemo } from '../RNScreen';
import { useNativePlatform } from '../platform';
import { Gap, Groups, groupGap } from './fieldRows';

/** A tag of the field (the docs take @plexui/react-native's values untyped, so the demo spells its own). */
type Tag = { value: string; valid: boolean };

/**
 * On a phone a tag input is the ghost value of a List row under its label (`Field row orientation="vertical"`), as
 * the React page's Phone view puts it: the row is its frame and sets its insets and type.
 */

const MIN_ROWS = ['auto', 'min 2', 'min 3'] as const;
const MIN_ROWS_TO_NUMBER: Record<(typeof MIN_ROWS)[number], number> = { auto: 1, 'min 2': 2, 'min 3': 3 };

/** The Overview: a Tags row, its least height in lines of tags (`rows`). */
export const Overview = docsDemo(function Overview() {
  const [minRows, setMinRows] = useState<(typeof MIN_ROWS)[number]>('auto');
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="minRows" options={MIN_ROWS} value={minRows} onChange={setMinRows} />
      </div>
      <RNScreen grouped>
        <List>
          <Field row orientation="vertical" label="Tags">
            <TagInput variant="ghost" placeholder="Add a tag..." rows={MIN_ROWS_TO_NUMBER[minRows]} />
          </Field>
        </List>
      </RNScreen>
    </>
  );
});

const FIELD_OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'name', label: 'Name' },
  { value: 'role', label: 'Role' },
  { value: 'team', label: 'Team' },
  { value: 'country', label: 'Country' },
];

/** A filter as a group: the field is a pop-up row, its values the tags under the next row's label. */
export const InlineFilterRow = docsDemo(function InlineFilterRow() {
  const [field, setField] = useState('email');
  const [tags, setTags] = useState<Tag[]>([
    { value: 'ada@plexui.com', valid: true },
    { value: 'grace@plexui.com', valid: true },
  ]);
  return (
    <RNScreen grouped>
      <List>
        <Field row label="Where">
          <Select value={field} options={FIELD_OPTIONS} onChange={(option: { value: string }) => setField(option.value)} />
        </Field>
        <Field row orientation="vertical" label="Is in">
          <TagInput variant="ghost" value={tags} onChange={setTags} placeholder="Add a value" />
        </Field>
      </List>
    </RNScreen>
  );
});

const SUGGESTIONS = ['React', 'TypeScript', 'Next.js', 'Tailwind CSS', 'Node.js', 'GraphQL', 'PostgreSQL', 'Redis', 'Docker', 'AWS'];

/** Suggestions are rows, each with its Add button at the end, as iOS lists offer items to add. */
export const Suggestions = docsDemo(function Suggestions() {
  const android = useNativePlatform() === 'android';
  const [tags, setTags] = useState<Tag[]>([
    { value: 'React', valid: true },
    { value: 'TypeScript', valid: true },
  ]);
  const chosen = new Set(tags.map((tag) => tag.value));
  const available = SUGGESTIONS.filter((suggestion) => !chosen.has(suggestion));
  return (
    <RNScreen grouped minHeight={680}>
      <Groups>
        <List>
          <Field row orientation="vertical" label="Skills">
            <TagInput variant="ghost" value={tags} onChange={setTags} placeholder="Add a skill..." />
          </Field>
        </List>
        {available.length > 0 ? (
          <>
            <Gap size={groupGap(android, { header: true })} />
            <List header="Suggestions">
              {available.map((suggestion) => (
                <Field row key={suggestion} label={suggestion}>
                  <Button color="primary" variant="ghost" accessibilityLabel={`Add ${suggestion}`} onPress={() => setTags((current) => [...current, { value: suggestion, valid: true }])}>
                    Add
                  </Button>
                </Field>
              ))}
            </List>
          </>
        ) : null}
      </Groups>
    </RNScreen>
  );
});
