import { useEffect, useState, useCallback, useRef } from 'react';
import { subscribeToTableUpdates, DatabaseTable } from '@/core/supabase';
import { logger } from '@/services/logger';
import type { Table } from '@/modules/floor-plan/types';

/**
 * Real-time table status subscription hook
 *
 * Uses Supabase Realtime for instant table status updates instead of polling.
 * Falls back gracefully if subscription fails.
 *
 * @param restaurantId - The restaurant ID to subscribe to
 * @param onUpdate - Optional callback when a table is updated
 * @returns Object with tables state and update function
 */
export function useTableStatus(
  restaurantId: string | undefined,
  onUpdate?: (updatedTable: DatabaseTable) => void
) {
  const [tables, setTables] = useState<Map<string, DatabaseTable>>(new Map());
  const [isSubscribed, setIsSubscribed] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Handle incoming table updates from Supabase
  const handleTableUpdate = useCallback((payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: DatabaseTable | null;
    old: DatabaseTable | null;
  }) => {
    logger.info('[useTableStatus] Received table update', {
      eventType: payload.eventType,
      tableId: payload.new?.id || payload.old?.id,
      status: payload.new?.status
    });

    if (payload.eventType === 'DELETE' && payload.old) {
      setTables(prev => {
        const next = new Map(prev);
        next.delete(payload.old!.id);
        return next;
      });
    } else if (payload.new) {
      setTables(prev => {
        const next = new Map(prev);
        next.set(payload.new!.id, payload.new!);
        return next;
      });

      // Call optional callback
      if (onUpdate) {
        onUpdate(payload.new);
      }
    }
  }, [onUpdate]);

  // Subscribe to table updates
  useEffect(() => {
    if (!restaurantId) {
      logger.info('[useTableStatus] No restaurant ID, skipping subscription');
      return;
    }

    logger.info('[useTableStatus] Subscribing to table updates', { restaurantId });

    try {
      const unsubscribe = subscribeToTableUpdates(restaurantId, handleTableUpdate);
      unsubscribeRef.current = unsubscribe;
      setIsSubscribed(true);

      logger.info('[useTableStatus] Subscription established');
    } catch (error) {
      logger.error('[useTableStatus] Failed to subscribe', { error });
      setIsSubscribed(false);
    }

    return () => {
      if (unsubscribeRef.current) {
        logger.info('[useTableStatus] Unsubscribing from table updates');
        unsubscribeRef.current();
        unsubscribeRef.current = null;
        setIsSubscribed(false);
      }
    };
  }, [restaurantId, handleTableUpdate]);

  // Update tables from external source (e.g., initial load)
  const updateTablesFromExternal = useCallback((externalTables: Table[]) => {
    setTables(new Map(
      externalTables.map(t => [t.id, {
        id: t.id,
        number: t.label,
        restaurant_id: t.restaurant_id || '',
        seats: t.seats,
        status: t.status,
        current_order_id: t.current_order_id
      }])
    ));
  }, []);

  // Get table by ID
  const getTable = useCallback((tableId: string) => {
    return tables.get(tableId);
  }, [tables]);

  return {
    tables: Array.from(tables.values()),
    tablesMap: tables,
    isSubscribed,
    updateTablesFromExternal,
    getTable
  };
}
