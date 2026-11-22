import { Avatar, Button, Skeleton, Text } from '@plexui/react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

export function Overview() {
  return (
    <View accessibilityState={{ busy: true }} accessibilityLabel="Loading" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Skeleton circle height={44} />
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton height={14} width="60%" />
        <Skeleton height={14} />
        <Skeleton height={14} width="80%" />
      </View>
    </View>
  );
}

export function Shapes() {
  return (
    <View accessibilityState={{ busy: true }} accessibilityLabel="Loading" style={{ gap: 12 }}>
      <Skeleton height={160} />
      <Skeleton height={20} width="70%" />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Skeleton circle height={32} />
        <Skeleton circle height={44} />
        <Skeleton circle height={56} />
        <Skeleton height={56} width={56} />
      </View>
    </View>
  );
}

export function Loading() {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, [loading]);
  return (
    <View style={{ gap: 16 }}>
      {loading ? (
        <View accessibilityState={{ busy: true }} accessibilityLabel="Loading profile" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Skeleton circle height={44} />
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton height={17} width="50%" />
            <Skeleton height={15} width="80%" />
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar name="Ada Lovelace" color="info" size={44} />
          <View style={{ flex: 1 }}>
            <Text variant="headline">Ada Lovelace</Text>
            <Text variant="subheadline" color="secondary">
              Wrote the first program
            </Text>
          </View>
        </View>
      )}
      <Button size="sm" variant="soft" disabled={loading} onPress={() => setLoading(true)} style={{ alignSelf: 'center' }}>
        Reload
      </Button>
    </View>
  );
}
