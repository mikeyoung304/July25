cat > server/tests/services/menu-id-mapper.test.ts <<'EOF'
import { describe, it, expect } from 'vitest';
import {
  getExternalId,
  cleanDescription,
  mapExternalToUuid,
  buildMenuItemPayload
} from '../../../src/services/menu-id-mapper';

describe('menu-id-mapper', () => {
  it('getExternalId returns value or null', () => {
    expect(getExternalId({ external_id: '101' })).toBe('101');
    expect(getExternalId({})).toBeNull();
  });

  it('cleanDescription is now a no-op', () => {
    expect(cleanDescription('abc')).toBe('abc');
    expect(cleanDescription(null)).toBe('');
  });

  it('mapExternalToUuid builds a map', () => {
    const m = mapExternalToUuid([
      { external_id: '101', id: 'uuid-1' },
      { external_id: '201', id: 'uuid-2' }
    ]);
    expect(m.get('101')).toBe('uuid-1');
    expect(m.get('201')).toBe('uuid-2');
  });

  it('buildMenuItemPayload returns correct object', () => {
    const payload = buildMenuItemPayload({
      restaurant_id: '11111111-1111-1111-1111-111111111111',
      external_id: '101',
      name: 'Sweet Tea',
      description: 'Southern-style sweet tea with fresh lemon',
      price: 3
    });
    expect(payload.external_id).toBe('101');
    expect(payload.description).toBe('Southern-style sweet tea with fresh lemon');
  });
});
EOF
