import type { Meta, StoryObj } from '@storybook/react';
import { HoldToRecordButton } from './HoldToRecordButton';

const meta = {
  title: 'Voice/HoldToRecordButton',
  component: HoldToRecordButton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onMouseDown: { action: 'mousedown' },
    onMouseUp: { action: 'mouseup' },
  },
} satisfies Meta<typeof HoldToRecordButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onMouseDown: () => {},
    onMouseUp: () => {},
    isListening: false,
    isProcessing: false,
    disabled: false,
  },
};

export const Listening: Story = {
  args: {
    onMouseDown: () => {},
    onMouseUp: () => {},
    isListening: true,
    isProcessing: false,
    disabled: false,
  },
};

export const Processing: Story = {
  args: {
    onMouseDown: () => {},
    onMouseUp: () => {},
    isListening: false,
    isProcessing: true,
    disabled: false,
  },
};

export const Disabled: Story = {
  args: {
    onMouseDown: () => {},
    onMouseUp: () => {},
    isListening: false,
    isProcessing: false,
    disabled: true,
  },
};