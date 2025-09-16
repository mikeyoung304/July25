#!/usr/bin/env ts-node

import { Client } from 'square';
import { supabase } from '../src/utils/supabase';
import { createWriteStream } from 'fs';
import { format } from 'date-fns';
import { join } from 'path';
import { mkdirSync } from 'fs';

interface PaymentRecord {
  provider_payment_id: string;
  local_status: string;
  provider_status: string;
  order_id: string | null;
  amount_cents: number;
  delta: string;
  discrepancy_notes?: string;
}

// Initialize Square client
const squareClient = new Client({
  accessToken: process.env['SQUARE_ACCESS_TOKEN'] || '',
  environment: process.env['SQUARE_ENVIRONMENT'] === 'production' ? 'production' : 'sandbox'
} as any);

const locationId = process.env['SQUARE_LOCATION_ID'] || '';

async function getSquarePayments(startDate: Date, endDate: Date): Promise<Map<string, any>> {
  const payments = new Map<string, any>();
  let cursor: string | undefined;

  try {
    do {
      const response = await squareClient.paymentsApi.listPayments(
        startDate.toISOString(),
        endDate.toISOString(),
        undefined, // sortOrder
        cursor,
        locationId
      );

      if (response.result.payments) {
        for (const payment of response.result.payments) {
          payments.set(payment.id!, payment);
        }
      }

      cursor = response.result.cursor;
    } while (cursor);

    console.log(`Fetched ${payments.size} payments from Square`);
  } catch (error) {
    console.error('Error fetching Square payments:', error);
    throw error;
  }

  return payments;
}

async function getLocalPaymentIntents(startDate: Date, endDate: Date): Promise<any[]> {
  const { data, error } = await supabase
    .from('payment_intents')
    .select('*')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .eq('provider', 'square');

  if (error) {
    console.error('Error fetching local payment intents:', error);
    throw error;
  }

  console.log(`Fetched ${data?.length || 0} payment intents from database`);
  return data || [];
}

async function reconcilePayments(
  squarePayments: Map<string, any>,
  localIntents: any[]
): Promise<PaymentRecord[]> {
  const records: PaymentRecord[] = [];

  // Check each local intent against Square
  for (const intent of localIntents) {
    const squarePayment = squarePayments.get(intent.provider_payment_id);

    let providerStatus = 'NOT_FOUND';
    let delta = 'MISSING_IN_PROVIDER';
    let discrepancyNotes: string | undefined;

    if (squarePayment) {
      // Map Square status to our status
      switch (squarePayment.status) {
        case 'COMPLETED':
          providerStatus = 'succeeded';
          break;
        case 'FAILED':
          providerStatus = 'failed';
          break;
        case 'CANCELED':
          providerStatus = 'canceled';
          break;
        case 'PENDING':
        case 'APPROVED':
          providerStatus = 'pending';
          break;
        default:
          providerStatus = squarePayment.status;
      }

      // Check for discrepancies
      if (intent.status !== providerStatus) {
        delta = 'STATUS_MISMATCH';
        discrepancyNotes = `Local: ${intent.status}, Square: ${providerStatus}`;
      } else if (intent.amount_cents !== Number(squarePayment.amountMoney?.amount)) {
        delta = 'AMOUNT_MISMATCH';
        discrepancyNotes = `Local: ${intent.amount_cents}, Square: ${squarePayment.amountMoney?.amount}`;
      } else {
        delta = 'MATCHED';
      }

      // Remove from map to track unmatched Square payments
      squarePayments.delete(intent.provider_payment_id);
    }

    records.push({
      provider_payment_id: intent.provider_payment_id || 'N/A',
      local_status: intent.status,
      provider_status: providerStatus,
      order_id: intent.used_by_order_id,
      amount_cents: intent.amount_cents,
      delta,
      discrepancy_notes: discrepancyNotes
    });
  }

  // Add any Square payments not in our database
  for (const [paymentId, payment] of squarePayments) {
    let status = 'unknown';
    switch (payment.status) {
      case 'COMPLETED':
        status = 'succeeded';
        break;
      case 'FAILED':
        status = 'failed';
        break;
      case 'CANCELED':
        status = 'canceled';
        break;
      case 'PENDING':
      case 'APPROVED':
        status = 'pending';
        break;
    }

    records.push({
      provider_payment_id: paymentId,
      local_status: 'NOT_FOUND',
      provider_status: status,
      order_id: null,
      amount_cents: Number(payment.amountMoney?.amount) || 0,
      delta: 'MISSING_IN_LOCAL',
      discrepancy_notes: 'Payment exists in Square but not in local database'
    });
  }

  return records;
}

