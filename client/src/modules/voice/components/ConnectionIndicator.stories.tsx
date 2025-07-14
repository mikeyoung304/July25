import type { Meta, StoryObj } from '@storybook/react';
import { ConnectionIndicator } from './ConnectionIndicator';

const meta = {
  title: 'Voice/ConnectionIndicator',
  component: ConnectionIndicator,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ConnectionIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Connected: Story = {
  args: {
    status: 'connected',
  },
};

export const Connecting: Story = {
  args: {
    status: 'connecting',
  },
};

export const Disconnected: Story = {
  args: {
    status: 'disconnected',
  },
};

export const Error: Story = {
  args: {
    status: 'error',
  },
};