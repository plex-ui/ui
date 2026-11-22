import { Button, EmptyMessage } from '@plexui/react-native';
import { FolderOpen, Heart, Search, Warning } from '@plexui/react-native/icons';

export function Overview() {
  return (
    <EmptyMessage>
      <EmptyMessage.Icon>
        <Search />
      </EmptyMessage.Icon>
      <EmptyMessage.Title>No results</EmptyMessage.Title>
      <EmptyMessage.Description>Check the spelling or try a new search.</EmptyMessage.Description>
    </EmptyMessage>
  );
}

export function Actions() {
  return (
    <EmptyMessage>
      <EmptyMessage.Icon>
        <FolderOpen />
      </EmptyMessage.Icon>
      <EmptyMessage.Title>No documents</EmptyMessage.Title>
      <EmptyMessage.Description>Documents you create or import show up here.</EmptyMessage.Description>
      <EmptyMessage.ActionRow>
        <Button>New document</Button>
        <Button variant="ghost">Import</Button>
      </EmptyMessage.ActionRow>
    </EmptyMessage>
  );
}

export function Colors() {
  return (
    <EmptyMessage>
      <EmptyMessage.Icon color="danger">
        <Warning />
      </EmptyMessage.Icon>
      <EmptyMessage.Title color="danger">Couldn&apos;t load messages</EmptyMessage.Title>
      <EmptyMessage.Description>Check your connection and try again.</EmptyMessage.Description>
      <EmptyMessage.ActionRow>
        <Button variant="soft">Try again</Button>
      </EmptyMessage.ActionRow>
    </EmptyMessage>
  );
}

export function Compact() {
  return (
    <EmptyMessage size="sm">
      <EmptyMessage.Icon color="danger">
        <Heart />
      </EmptyMessage.Icon>
      <EmptyMessage.Title>No favorites yet</EmptyMessage.Title>
      <EmptyMessage.Description>Tap the heart on a place to keep it here.</EmptyMessage.Description>
    </EmptyMessage>
  );
}

export function AlignStart() {
  return (
    <EmptyMessage size="sm" align="start">
      <EmptyMessage.Icon>
        <Search />
      </EmptyMessage.Icon>
      <EmptyMessage.Title>No recent searches</EmptyMessage.Title>
      <EmptyMessage.Description>Places you search for show up here.</EmptyMessage.Description>
    </EmptyMessage>
  );
}