function generateCSV(records: PaymentRecord[]): string {
  const headers = [
    'provider_payment_id',
    'local_status',
    'provider_status',
    'order_id',
    'amount_cents',
    'delta',
    'discrepancy_notes'
  ];

  const rows = records.map(record => [
    record.provider_payment_id,
    record.local_status,
    record.provider_status,
    record.order_id || '',
    record.amount_cents.toString(),
    record.delta,
    record.discrepancy_notes || ''
  ]);

  return [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
}

async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    let startDate: Date;
    let endDate: Date;

    if (args.length >= 2) {
      startDate = new Date(args[0]);
      endDate = new Date(args[1]);
    } else {
      // Default to yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      startDate = yesterday;
      endDate = new Date(yesterday);
      endDate.setHours(23, 59, 59, 999);
    }

    console.log(`\nPayment Reconciliation Report`);
    console.log(`==============================`);
    console.log(`Date Range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    console.log(`Environment: ${process.env['SQUARE_ENVIRONMENT'] || 'sandbox'}`);
    console.log(`Location ID: ${locationId}\n`);

    // Fetch data from both sources
    console.log('Fetching Square payments...');
    const squarePayments = await getSquarePayments(startDate, endDate);

    console.log('Fetching local payment intents...');
    const localIntents = await getLocalPaymentIntents(startDate, endDate);

    // Reconcile
    console.log('Reconciling payments...');
    const records = await reconcilePayments(squarePayments, localIntents);

    // Generate report
    const reportDir = join(process.cwd(), 'docs', 'reports', 'payments');
    mkdirSync(reportDir, { recursive: true });

    const filename = `recon-${format(startDate, 'yyyyMMdd')}.csv`;
    const filepath = join(reportDir, filename);

    const csv = generateCSV(records);
    createWriteStream(filepath).write(csv);

    // Print summary
    console.log(`\nReconciliation Summary`);
    console.log(`----------------------`);
    console.log(`Total Records: ${records.length}`);
    console.log(`Matched: ${records.filter(r => r.delta === 'MATCHED').length}`);
    console.log(`Status Mismatches: ${records.filter(r => r.delta === 'STATUS_MISMATCH').length}`);
    console.log(`Amount Mismatches: ${records.filter(r => r.delta === 'AMOUNT_MISMATCH').length}`);
    console.log(`Missing in Provider: ${records.filter(r => r.delta === 'MISSING_IN_PROVIDER').length}`);
    console.log(`Missing in Local: ${records.filter(r => r.delta === 'MISSING_IN_LOCAL').length}`);
    console.log(`\nReport saved to: ${filepath}`);

    // Print discrepancies
    const discrepancies = records.filter(r => r.delta !== 'MATCHED');
    if (discrepancies.length > 0) {
      console.log(`\n⚠️  Found ${discrepancies.length} discrepancies:`);
      discrepancies.slice(0, 10).forEach(d => {
        console.log(`  - ${d.provider_payment_id}: ${d.delta} ${d.discrepancy_notes || ''}`);
      });
      if (discrepancies.length > 10) {
        console.log(`  ... and ${discrepancies.length - 10} more (see CSV for full details)`);
      }
    } else {
      console.log('\n✅ All payments reconciled successfully!');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Reconciliation failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}